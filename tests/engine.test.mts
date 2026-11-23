/**
 * Commission engine tests. Runs against a throwaway database:
 *   TEST_DATABASE_URL=postgres://esn:esn@localhost:5432/esn_test npm test
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgres://esn:esn@localhost:5432/esn_test";

const { pool, tx, one, q } = await import("../src/lib/db");
const { activate, closeDay, todayIn } = await import("../src/lib/engine");
const { seedDefaults } = await import("../src/lib/seed");
const { saveSetting } = await import("../src/lib/settings");
const { requestWithdrawal, processWithdrawal } = await import("../src/lib/ops");

async function reset() {
  await pool().query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await pool().query(readFileSync(join(import.meta.dirname, "..", "db", "schema.sql"), "utf8"));
  await tx((c) => seedDefaults(c, { adminPhone: "03000000000", adminPassword: "x", withCompanyRoot: true }));
}

let seq = 0;
/** Register + activate a member with a sponsor and leg, like the real flow. */
async function join_(sponsorCode: string | null, leg: "L" | "R") {
  const sp = sponsorCode ? await one("SELECT id FROM users WHERE code = $1", [sponsorCode]) : null;
  const code = `T${++seq}`;
  const u = await one(
    `INSERT INTO users (code, name, phone, password_hash, sponsor_id, preferred_leg, plan_id)
     VALUES ($1,$1,$1,'x',$2,$3,(SELECT id FROM plans WHERE code='networker')) RETURNING id`,
    [code, sp?.id ?? null, leg],
  );
  await tx((c) => activate(c, { userId: u!.id, method: "admin", actorId: 1 }));
  return code;
}
const user = (code: string) => one("SELECT * FROM users WHERE code = $1", [code]);
const ROOT = "ESN10001";

before(async () => {
  await pool().query("SELECT 1");
});
after(async () => {
  await pool().end();
});

test("100-member level-order tree matches the reference: 49 direct + 170 indirect pairs = Rs. 53,600", async () => {
  await reset();
  await q("UPDATE plans SET daily_cap_pairs = 0, daily_cap_amount = 0");
  // node k (1-based, root = 1) sits under k/2; even = Left, odd = Right; sponsor = parent
  const codes: string[] = [ROOT];
  for (let k = 2; k <= 100; k++) {
    const parent = codes[Math.floor(k / 2) - 1];
    codes.push(await join_(parent, k % 2 === 0 ? "L" : "R"));
  }
  const r = await q<{ kind: string; n: number; amt: number }>(
    "SELECT kind, count(*)::int AS n, sum(amount) AS amt FROM pairs GROUP BY kind ORDER BY kind",
  );
  const direct = r.find((x) => x.kind === "direct")!;
  const indirect = r.find((x) => x.kind === "indirect")!;
  assert.equal(direct.n, 49);
  assert.equal(indirect.n, 170);
  assert.equal(direct.amt + indirect.amt, 53600);
  // every placement is the sponsor's direct slot: tree has 100 nodes, max depth 6 (7 levels)
  const d = await one("SELECT max(depth) AS d, count(*)::int AS n FROM users WHERE status='active' AND role='member'");
  assert.equal(d!.n, 100);
  assert.equal(d!.d, 6);
});

test("first pair is locked until BOTH legs have the user's own direct referrals (upline spillover does not unlock)", async () => {
  await reset();
  const X = await join_(ROOT, "L");
  await join_(ROOT, "R");
  // root sponsors a 3rd member on Left -> spills over under X's Left (sponsor stays root)
  const Z = await join_(ROOT, "L");
  assert.equal((await user(Z))!.parent_id, (await user(X))!.id);
  // X sponsors W on Right -> X has 1 Left (spillover) + 1 Right (own) but no own Left
  await join_(X, "R");
  let x = await user(X);
  assert.equal(x!.left_carry, 1);
  assert.equal(x!.right_carry, 1);
  assert.equal(x!.first_pair_done, false);
  assert.equal(Number(x!.earning_balance), 0);
  // X sponsors V on Left -> spills to bottom of X's left leg; now direct pair unlocks
  await join_(X, "L");
  x = await user(X);
  assert.equal(x!.first_pair_done, true);
  assert.equal(Number(x!.earning_balance), 400);
  assert.equal(x!.left_carry, 1); // power-leg carry forward
  assert.equal(x!.right_carry, 0);
});

test("extreme spillover places extra directs at the outer edge of the chosen leg", async () => {
  await reset();
  const a = await join_(ROOT, "L");
  const b = await join_(ROOT, "L");
  const c = await join_(ROOT, "L");
  assert.equal((await user(b))!.parent_id, (await user(a))!.id);
  assert.equal((await user(c))!.parent_id, (await user(b))!.id);
  assert.equal((await user(c))!.position, "L");
});

test("balanced spillover fills the leg level by level", async () => {
  await reset();
  await saveSetting("spillover_mode", "balanced");
  const a = await join_(ROOT, "L");
  const b = await join_(ROOT, "L"); // a.L
  const c = await join_(ROOT, "L"); // a.R
  const d = await join_(ROOT, "L"); // b.L
  assert.equal((await user(b))!.parent_id, (await user(a))!.id);
  assert.equal((await user(c))!.parent_id, (await user(a))!.id);
  assert.equal((await user(c))!.position, "R");
  assert.equal((await user(d))!.parent_id, (await user(b))!.id);
});

test("midnight closing pays 20 pairs (Rs. 4,000) and flushes the rest; rank 1 reached at 25 fresh pairs", async () => {
  await reset();
  // root gets 1 direct pair + 35 indirect pairs today
  for (let i = 0; i < 36; i++) {
    await join_(ROOT, "L");
    await join_(ROOT, "R");
  }
  const root = await user(ROOT);
  assert.equal(Number(root!.earning_balance), 400); // direct pair paid instantly
  const pend = await one("SELECT count(*)::int AS n FROM pairs WHERE user_id = $1 AND status = 'pending'", [root!.id]);
  assert.equal(pend!.n, 35);

  const day = await todayIn(pool(), "Asia/Karachi");
  const res = await tx((c) => closeDay(c, day));
  assert.equal(res!.pairsPaid, 20);
  assert.equal(res!.pairsFlushed, 15);
  const after1 = await user(ROOT);
  assert.equal(Number(after1!.earning_balance), 4400);
  const flush = await one("SELECT sum(amount) AS s FROM company_ledger WHERE kind = 'flush'");
  assert.equal(flush!.s, 3000);
  // ranks count matched pairs (36) -> rank 1 (25)
  assert.equal(after1!.rank_level, 1);
  const ach = await one("SELECT * FROM rank_achievements WHERE user_id = $1", [root!.id]);
  assert.equal(ach!.reward_item, "Power Bank");
  // closing twice does nothing
  assert.equal(await tx((c) => closeDay(c, day)), null);
});

test("instant credit mode applies the cap live", async () => {
  await reset();
  await saveSetting("pair_credit_mode", "instant");
  await q("UPDATE plans SET daily_cap_pairs = 3, daily_cap_amount = 0");
  for (let i = 0; i < 6; i++) {
    await join_(ROOT, "L");
    await join_(ROOT, "R");
  }
  const root = await user(ROOT);
  // 1 direct (400) + 3 paid indirect (600); 2 flushed
  assert.equal(Number(root!.earning_balance), 1000);
  const f = await one("SELECT count(*)::int AS n FROM pairs WHERE status='flushed'");
  assert.equal(f!.n, 2);
});

test("withdrawal: 5% fee, min 500, balance locked on request, refunded on reject", async () => {
  await reset();
  const a = await join_(ROOT, "L");
  await join_(a, "L");
  await join_(a, "R");
  const u = await user(a);
  assert.equal(Number(u!.earning_balance), 400);
  await q("UPDATE users SET earning_balance = 1000 WHERE id = $1", [u!.id]);
  await assert.rejects(
    tx((c) => requestWithdrawal(c, u!.id, { amount: 400, method: "JazzCash", title: "A", account: "03001234567" })),
    /Minimum/,
  );
  const w = await tx((c) =>
    requestWithdrawal(c, u!.id, { amount: 1000, method: "JazzCash", title: "A", account: "03001234567" }),
  );
  assert.equal(w.fee, 50);
  assert.equal(w.net, 950);
  assert.equal(Number((await user(a))!.earning_balance), 0);
  await tx((c) => processWithdrawal(c, w.id, "rejected", "test", 1));
  assert.equal(Number((await user(a))!.earning_balance), 1000);
});
