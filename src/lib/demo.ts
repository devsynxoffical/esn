/**
 * Demo / test data generator and member-data reset.
 * Creates a realistic network spread over the last 14 days so every screen has data.
 */
import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import { q, one, tx, pool, fail } from "./db";
import { activate, runDueClosings, nextMemberCode, todayIn, audit } from "./engine";
import { getSettings } from "./settings";
import { hashPassword } from "./password";
import { generatePins, requestWithdrawal, processWithdrawal, chooseReward } from "./ops";
import { seedDefaults } from "./seed";

export const DEMO_PASSWORD = "Demo@1234";
export const DEMO_EMAIL_DOMAIN = "demo.esn.local";

const FIRST = [
  "Ali", "Ahmed", "Usman", "Bilal", "Hamza", "Hassan", "Zain", "Fahad", "Imran", "Kashif", "Saad", "Waqas", "Asad", "Danish",
  "Faisal", "Junaid", "Talha", "Umair", "Ayesha", "Fatima", "Sana", "Hira", "Zara", "Maryam", "Iqra", "Amna", "Nimra", "Mahnoor",
  "Rabia", "Sadia", "Noor", "Kiran", "Areeba", "Laiba",
];
const LAST = ["Khan", "Raza", "Ahmed", "Malik", "Butt", "Sheikh", "Qureshi", "Chaudhry", "Hussain", "Iqbal", "Siddiqui", "Abbasi", "Mirza", "Javed", "Aslam", "Akhtar"];
const CITIES = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Sialkot", "Gujranwala", "Hyderabad"];
const pick = <T,>(a: T[]) => a[randomInt(a.length)];

async function maxIds(c: PoolClient) {
  return one<Record<string, number>>(
    `SELECT (SELECT coalesce(max(id),0) FROM transactions) AS tx, (SELECT coalesce(max(id),0) FROM pairs) AS pr,
            (SELECT coalesce(max(id),0) FROM orders) AS od, (SELECT coalesce(max(id),0) FROM invoices) AS iv,
            (SELECT coalesce(max(id),0) FROM activations) AS ac, (SELECT coalesce(max(id),0) FROM company_ledger) AS cl,
            (SELECT coalesce(max(id),0) FROM rank_achievements) AS ra`,
    [],
    c,
  );
}

/** Move every row created after `before` to the simulated date `day` (YYYY-MM-DD) at time `ts`. */
async function backdate(c: PoolClient, before: Record<string, number>, day: string, ts: string, userId: number) {
  await q("UPDATE transactions SET created_at = $2 WHERE id > $1", [before.tx, ts], c);
  await q("UPDATE pairs SET created_at = $2, day = $3 WHERE id > $1", [before.pr, ts, day], c);
  await q("UPDATE orders SET created_at = $2, updated_at = $2 WHERE id > $1", [before.od, ts], c);
  await q("UPDATE invoices SET created_at = $2 WHERE id > $1", [before.iv, ts], c);
  await q("UPDATE activations SET created_at = $2, day = $3 WHERE id > $1", [before.ac, ts, day], c);
  await q("UPDATE company_ledger SET created_at = $2 WHERE id > $1", [before.cl, ts], c);
  await q("UPDATE rank_achievements SET created_at = $2, updated_at = $2 WHERE id > $1", [before.ra, ts], c);
  await q("UPDATE users SET activated_at = $2, created_at = LEAST(created_at, $2) WHERE id = $1", [userId, ts]);
}

export async function generateDemo(actorId: number, count: number) {
  if (count < 5 || count > 200) fail("Choose between 5 and 200 demo members.");
  const s = await getSettings();
  const root = await one("SELECT id, code FROM users WHERE parent_id IS NULL AND role = 'member' AND status = 'active' ORDER BY id LIMIT 1");
  if (!root) fail("No company top ID found.");
  const plans = await q("SELECT id FROM plans WHERE active ORDER BY sort, id");
  const products = await q("SELECT id FROM products WHERE is_package AND active ORDER BY sort, id");
  const today = await todayIn(pool(), s.closing_timezone);
  const pw = hashPassword(DEMO_PASSWORD);
  const base = (await one<{ n: number }>("SELECT count(*)::int AS n FROM users WHERE email LIKE $1", [`%@${DEMO_EMAIL_DOMAIN}`]))!.n;

  // joins per day grow towards today
  const days = 14;
  const weights = Array.from({ length: days }, (_, i) => 1 + i * 0.35);
  const wsum = weights.reduce((a, b) => a + b, 0);
  const perDay = weights.map((w) => Math.max(1, Math.round((w / wsum) * count)));

  const active: number[] = [root!.id];
  let made = 0;
  for (let d = 0; d < days && made < count; d++) {
    const dayDate = new Date(`${today}T00:00:00Z`);
    dayDate.setUTCDate(dayDate.getUTCDate() - (days - d));
    const day = dayDate.toISOString().slice(0, 10);
    for (let k = 0; k < perDay[d] && made < count; k++) {
      made++;
      const idx = base + made;
      // sponsor: favour members who already have a team, sometimes the root
      const sponsorId = randomInt(10) < 2 ? root!.id : active[Math.max(0, active.length - 1 - randomInt(Math.min(active.length, 12)))];
      const leg = randomInt(2) ? "L" : "R";
      const name = `${pick(FIRST)} ${pick(LAST)}`;
      const phone = `0311${String(4000000 + idx).padStart(7, "0")}`;
      const cnicMid = String(1000000 + idx).padStart(7, "0");
      const city = pick(CITIES);
      const planId = randomInt(10) < 8 ? plans[0].id : pick(plans).id;
      const inactive = made > 6 && randomInt(100) < 12;
      const hh = String(9 + randomInt(12)).padStart(2, "0");
      const mm = String(randomInt(60)).padStart(2, "0");
      const ts = `${day}T${hh}:${mm}:00+05:00`;

      const userId = await tx(async (c) => {
        const code = await nextMemberCode(c);
        const u = await one(
          `INSERT INTO users (code, name, phone, email, cnic, city, address, password_hash, sponsor_id, preferred_leg, plan_id, product_id,
             payout_method, payout_title, payout_account, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$2,$14,$15) RETURNING id`,
          [
            code, name, phone, `demo${idx}@${DEMO_EMAIL_DOMAIN}`, `35202-${cnicMid}-${idx % 10}`, city, `House ${10 + idx}, Block ${pick(["A", "B", "C", "D"])}, ${city}`,
            pw, sponsorId, leg, planId, pick(products).id, pick(["JazzCash", "EasyPaisa", "Bank Account"]), phone, ts,
          ],
          c,
        );
        if (inactive) return u!.id as number;
        const before = await maxIds(c);
        await activate(c, { userId: u!.id, method: "admin", actorId });
        await backdate(c, before!, day, ts, u!.id);
        return u!.id as number;
      });
      if (!inactive) active.push(userId);
    }
  }

  // close every simulated day (pays up to the cap, flushes the rest)
  await runDueClosings(tx, actorId);
  await q(
    `UPDATE transactions t SET created_at = (cl.day + time '23:59') AT TIME ZONE 'Asia/Karachi'
     FROM closings cl WHERE t.ref_type = 'closing' AND t.ref_id = cl.id`,
  );

  // dispatch most package orders
  await q(`UPDATE orders SET status = CASE WHEN random() < 0.55 THEN 'delivered' WHEN random() < 0.6 THEN 'dispatched' ELSE 'pending' END,
             courier = 'TCS', tracking_id = 'TCS' || (100000 + id)::text
           WHERE kind = 'package' AND status = 'pending' AND created_at < now() - interval '1 day'`);

  // rank rewards: take cash on some, gift on others
  const ach = await q("SELECT id, user_id FROM rank_achievements WHERE status = 'choose'");
  for (const a of ach) await tx((c) => chooseReward(c, a.user_id, a.id, randomInt(2) ? "cash" : "gift"));

  // withdrawals from members with balance
  const rich = await q(
    `SELECT id, payout_method, payout_title, payout_account, earning_balance FROM users
     WHERE email LIKE $1 AND status = 'active' AND earning_balance >= $2 ORDER BY earning_balance DESC LIMIT 12`,
    [`%@${DEMO_EMAIL_DOMAIN}`, Number(s.withdrawal_min)],
  );
  let wi = 0;
  for (const r of rich) {
    const amount = Math.max(Number(s.withdrawal_min), Math.floor((r.earning_balance * (0.4 + randomInt(40) / 100)) / 100) * 100);
    if (amount > r.earning_balance) continue;
    const w = await tx((c) =>
      requestWithdrawal(c, r.id, { amount, method: r.payout_method, title: r.payout_title, account: r.payout_account }),
    );
    const daysAgo = randomInt(5);
    await q("UPDATE withdrawals SET created_at = now() - ($2 || ' days')::interval - interval '3 hours' WHERE id = $1", [w.id, String(daysAgo)]);
    if (wi++ % 2 === 0) {
      await tx((c) => processWithdrawal(c, w.id, "paid", `Txn ${700000 + w.id}`, actorId));
    }
  }

  // office E-Pin stock, some assigned to members; fund a few E-Pin wallets
  const sample = await q(`SELECT id FROM users WHERE email LIKE $1 AND status = 'active' ORDER BY random() LIMIT 4`, [`%@${DEMO_EMAIL_DOMAIN}`]);
  await tx((c) => generatePins(c, { planId: plans[0].id, count: 15, ownerId: null, actorId }));
  for (const u of sample.slice(0, 2)) await tx((c) => generatePins(c, { planId: plans[0].id, count: 3, ownerId: u.id, actorId }));
  for (const u of sample.slice(2)) {
    await tx(async (c) => {
      const { credit } = await import("./engine");
      await credit(c, u.id, "epin", "admin_fund", 2700, "Fund transfer from company (demo)");
    });
  }

  await q(
    `INSERT INTO announcements (title, body) VALUES
      ('Payout schedule: every Friday', 'Withdrawal requests are processed every Friday by the finance office.'),
      ('Training webinar Saturday 8pm', 'Join the live WhatsApp & TikTok marketing session on Saturday at 8pm.')`,
  );
  await audit(pool(), actorId, "demo.generate", { members: made });
  return { members: made, activeMembers: active.length - 1 };
}

/** Delete all member / money data. Keeps settings, plans, ranks, company products, training and admins. */
export async function resetMemberData(actorId: number) {
  const s = await getSettings();
  void s;
  await tx(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(7701)");
    await c.query(`TRUNCATE transactions, pairs, closings, company_ledger, withdrawals, rank_achievements, invoices, orders,
                   activations, epins, manager_runs, login_attempts RESTART IDENTITY`);
    await c.query("DELETE FROM products WHERE vendor_id IS NOT NULL");
    await c.query("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE role = 'member')");
    await c.query("DELETE FROM audit_logs WHERE actor_id IN (SELECT id FROM users WHERE role = 'member')");
    await c.query("DELETE FROM users WHERE role = 'member'");
    await c.query("ALTER SEQUENCE member_code_seq RESTART WITH 10001");
    await c.query("ALTER SEQUENCE invoice_seq RESTART WITH 1");
    const pw = process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8 ? process.env.ADMIN_PASSWORD : DEMO_PASSWORD;
    await seedDefaults(c, { adminPhone: process.env.ADMIN_PHONE || "03000000000", adminPassword: pw, withCompanyRoot: true });
    await audit(c, actorId, "data.reset", {});
  });
}
