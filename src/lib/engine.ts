/**
 * ESN commission engine.
 *
 * Rules (all values come from settings / plans / ranks tables, editable in admin):
 *  - Placement: sponsor's chosen leg; if that direct slot is taken -> auto-spillover
 *    (extreme outer edge, or balanced level-order) inside that leg.
 *  - First pair (direct pair): 1 Left + 1 Right. With `first_pair_requires_direct`
 *    both legs must contain at least one member the user personally sponsored.
 *    Paid instantly at plan.direct_pair_bonus.
 *  - Indirect pairs: after the first pair, every 1 Left : 1 Right match at any depth
 *    pays plan.indirect_pair_bonus. Unmatched members carry forward.
 *  - Daily capping: plan.daily_cap_pairs / daily_cap_amount (rank may override).
 *    Midnight closing pays up to the cap and flushes the rest to the company ledger.
 *  - Ranks: fresh or cumulative pair counting; reward = gift or cash (member chooses).
 */
import type { PoolClient } from "pg";
import { q, one, fail, type Db, type Row } from "./db";
import { getSettings, type Settings } from "./settings";

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export async function todayIn(db: Db, tz: string): Promise<string> {
  const r = await one<{ d: string }>("SELECT (now() AT TIME ZONE $1)::date::text AS d", [tz], db);
  return r!.d;
}

export const EARNING_TYPES = new Set([
  "direct_pair",
  "pair_bonus",
  "direct_referral",
  "rank_reward",
  "salary",
  "pool_share",
  "vendor_sale",
]);

/** Change a wallet balance and write the ledger row. Throws if it would go negative. */
export async function credit(
  db: Db,
  userId: number,
  wallet: "earning" | "epin",
  type: string,
  amount: number,
  note: string,
  ref?: { type: string; id: number },
): Promise<number> {
  amount = r2(amount);
  if (amount === 0) return 0;
  const col = wallet === "earning" ? "earning_balance" : "epin_balance";
  const earned = wallet === "earning" && amount > 0 && EARNING_TYPES.has(type) ? amount : 0;
  const row = await one<{ bal: number }>(
    `UPDATE users SET ${col} = ${col} + $2, total_earned = total_earned + $3
     WHERE id = $1 AND ${col} + $2 >= 0 RETURNING ${col} AS bal`,
    [userId, amount, earned],
    db,
  );
  if (!row) fail(wallet === "earning" ? "Insufficient earning wallet balance." : "Insufficient E-Pin wallet balance.");
  await q(
    `INSERT INTO transactions (user_id, wallet, type, amount, balance_after, note, ref_type, ref_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [userId, wallet, type, amount, row!.bal, note, ref?.type ?? null, ref?.id ?? null],
    db,
  );
  return row!.bal;
}

export async function companyLedger(db: Db, kind: string, amount: number, userId: number | null, note: string, refId?: number) {
  amount = r2(amount);
  if (amount === 0) return;
  await q(`INSERT INTO company_ledger (kind, amount, user_id, note, ref_id) VALUES ($1,$2,$3,$4,$5)`, [
    kind,
    amount,
    userId,
    note,
    refId ?? null,
  ], db);
}

export async function audit(db: Db, actorId: number | null, action: string, details: Row = {}) {
  await q(`INSERT INTO audit_logs (actor_id, action, details) VALUES ($1,$2,$3)`, [actorId, action, JSON.stringify(details)], db);
}

export async function nextMemberCode(db: Db): Promise<string> {
  const r = await one<{ n: number }>("SELECT nextval('member_code_seq') AS n", [], db);
  return `ESN${r!.n}`;
}

export async function getRoot(db: Db): Promise<Row | null> {
  return one(
    "SELECT * FROM users WHERE parent_id IS NULL AND status = 'active' AND role = 'member' ORDER BY id LIMIT 1",
    [],
    db,
  );
}

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

/** Find where a new member goes under `sponsorId` on `leg`. */
export async function findSlot(
  db: Db,
  sponsorId: number,
  leg: "L" | "R",
  mode: string,
): Promise<{ parentId: number; position: "L" | "R" }> {
  const taken = await one("SELECT id FROM users WHERE parent_id = $1 AND position = $2", [sponsorId, leg], db);
  if (!taken) return { parentId: sponsorId, position: leg };

  if (mode === "balanced") {
    // first node (level order, left before right) inside the leg that has a free slot
    const r = await one<{ id: number; has_l: boolean; has_r: boolean }>(
      `WITH RECURSIVE t AS (
         SELECT id, 1 AS d, ARRAY[0]::int[] AS path FROM users WHERE id = $1
         UNION ALL
         SELECT u.id, t.d + 1, t.path || (CASE WHEN u.position = 'L' THEN 0 ELSE 1 END)
         FROM users u JOIN t ON u.parent_id = t.id
       )
       SELECT t.id,
         EXISTS (SELECT 1 FROM users c WHERE c.parent_id = t.id AND c.position = 'L') AS has_l,
         EXISTS (SELECT 1 FROM users c WHERE c.parent_id = t.id AND c.position = 'R') AS has_r
       FROM t
       WHERE (SELECT count(*) FROM users c WHERE c.parent_id = t.id) < 2
       ORDER BY t.d, t.path
       LIMIT 1`,
      [taken.id],
      db,
    );
    return { parentId: r!.id, position: r!.has_l ? "R" : "L" };
  }

  // extreme: follow the same leg down to the last node and attach there
  const r = await one<{ id: number }>(
    `WITH RECURSIVE chain AS (
       SELECT id, 1 AS d FROM users WHERE id = $1
       UNION ALL
       SELECT u.id, chain.d + 1 FROM users u JOIN chain ON u.parent_id = chain.id AND u.position = $2
     )
     SELECT id FROM chain ORDER BY d DESC LIMIT 1`,
    [taken.id, leg],
    db,
  );
  return { parentId: r!.id, position: leg };
}

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------

export type ActivateInput = {
  userId: number;
  method: "epin" | "wallet" | "admin" | "company";
  epinCode?: string;
  payerId?: number; // for wallet method
  actorId?: number | null;
  placement?: { parentId: number | null; position: "L" | "R" | null }; // admin/company manual placement
};

export async function activate(c: PoolClient, input: ActivateInput) {
  // Serialize all tree mutations so counts and pairs are always consistent.
  await c.query("SELECT pg_advisory_xact_lock(7701)");
  const s = await getSettings(c);
  const day = await todayIn(c, s.closing_timezone);

  const user = await one("SELECT * FROM users WHERE id = $1 FOR UPDATE", [input.userId], c);
  if (!user) fail("Member not found.");
  if (user!.status === "active") fail(`${user!.code} is already active.`);
  if (user!.status === "blocked") fail(`${user!.code} is blocked.`);

  let planId: number | null = user!.plan_id;
  let epinId: number | null = null;
  let cashIn = true;

  if (input.method === "epin") {
    const code = (input.epinCode || "").replace(/\D/g, "");
    if (code.length < 8) fail("Enter a valid E-Pin.");
    const pin = await one("SELECT * FROM epins WHERE code = $1 FOR UPDATE", [code], c);
    if (!pin) fail("E-Pin not found.");
    if (pin!.status !== "unused") fail(`This E-Pin is already ${pin!.status}.`);
    planId = pin!.plan_id;
    epinId = pin!.id;
    cashIn = pin!.source === "admin";
    await q("UPDATE epins SET status = 'used', used_by = $2, used_at = now() WHERE id = $1", [pin!.id, user!.id], c);
  }

  if (!planId) {
    const p = await one("SELECT id FROM plans WHERE active ORDER BY sort, id LIMIT 1", [], c);
    planId = p?.id ?? null;
  }
  const plan = await one("SELECT * FROM plans WHERE id = $1", [planId], c);
  if (!plan) fail("No plan configured. Create a plan in Admin → Plans.");

  if (input.method === "wallet") {
    if (!input.payerId) fail("Payer missing.");
    await credit(c, input.payerId!, "epin", "activation", -plan!.price, `Activated ${user!.code} (${plan!.name})`);
    cashIn = false;
  }
  if (input.method === "company") cashIn = false;

  // ---- placement
  let parentId: number | null = null;
  let position: "L" | "R" | null = null;
  if (input.placement) {
    parentId = input.placement.parentId;
    position = input.placement.position;
    if (parentId) {
      const p = await one("SELECT id, status FROM users WHERE id = $1", [parentId], c);
      if (!p || p.status !== "active") fail("Placement parent must be an active ID.");
      const taken = await one("SELECT id FROM users WHERE parent_id = $1 AND position = $2", [parentId, position], c);
      if (taken) fail("That position is already filled.");
    } else {
      const root = await getRoot(c);
      if (root) fail("A top (root) ID already exists. Choose a parent.");
    }
  } else {
    const root = await getRoot(c);
    if (!root) {
      parentId = null;
      position = null;
    } else {
      // sponsor must be in the tree; walk up the sponsor chain to the first active sponsor
      let sponsor = user!.sponsor_id ? await one("SELECT * FROM users WHERE id = $1", [user!.sponsor_id], c) : null;
      let guard = 0;
      while (sponsor && sponsor.status !== "active" && guard++ < 1000) {
        sponsor = sponsor.sponsor_id ? await one("SELECT * FROM users WHERE id = $1", [sponsor.sponsor_id], c) : null;
      }
      if (!sponsor) sponsor = root;
      const leg = (user!.preferred_leg as "L" | "R") || "L";
      const slot = await findSlot(c, sponsor!.id, leg, s.spillover_mode);
      parentId = slot.parentId;
      position = slot.position;
    }
  }
  const parent = parentId ? await one("SELECT depth FROM users WHERE id = $1", [parentId], c) : null;

  await q(
    `UPDATE users SET status = 'active', plan_id = $2, parent_id = $3, position = $4, depth = $5,
       activated_at = now(), carry_updated_at = now()
     WHERE id = $1`,
    [user!.id, plan!.id, parentId, position, parent ? parent.depth + 1 : 0],
    c,
  );

  const amount = input.method === "company" ? 0 : plan!.price;
  const act = await one(
    `INSERT INTO activations (user_id, plan_id, method, epin_id, activated_by, amount, cash_in, day)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [user!.id, plan!.id, input.method, epinId, input.actorId ?? input.payerId ?? null, amount, cashIn, day],
    c,
  );

  // ---- product order + invoice (legal e-commerce sale record)
  let invoiceNumber: string | null = null;
  if (input.method !== "company") {
    const product =
      (user!.product_id && (await one("SELECT * FROM products WHERE id = $1", [user!.product_id], c))) ||
      (await one("SELECT * FROM products WHERE is_package AND active ORDER BY sort, id LIMIT 1", [], c));
    const productName = product?.name ?? "Starter Product";
    const order = await one(
      `INSERT INTO orders (kind, user_id, product_id, product_name, amount, customer_name, phone, address, city)
       VALUES ('package',$1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [user!.id, product?.id ?? null, productName, amount, user!.name, user!.phone, user!.address, user!.city],
      c,
    );
    const n = await one<{ n: number }>("SELECT nextval('invoice_seq') AS n", [], c);
    invoiceNumber = `INV-${new Date().getFullYear()}-${String(n!.n).padStart(6, "0")}`;
    await q(
      `INSERT INTO invoices (number, user_id, activation_id, order_id, product_name, plan_name, amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [invoiceNumber, user!.id, act!.id, order!.id, productName, plan!.name, amount],
      c,
    );
  }

  // ---- direct referral bonus (optional, per plan of the sponsor)
  if (user!.sponsor_id) {
    const sp = await one(
      `SELECT u.id, u.status, p.direct_referral_bonus FROM users u LEFT JOIN plans p ON p.id = u.plan_id WHERE u.id = $1`,
      [user!.sponsor_id],
      c,
    );
    if (sp && sp.status === "active" && sp.direct_referral_bonus > 0) {
      await credit(c, sp.id, "earning", "direct_referral", sp.direct_referral_bonus, `Direct referral: ${user!.code}`, {
        type: "user",
        id: user!.id,
      });
    }
  }

  if (parentId) await propagate(c, user!.id, user!.sponsor_id, s, day);

  await audit(c, input.actorId ?? input.payerId ?? null, "member.activate", {
    code: user!.code,
    method: input.method,
    plan: plan!.code,
  });
  return { code: user!.code as string, invoiceNumber, planName: plan!.name as string };
}

/** Walk all ancestors of the new node: update leg counts, carry, then match pairs. */
async function propagate(c: PoolClient, newId: number, sponsorId: number | null, s: Settings, day: string) {
  const rows = await q<{ id: number; side: "L" | "R"; left_carry: number; right_carry: number }>(
    `WITH RECURSIVE up AS (
       SELECT parent_id AS id, position AS side FROM users WHERE id = $1 AND parent_id IS NOT NULL
       UNION ALL
       SELECT u.parent_id, u.position FROM users u JOIN up ON u.id = up.id WHERE u.parent_id IS NOT NULL
     )
     UPDATE users u SET
       left_count  = u.left_count  + (up.side = 'L')::int,
       right_count = u.right_count + (up.side = 'R')::int,
       left_carry  = u.left_carry  + (up.side = 'L')::int,
       right_carry = u.right_carry + (up.side = 'R')::int,
       carry_updated_at = now()
     FROM up WHERE u.id = up.id
     RETURNING u.id, up.side, u.left_carry, u.right_carry`,
    [newId],
    c,
  );

  // sponsor's direct-leg counter (only if the sponsor is actually an ancestor)
  const sp = sponsorId ? rows.find((r) => r.id === sponsorId) : undefined;
  if (sp) {
    await q(
      `UPDATE users SET ${sp.side === "L" ? "direct_left = direct_left + 1" : "direct_right = direct_right + 1"} WHERE id = $1`,
      [sp.id],
      c,
    );
  }

  for (const r of rows) {
    if (r.left_carry > 0 && r.right_carry > 0) await matchPairs(c, r.id, s, day);
  }
}

export async function effectiveCap(db: Db, user: Row): Promise<{ pairs: number; amount: number }> {
  let pairs = Number(user.daily_cap_pairs ?? 0);
  let amount = Number(user.daily_cap_amount ?? 0);
  if (user.rank_level > 0) {
    const rk = await one(
      "SELECT daily_cap_pairs, daily_cap_amount FROM ranks WHERE level <= $1 AND active AND (daily_cap_pairs IS NOT NULL OR daily_cap_amount IS NOT NULL) ORDER BY level DESC LIMIT 1",
      [user.rank_level],
      db,
    );
    if (rk?.daily_cap_pairs != null) pairs = rk.daily_cap_pairs;
    if (rk?.daily_cap_amount != null) amount = rk.daily_cap_amount;
  }
  return { pairs, amount };
}

export async function matchPairs(c: PoolClient, userId: number, s: Settings, day: string) {
  const u = await one(
    `SELECT u.*, p.direct_pair_bonus, p.indirect_pair_bonus, p.daily_cap_pairs, p.daily_cap_amount
     FROM users u JOIN plans p ON p.id = u.plan_id WHERE u.id = $1 FOR UPDATE OF u`,
    [userId],
    c,
  );
  if (!u || u.status === "blocked") return;
  let L = u.left_carry as number;
  let R = u.right_carry as number;
  let firstDone = u.first_pair_done as boolean;
  let made = 0;

  if (!firstDone) {
    const ok = s.first_pair_requires_direct ? u.direct_left > 0 && u.direct_right > 0 : true;
    if (!ok || L < 1 || R < 1) return;
    const amt = r2(u.direct_pair_bonus);
    const pr = await one(
      `INSERT INTO pairs (user_id, day, kind, amount, paid_amount, status) VALUES ($1,$2,'direct',$3,$3,'paid') RETURNING id`,
      [u.id, day, amt],
      c,
    );
    await credit(c, u.id, "earning", "direct_pair", amt, "Direct pair bonus (1 Left + 1 Right direct)", {
      type: "pair",
      id: pr!.id,
    });
    L--;
    R--;
    firstDone = true;
    made++;
  }

  const n = Math.min(L, R);
  if (n > 0) {
    const amt = r2(u.indirect_pair_bonus);
    if (s.pair_credit_mode === "instant") {
      const cap = await effectiveCap(c, u);
      const done = await one<{ n: number; amt: number }>(
        `SELECT count(*)::int AS n, coalesce(sum(paid_amount),0) AS amt FROM pairs
         WHERE user_id = $1 AND day = $2 AND kind = 'indirect' AND status = 'paid'`,
        [u.id, day],
        c,
      );
      let paidN = 0;
      let paidAmt = done!.amt;
      let cnt = done!.n;
      for (let i = 0; i < n; i++) {
        const okPairs = cap.pairs <= 0 || cnt < cap.pairs;
        const okAmt = cap.amount <= 0 || paidAmt + amt <= cap.amount + 0.001;
        if (okPairs && okAmt) {
          paidN++;
          cnt++;
          paidAmt += amt;
        } else break;
      }
      const flushN = n - paidN;
      if (paidN > 0) {
        await q(
          `INSERT INTO pairs (user_id, day, kind, amount, paid_amount, status)
           SELECT $1, $2, 'indirect', $3, $3, 'paid' FROM generate_series(1, $4)`,
          [u.id, day, amt, paidN],
          c,
        );
        await credit(c, u.id, "earning", "pair_bonus", amt * paidN, `Binary pair income: ${paidN} pair(s)`);
      }
      if (flushN > 0) {
        await q(
          `INSERT INTO pairs (user_id, day, kind, amount, paid_amount, status)
           SELECT $1, $2, 'indirect', $3, 0, 'flushed' FROM generate_series(1, $4)`,
          [u.id, day, amt, flushN],
          c,
        );
        await companyLedger(c, "flush", amt * flushN, u.id, `Daily cap flush-out: ${flushN} pair(s)`);
      }
    } else {
      await q(
        `INSERT INTO pairs (user_id, day, kind, amount, status)
         SELECT $1, $2, 'indirect', $3, 'pending' FROM generate_series(1, $4)`,
        [u.id, day, amt, n],
        c,
      );
    }
    L -= n;
    R -= n;
    made += n;
  }

  await q(
    `UPDATE users SET left_carry = $2, right_carry = $3, first_pair_done = $4, total_pairs = total_pairs + $5 WHERE id = $1`,
    [u.id, L, R, firstDone, made],
    c,
  );
  if (made > 0) await checkRanks(c, u.id, s);
}

export async function checkRanks(db: Db, userId: number, s: Settings) {
  const ranks = await q("SELECT * FROM ranks WHERE active ORDER BY level", [], db);
  for (let guard = 0; guard < 100; guard++) {
    const u = await one("SELECT id, total_pairs, rank_level, rank_base_pairs FROM users WHERE id = $1", [userId], db);
    const next = ranks.find((r) => r.level > u!.rank_level);
    if (!next) return;
    const progress = s.rank_mode === "fresh" ? u!.total_pairs - u!.rank_base_pairs : u!.total_pairs;
    if (progress < next.pairs_required) return;
    await q(
      `INSERT INTO rank_achievements (user_id, rank_level, rank_name, reward_item, reward_cash, status)
       VALUES ($1,$2,$3,$4,$5,'choose') ON CONFLICT (user_id, rank_level) DO NOTHING`,
      [userId, next.level, next.name, next.reward_item, next.reward_cash],
      db,
    );
    await q(
      `UPDATE users SET rank_level = $2, rank_base_pairs = rank_base_pairs + $3 WHERE id = $1`,
      [userId, next.level, s.rank_mode === "fresh" ? next.pairs_required : 0],
      db,
    );
  }
}

/** Progress toward the next rank, for dashboards. */
export function rankProgress(u: Row, ranks: Row[], s: Settings) {
  const current = ranks.filter((r) => r.level <= u.rank_level).pop() ?? null;
  const next = ranks.find((r) => r.level > u.rank_level) ?? null;
  const have = s.rank_mode === "fresh" ? u.total_pairs - u.rank_base_pairs : u.total_pairs;
  const need = next?.pairs_required ?? 0;
  return { current, next, have, need, pct: next ? Math.min(100, Math.round((have / need) * 100)) : 100 };
}

// ---------------------------------------------------------------------------
// Midnight closing
// ---------------------------------------------------------------------------

export async function closeDay(c: PoolClient, day: string, actorId: number | null = null) {
  await c.query("SELECT pg_advisory_xact_lock(7701)");
  const s = await getSettings(c);
  const exists = await one("SELECT id FROM closings WHERE day = $1", [day], c);
  if (exists) return null;

  const pend = await q<{ id: number; user_id: number; amount: number }>(
    `SELECT id, user_id, amount FROM pairs WHERE status = 'pending' AND day <= $1 ORDER BY user_id, id`,
    [day],
    c,
  );
  const byUser = new Map<number, { id: number; amount: number }[]>();
  for (const p of pend) {
    if (!byUser.has(p.user_id)) byUser.set(p.user_id, []);
    byUser.get(p.user_id)!.push(p);
  }

  type Plan = { userId: number; paid: { id: number; amount: number }[]; flushed: { id: number; amount: number }[] };
  const plans: Plan[] = [];
  let totalPaid = 0;
  for (const [userId, list] of byUser) {
    const u = await one(
      `SELECT u.*, p.daily_cap_pairs, p.daily_cap_amount FROM users u JOIN plans p ON p.id = u.plan_id WHERE u.id = $1`,
      [userId],
      c,
    );
    const cap = await effectiveCap(c, u!);
    const blocked = u!.status === "blocked";
    const paid: Plan["paid"] = [];
    const flushed: Plan["flushed"] = [];
    let amt = 0;
    for (const p of list) {
      const okPairs = cap.pairs <= 0 || paid.length < cap.pairs;
      const okAmt = cap.amount <= 0 || amt + p.amount <= cap.amount + 0.001;
      if (!blocked && okPairs && okAmt) {
        paid.push(p);
        amt += p.amount;
      } else flushed.push(p);
    }
    totalPaid += amt;
    plans.push({ userId, paid, flushed });
  }

  // Payout normalization (budget lock)
  let factor = 1;
  if (s.normalization_enabled && totalPaid > 0) {
    const col = await one<{ amt: number }>(
      "SELECT coalesce(sum(amount),0) AS amt FROM activations WHERE day = $1",
      [day],
      c,
    );
    const budget = (col!.amt * Number(s.normalization_percent)) / 100;
    if (totalPaid > budget) factor = Math.max(0, budget / totalPaid);
  }

  const cl = await one(`INSERT INTO closings (day, normalization_factor) VALUES ($1,$2) RETURNING id`, [day, factor], c);
  let usersPaid = 0,
    pairsPaid = 0,
    pairsFlushed = 0,
    amountPaid = 0,
    amountFlushed = 0;

  for (const p of plans) {
    if (p.paid.length) {
      const ids = p.paid.map((x) => x.id);
      await q(
        `UPDATE pairs SET status = 'paid', paid_amount = round(amount * $2::numeric, 2), closing_id = $3 WHERE id = ANY($1::bigint[])`,
        [ids, factor, cl!.id],
        c,
      );
      const gross = p.paid.reduce((a, x) => a + x.amount, 0);
      const net = r2(gross * factor);
      if (net > 0) {
        await credit(
          c,
          p.userId,
          "earning",
          "pair_bonus",
          net,
          `Binary income ${day}: ${p.paid.length} pair(s)` + (p.flushed.length ? `, ${p.flushed.length} flushed` : ""),
          { type: "closing", id: cl!.id },
        );
      }
      if (factor < 1) await companyLedger(c, "normalization", gross - net, p.userId, `Normalization ${day}`, cl!.id);
      usersPaid++;
      pairsPaid += p.paid.length;
      amountPaid += net;
    }
    if (p.flushed.length) {
      const ids = p.flushed.map((x) => x.id);
      await q(`UPDATE pairs SET status = 'flushed', closing_id = $2 WHERE id = ANY($1::bigint[])`, [ids, cl!.id], c);
      const f = p.flushed.reduce((a, x) => a + x.amount, 0);
      await companyLedger(c, "flush", f, p.userId, `Flush-out ${day}: ${p.flushed.length} pair(s) over daily cap`, cl!.id);
      pairsFlushed += p.flushed.length;
      amountFlushed += f;
    }
  }

  // Carry forward expiry
  let expired = 0;
  if (Number(s.carry_forward_days) > 0) {
    const ex = await q(
      `UPDATE users SET left_carry = 0, right_carry = 0
       WHERE first_pair_done AND (left_carry > 0 OR right_carry > 0)
         AND carry_updated_at < now() - ($1 || ' days')::interval
       RETURNING id`,
      [String(s.carry_forward_days)],
      c,
    );
    expired = ex.length;
  }

  await q(
    `UPDATE closings SET users_paid=$2, pairs_paid=$3, pairs_flushed=$4, amount_paid=$5, amount_flushed=$6, carry_expired=$7 WHERE id=$1`,
    [cl!.id, usersPaid, pairsPaid, pairsFlushed, r2(amountPaid), r2(amountFlushed), expired],
    c,
  );
  await audit(c, actorId, "closing.run", { day, usersPaid, pairsPaid, pairsFlushed, factor });
  return { day, usersPaid, pairsPaid, pairsFlushed, amountPaid: r2(amountPaid), amountFlushed: r2(amountFlushed), factor };
}

/** Close every past day that has not been closed yet. Safe to call often. */
export async function runDueClosings(txRunner: <T>(fn: (c: PoolClient) => Promise<T>) => Promise<T>, actorId: number | null = null) {
  const s = await getSettings();
  const today = await todayIn((await import("./db")).pool(), s.closing_timezone);
  const days = await q<{ day: string }>(
    `SELECT DISTINCT day FROM pairs WHERE status = 'pending' AND day < $1
     UNION SELECT ($1::date - 1)::date AS day WHERE NOT EXISTS (SELECT 1 FROM closings WHERE day = $1::date - 1)
     ORDER BY day`,
    [today],
  );
  const results = [];
  for (const d of days) {
    const r = await txRunner((c) => closeDay(c, d.day, actorId));
    if (r) results.push(r);
  }
  return results;
}
