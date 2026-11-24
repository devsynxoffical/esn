/** Wallet, E-Pin, withdrawal, reward, order and manager operations. */
import type { PoolClient } from "pg";
import { randomInt } from "node:crypto";
import { q, one, fail, type Db } from "./db";
import { getSettings } from "./settings";
import { credit, companyLedger, audit, r2 } from "./engine";

export async function newPinCode(db: Db): Promise<string> {
  for (let i = 0; i < 20; i++) {
    let code = String(randomInt(1, 10));
    for (let j = 0; j < 15; j++) code += String(randomInt(0, 10));
    const exists = await one("SELECT 1 FROM epins WHERE code = $1", [code], db);
    if (!exists) return code;
  }
  throw new Error("Could not generate a unique E-Pin");
}

export const formatPin = (code: string) => code.replace(/(\d{4})(?=\d)/g, "$1-");

export async function generatePins(c: PoolClient, opts: { planId: number; count: number; ownerId: number | null; actorId: number }) {
  if (opts.count < 1 || opts.count > 1000) fail("You can generate 1 to 1000 E-Pins at a time.");
  const plan = await one("SELECT id, name FROM plans WHERE id = $1", [opts.planId], c);
  if (!plan) fail("Choose a plan.");
  const batch = `B${Date.now().toString(36).toUpperCase()}`;
  const codes: string[] = [];
  for (let i = 0; i < opts.count; i++) {
    const code = await newPinCode(c);
    await q(
      `INSERT INTO epins (code, plan_id, source, batch, owner_id, created_by) VALUES ($1,$2,'admin',$3,$4,$5)`,
      [code, opts.planId, batch, opts.ownerId, opts.actorId],
      c,
    );
    codes.push(code);
  }
  await audit(c, opts.actorId, "epin.generate", { count: opts.count, plan: plan!.name, batch, ownerId: opts.ownerId });
  return { batch, codes };
}

/** Member buys an E-Pin with their E-Pin wallet balance. */
export async function pinFromWallet(c: PoolClient, userId: number, planId: number, count: number) {
  if (count < 1 || count > 50) fail("You can create 1 to 50 E-Pins at a time.");
  const plan = await one("SELECT * FROM plans WHERE id = $1 AND active", [planId], c);
  if (!plan) fail("Plan not available.");
  await credit(c, userId, "epin", "epin_purchase", -plan!.price * count, `${count} × E-Pin (${plan!.name})`);
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = await newPinCode(c);
    await q(`INSERT INTO epins (code, plan_id, source, owner_id, created_by) VALUES ($1,$2,'wallet',$3,$3)`, [
      code,
      planId,
      userId,
    ], c);
    codes.push(code);
  }
  return codes;
}

export async function transferPin(c: PoolClient, fromId: number | null, pinId: number, toCode: string, actorId: number) {
  const to = await one("SELECT id, code FROM users WHERE upper(code) = upper($1)", [toCode.trim()], c);
  if (!to) fail("Receiver ID not found.");
  const pin = await one("SELECT * FROM epins WHERE id = $1 FOR UPDATE", [pinId], c);
  if (!pin || pin.status !== "unused") fail("E-Pin not available.");
  if (fromId !== null && pin!.owner_id !== fromId) fail("This E-Pin is not yours.");
  await q("UPDATE epins SET owner_id = $2 WHERE id = $1", [pinId, to!.id], c);
  await audit(c, actorId, "epin.transfer", { pin: pin!.code.slice(-4), to: to!.code });
  return to!.code as string;
}

export async function earningToEpin(c: PoolClient, userId: number, amount: number) {
  const s = await getSettings(c);
  if (!s.allow_earning_to_epin) fail("Conversion is disabled by admin.");
  amount = r2(amount);
  if (!(amount > 0)) fail("Enter a valid amount.");
  const fee = r2((amount * Number(s.earning_to_epin_fee_percent)) / 100);
  await credit(c, userId, "earning", "to_epin_wallet", -amount, "Moved to E-Pin wallet");
  await credit(c, userId, "epin", "from_earning_wallet", amount - fee, "Received from Earning wallet" + (fee ? ` (fee ${fee})` : ""));
  if (fee) await companyLedger(c, "conversion_fee", fee, userId, "Earning → E-Pin conversion fee");
}

export async function requestWithdrawal(
  c: PoolClient,
  userId: number,
  input: { amount: number; method: string; title: string; account: string; bank?: string },
) {
  const s = await getSettings(c);
  if (!s.withdrawals_enabled) fail("Withdrawals are currently closed.");
  const amount = r2(input.amount);
  if (!(amount > 0)) fail("Enter a valid amount.");
  if (amount < Number(s.withdrawal_min)) fail(`Minimum withdrawal is ${s.currency} ${s.withdrawal_min}.`);
  if (Number(s.withdrawal_max) > 0 && amount > Number(s.withdrawal_max))
    fail(`Maximum withdrawal per request is ${s.currency} ${s.withdrawal_max}.`);
  if (!s.withdrawal_methods.includes(input.method)) fail("Choose a payment method.");
  const account = input.account.replace(/\s+/g, "").toUpperCase();
  if (!input.title.trim() || account.length < 6) fail("Enter account title and account number / IBAN.");
  const u = await one("SELECT status FROM users WHERE id = $1", [userId], c);
  if (u?.status !== "active") fail("Only active accounts can withdraw.");
  if (s.unique_payout_account) {
    const other = await one(
      `SELECT 1 FROM withdrawals WHERE account_number = $1 AND user_id <> $2 AND status <> 'rejected'
       UNION SELECT 1 FROM users WHERE upper(replace(payout_account,' ','')) = $1 AND id <> $2 LIMIT 1`,
      [account, userId],
      c,
    );
    if (other) fail("This payout account is already linked to another member.");
  }
  const pct = Number(s.withdrawal_fee_percent);
  const fee = r2((amount * pct) / 100);
  const net = r2(amount - fee);
  const w = await one(
    `INSERT INTO withdrawals (user_id, amount, fee_percent, fee, net, method, account_title, account_number, bank_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [userId, amount, pct, fee, net, input.method, input.title.trim(), account, input.bank?.trim() || null],
    c,
  );
  await credit(c, userId, "earning", "withdrawal", -amount, `Withdrawal request #${w!.id} (${input.method})`, {
    type: "withdrawal",
    id: w!.id,
  });
  await q(
    `UPDATE users SET payout_method = $2, payout_title = $3, payout_account = $4, payout_bank = $5 WHERE id = $1`,
    [userId, input.method, input.title.trim(), account, input.bank?.trim() || null],
    c,
  );
  return { id: w!.id as number, fee, net };
}

export async function processWithdrawal(c: PoolClient, id: number, action: "paid" | "rejected", note: string, actorId: number) {
  const w = await one("SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE", [id], c);
  if (!w) fail("Withdrawal not found.");
  if (w!.status !== "pending") fail("Already processed.");
  if (w!.user_id === actorId) fail("You cannot process your own withdrawal.");
  await q(
    `UPDATE withdrawals SET status = $2, admin_note = $3, processed_by = $4, processed_at = now() WHERE id = $1`,
    [id, action, note || null, actorId],
    c,
  );
  if (action === "rejected") {
    await credit(c, w!.user_id, "earning", "withdrawal_refund", w!.amount, `Withdrawal #${id} rejected and refunded`, {
      type: "withdrawal",
      id,
    });
  } else {
    await companyLedger(c, "withdrawal_fee", w!.fee, w!.user_id, `Fee on withdrawal #${id}`, id);
  }
  await audit(c, actorId, `withdrawal.${action}`, { id, amount: w!.amount });
}

export async function chooseReward(c: PoolClient, userId: number, achId: number, choice: "cash" | "gift") {
  const a = await one("SELECT * FROM rank_achievements WHERE id = $1 AND user_id = $2 FOR UPDATE", [achId, userId], c);
  if (!a) fail("Reward not found.");
  if (a!.status !== "choose") fail("Reward already chosen.");
  if (choice === "cash") {
    if (!(a!.reward_cash > 0)) fail("This rank has no cash option.");
    await credit(c, userId, "earning", "rank_reward", a!.reward_cash, `Rank reward: ${a!.rank_name} (cash)`, {
      type: "rank",
      id: a!.id,
    });
    await q("UPDATE rank_achievements SET status = 'cash_paid', updated_at = now() WHERE id = $1", [achId], c);
  } else {
    if (!a!.reward_item) fail("This rank has no gift option.");
    await q("UPDATE rank_achievements SET status = 'gift_pending', updated_at = now() WHERE id = $1", [achId], c);
  }
}

/** When a distributor-product order is delivered, split revenue. */
export async function settleStoreOrder(c: PoolClient, orderId: number) {
  const s = await getSettings(c);
  const o = await one("SELECT * FROM orders WHERE id = $1 FOR UPDATE", [orderId], c);
  if (!o || o.kind !== "store" || o.settled || o.status !== "delivered") return;
  if (o.vendor_id) {
    const fee = r2((o.amount * Number(s.distributor_platform_fee_percent)) / 100);
    const profit = r2(o.amount - fee);
    await credit(c, o.vendor_id, "earning", "vendor_sale", profit, `Product sale: ${o.product_name} (order #${o.id})`, {
      type: "order",
      id: o.id,
    });
    await companyLedger(c, "platform_fee", fee, o.vendor_id, `Platform fee order #${o.id}`, o.id);
    await q("UPDATE orders SET vendor_profit = $2, platform_fee = $3, settled = true WHERE id = $1", [o.id, profit, fee], c);
  } else {
    await q("UPDATE orders SET settled = true WHERE id = $1", [o.id], c);
  }
}

export const managerWhere = `u.status = 'active' AND (u.manager_override OR p.is_manager OR EXISTS (
  SELECT 1 FROM ranks r WHERE r.unlocks_manager AND r.active AND r.level <= u.rank_level))`;
export const distributorWhere = `(u.distributor_override OR p.is_distributor OR EXISTS (
  SELECT 1 FROM ranks r WHERE r.unlocks_distributor AND r.active AND r.level <= u.rank_level))`;

export async function runManagerPayout(c: PoolClient, kind: "salary" | "pool", month: string, actorId: number) {
  if (!/^\d{4}-\d{2}$/.test(month)) fail("Month must look like 2026-11.");
  const done = await one("SELECT 1 FROM manager_runs WHERE kind = $1 AND month = $2", [kind, month], c);
  if (done) fail(`${kind === "salary" ? "Salary" : "Pool"} for ${month} was already paid.`);
  const managers = await q(
    `SELECT u.id, u.code, p.monthly_salary FROM users u LEFT JOIN plans p ON p.id = u.plan_id WHERE ${managerWhere}`,
    [],
    c,
  );
  if (!managers.length) fail("No qualified managers.");
  let total = 0;
  if (kind === "salary") {
    for (const m of managers) {
      if (m.monthly_salary > 0) {
        await credit(c, m.id, "earning", "salary", m.monthly_salary, `Manager salary ${month}`);
        total += m.monthly_salary;
      }
    }
  } else {
    const s = await getSettings(c);
    const col = await one<{ amt: number }>(
      `SELECT coalesce(sum(amount),0) AS amt FROM activations WHERE to_char(day, 'YYYY-MM') = $1`,
      [month],
      c,
    );
    const pool = r2((col!.amt * Number(s.manager_pool_percent)) / 100);
    const share = Math.floor((pool / managers.length) * 100) / 100;
    if (share > 0) for (const m of managers) {
      await credit(c, m.id, "earning", "pool_share", share, `Turnover pool share ${month}`);
      total += share;
    }
  }
  await q(`INSERT INTO manager_runs (kind, month, recipients, total, created_by) VALUES ($1,$2,$3,$4,$5)`, [
    kind,
    month,
    managers.length,
    r2(total),
    actorId,
  ], c);
  await audit(c, actorId, `manager.${kind}`, { month, recipients: managers.length, total: r2(total) });
  return { recipients: managers.length, total: r2(total) };
}
