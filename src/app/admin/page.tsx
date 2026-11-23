import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { q, one, pool } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { todayIn } from "@/lib/engine";
import { money, num, dt } from "@/lib/fmt";
import { Card, Stat, Flash, Table, Badge, Empty, Bars, Progress, Row } from "@/components/ui";
import { quickRulesAction, withdrawalAction } from "@/app/actions/admin";

const EARN = "('direct_pair','pair_bonus','direct_referral','rank_reward','salary','pool_share')";

function RuleInput({ label, name, value, unit, step = "1" }: { label: string; name: string; value: number; unit: string; step?: string }) {
  return (
    <label className="flex items-center justify-between gap-3 border-b border-line py-2 text-[13.5px]">
      <span className="text-mute">{label}</span>
      <span className="flex items-center gap-2">
        <input
          name={name}
          type="number"
          min={0}
          step={step}
          defaultValue={value}
          className="num h-9 w-24 rounded-lg border border-line bg-bg px-3 text-right text-[14px] font-semibold outline-none focus:border-acc"
        />
        <span className="w-9 text-[12.5px] text-mute">{unit}</span>
      </span>
    </label>
  );
}

function RuleSwitch({ label, name, checked }: { label: string; name: string; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 border-b border-line py-2.5 text-[13.5px]">
      <span className="text-mute">{label}</span>
      <input type="checkbox" name={name} defaultChecked={checked} className="switch" />
    </label>
  );
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const s = await getSettings();
  const cur = s.currency;
  const m = (n: number) => money(n, cur);
  const day = await todayIn(pool(), s.closing_timezone);

  const [mem, f, cl, w, today, growth, pairDays, members, payouts, pins, plan, orders, gifts, admins, logs, risk] = await Promise.all([
    one(`SELECT count(*)::int AS total,
           count(*) FILTER (WHERE status='active')::int AS active,
           count(*) FILTER (WHERE status='inactive')::int AS inactive,
           count(*) FILTER (WHERE status='blocked')::int AS blocked,
           coalesce(sum(earning_balance),0) AS liab
         FROM users WHERE role='member' AND NOT is_company`),
    one(`SELECT
           coalesce(sum(amount) FILTER (WHERE type='direct_pair'),0) AS direct,
           coalesce(sum(amount) FILTER (WHERE type='pair_bonus'),0) AS indirect,
           coalesce(sum(amount) FILTER (WHERE type IN ${EARN}),0) AS total,
           coalesce(sum(amount) FILTER (WHERE type='admin_fund'),0) AS funds
         FROM transactions`),
    one(`SELECT
           coalesce(sum(amount) FILTER (WHERE kind='flush'),0) AS flush,
           coalesce(sum(amount) FILTER (WHERE kind='withdrawal_fee'),0) AS wfee,
           coalesce(sum(amount) FILTER (WHERE kind IN ('platform_fee','conversion_fee')),0) AS ofee
         FROM company_ledger`),
    one(`SELECT count(*) FILTER (WHERE status='pending')::int AS n, coalesce(sum(net) FILTER (WHERE status='pending'),0) AS net,
           coalesce(sum(net) FILTER (WHERE status='paid'),0) AS paid FROM withdrawals`),
    one(
      `SELECT (SELECT count(*)::int FROM activations WHERE day=$1 AND method <> 'company') AS joins,
              (SELECT count(*)::int FROM users WHERE role='member' AND created_at >= $1::date) AS regs`,
      [day],
    ),
    q<{ label: string; value: number }>(
      `SELECT to_char(d, 'DD') AS label,
         (SELECT count(*)::int FROM activations a WHERE a.day = d::date AND a.method <> 'company') AS value
       FROM generate_series($1::date - 13, $1::date, '1 day') d`,
      [day],
    ),
    q<{ label: string; value: number }>(
      `SELECT to_char(d, 'DD') AS label,
         (SELECT coalesce(sum(p.paid_amount),0)::float FROM pairs p WHERE p.day = d::date AND p.status = 'paid') AS value
       FROM generate_series($1::date - 13, $1::date, '1 day') d`,
      [day],
    ),
    q(`SELECT u.code, u.name, u.status, u.left_count, u.right_count, u.total_earned, u.rank_level, p.name AS plan,
              (SELECT r.name FROM ranks r WHERE r.level <= u.rank_level AND r.active ORDER BY r.level DESC LIMIT 1) AS rank
       FROM users u LEFT JOIN plans p ON p.id = u.plan_id
       WHERE u.role = 'member' AND NOT u.is_company ORDER BY u.total_earned DESC, u.id DESC LIMIT 7`),
    q(`SELECT w.*, u.name, u.code FROM withdrawals w JOIN users u ON u.id = w.user_id WHERE w.status = 'pending' ORDER BY w.id LIMIT 4`),
    one(`SELECT count(*)::int AS total, count(*) FILTER (WHERE status='used')::int AS used,
           count(*) FILTER (WHERE status='unused')::int AS unused FROM epins`),
    one("SELECT * FROM plans WHERE active ORDER BY sort, id LIMIT 1"),
    q(`SELECT o.*, u.code FROM orders o LEFT JOIN users u ON u.id = o.user_id WHERE o.status IN ('pending','dispatched')
       ORDER BY o.id LIMIT 4`),
    q(`SELECT a.*, u.name FROM rank_achievements a JOIN users u ON u.id = a.user_id WHERE a.status = 'gift_pending' ORDER BY a.id LIMIT 3`),
    q("SELECT name, code, status FROM users WHERE role = 'admin' ORDER BY id LIMIT 4"),
    q(`SELECT a.action, a.details, a.created_at, u.name FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
       WHERE a.action NOT IN ('member.register') ORDER BY a.id DESC LIMIT 5`),
    one(
      `SELECT
         (SELECT count(*)::int FROM withdrawals WHERE status='pending' AND created_at < now() - interval '3 days') AS old_wd,
         (SELECT count(DISTINCT user_id)::int FROM pairs WHERE day = $1 AND status = 'flushed') AS flushed_today,
         (SELECT count(*)::int FROM users WHERE status='blocked' AND role='member') AS blocked`,
      [day],
    ),
  ]);
  const sales = await one(`SELECT coalesce(sum(amount),0) AS total, coalesce(sum(amount) FILTER (WHERE cash_in),0) AS cash FROM activations`);

  const deposits = sales!.cash + f!.funds;
  const net = sales!.total - f!.total + cl!.wfee + cl!.ofee;
  const ratio = sales!.total > 0 ? (f!.total / sales!.total) * 100 : 0;
  const liabRatio = deposits > 0 ? ((mem!.liab + w!.net) / Math.max(1, deposits - w!.paid)) * 100 : 0;

  return (
    <>
      <Flash sp={sp} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
        <Stat hero label="Total collection" value={m(deposits)} sub={`Sales value ${m(sales!.total)}`} />
        <Stat label="Commissions paid" value={m(f!.total)} sub={`${ratio.toFixed(1)}% payout ratio`} tone="ok" />
        <Stat label="Admin balance" value={m(net)} sub={`Flush-out ${m(cl!.flush)} · fees ${m(cl!.wfee)}`} tone={net >= 0 ? "ok" : "bad"} />
        <Stat label="Pending payouts" value={num(w!.n)} sub={m(w!.net)} tone="warn" />
        <Stat label="Active members" value={`${num(mem!.active)} / ${num(mem!.total)}`} sub={`${mem!.inactive} inactive · ${mem!.blocked} blocked`} tone="ok" />
        <Stat label="New today" value={num(today!.joins)} sub={`${today!.regs} registrations`} tone="ok" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Card
          title="Members"
          action={
            <span className="flex gap-3">
              <Link href="/admin/members">View all</Link>
              <Link href="/admin/members/new">Add</Link>
            </span>
          }
          className="xl:col-span-5"
        >
          {members.length ? (
            <Table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Rank</th>
                  <th>L / R</th>
                  <th className="text-right">Earned</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((u) => (
                  <tr key={u.code}>
                    <td>
                      <Link href={`/admin/members/${u.code}`} className="font-mono text-[12.5px] hover:text-acc">
                        {u.code}
                      </Link>
                    </td>
                    <td className="max-w-[130px] truncate">{u.name}</td>
                    <td className="text-mute">{u.rank ?? "Starter"}</td>
                    <td className="num whitespace-nowrap">
                      {u.left_count} / {u.right_count}
                    </td>
                    <td className="num text-right">{num(u.total_earned)}</td>
                    <td className="text-right">
                      <Badge>{u.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty>No members yet.</Empty>
          )}
          <div className="mb-3 mt-6 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">Growth</h3>
            <span className="text-[13px] text-acc">Activations per day, last 14 days</span>
          </div>
          <Bars data={growth} height={120} />
        </Card>

        <Card title="Commission engine" action={<Link href="/admin/plans">All plans</Link>} className="xl:col-span-4">
          {plan ? (
            <form action={quickRulesAction}>
              <input type="hidden" name="plan_id" value={plan.id} />
              <p className="mb-2 text-[12.5px] text-mute">
                Editing <b className="text-fg">{plan.name}</b> · package {m(plan.price)}
              </p>
              <RuleInput label="Direct pair bonus" name="direct_pair_bonus" value={plan.direct_pair_bonus} unit={cur} />
              <RuleInput label="Indirect pair bonus" name="indirect_pair_bonus" value={plan.indirect_pair_bonus} unit={cur} />
              <RuleInput label="Direct referral bonus" name="direct_referral_bonus" value={plan.direct_referral_bonus} unit={cur} />
              <RuleInput label="Daily pair cap per member" name="daily_cap_pairs" value={plan.daily_cap_pairs} unit="pairs" />
              <RuleInput label="Daily cap amount" name="daily_cap_amount" value={plan.daily_cap_amount} unit={cur} />
              <RuleInput label="Withdrawal fee" name="withdrawal_fee_percent" value={Number(s.withdrawal_fee_percent)} unit="%" step="0.01" />
              <RuleInput label="Min withdrawal" name="withdrawal_min" value={Number(s.withdrawal_min)} unit={cur} />
              <RuleSwitch label="First pair needs own L + R directs" name="first_pair_requires_direct" checked={!!s.first_pair_requires_direct} />
              <RuleSwitch label="Carry forward never expires" name="carry_forever" checked={Number(s.carry_forward_days) === 0} />
              <input type="hidden" name="carry_days" value={Number(s.carry_forward_days) || 30} />
              <RuleSwitch label="Payout normalization (budget lock)" name="normalization_enabled" checked={!!s.normalization_enabled} />
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn btn-acc">Save rules</button>
                <Link href="/admin/settings" className="btn btn-ghost">
                  All settings
                </Link>
              </div>
            </form>
          ) : (
            <Empty>No plan configured.</Empty>
          )}
        </Card>

        <div className="space-y-4 xl:col-span-3">
          <Card title="Payout requests" action={<Link href="/admin/withdrawals">{w!.n} pending</Link>}>
            {payouts.length ? (
              payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 border-b border-line py-2.5 last:border-0">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-medium">
                      {p.name} · <span className="text-mute">{p.method}</span>
                    </div>
                    <div className="num text-[12px] text-mute">{m(p.net)}</div>
                  </div>
                  <form action={withdrawalAction} className="flex shrink-0 gap-1">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="_back" value="/admin" />
                    <button name="do" value="paid" className="btn btn-ok btn-sm">
                      Approve
                    </button>
                    <button name="do" value="rejected" className="btn btn-bad btn-sm">
                      Reject
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <Empty>No pending payouts.</Empty>
            )}
          </Card>
          <Card title="Risk alerts" action={risk!.old_wd + risk!.flushed_today + risk!.blocked || undefined}>
            <div className="space-y-2">
              <div className={`rounded-lg border-l-2 px-3 py-2.5 text-[13px] ${risk!.old_wd ? "border-bad bg-bad/10" : "border-line bg-bg/60"}`}>
                <div className="font-semibold">Payouts waiting 3+ days</div>
                <div className="text-[12px] text-mute">{risk!.old_wd} request(s)</div>
              </div>
              <div className={`rounded-lg border-l-2 px-3 py-2.5 text-[13px] ${risk!.flushed_today ? "border-warn bg-warn/10" : "border-line bg-bg/60"}`}>
                <div className="font-semibold">Members over daily cap today</div>
                <div className="text-[12px] text-mute">{risk!.flushed_today} member(s) · {risk!.blocked} blocked IDs</div>
              </div>
            </div>
          </Card>
          <Card title="E-Pins" action={<Link href="/admin/epins">Generate</Link>}>
            <Row label="Generated" value={num(pins!.total)} />
            <Row label="Used" value={num(pins!.used)} />
            <Row label="Unused" value={num(pins!.unused)} />
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Card title="Pair income paid" action={`${m(f!.direct)} direct · ${m(f!.indirect)} indirect`} className="xl:col-span-4">
          <Bars data={pairDays} height={120} format={m} />
          <h3 className="mb-2 mt-6 text-[15px] font-semibold">Liability monitor</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[13.5px]">
                <span className="text-mute">Payout ratio (commissions ÷ sales)</span>
                <span className={`num font-semibold ${ratio > 70 ? "text-bad" : "text-fg"}`}>{ratio.toFixed(1)}%</span>
              </div>
              <Progress pct={ratio} className="mt-2" tone={ratio > 85 ? "bad" : undefined} />
            </div>
            <div>
              <div className="flex justify-between text-[13.5px]">
                <span className="text-mute">Member wallets vs cash in hand</span>
                <span className={`num font-semibold ${liabRatio > 80 ? "text-bad" : "text-fg"}`}>{liabRatio.toFixed(1)}%</span>
              </div>
              <Progress pct={liabRatio} className="mt-2" tone={liabRatio > 85 ? "bad" : undefined} />
            </div>
            <p className="text-[12px] text-mute">
              Unpaid member wallets {m(mem!.liab)} + pending payouts {m(w!.net)}.
            </p>
          </div>
        </Card>

        <Card title="Dispatch queue" action={<Link href="/admin/orders">Orders</Link>} className="xl:col-span-4">
          {orders.length ? (
            <Table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Product</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="max-w-[120px] truncate">{o.customer_name}</td>
                    <td className="max-w-[150px] truncate text-mute">{o.product_name}</td>
                    <td className="text-right">
                      <Badge>{o.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty>Nothing to dispatch.</Empty>
          )}
          <h3 className="mb-1 mt-6 text-[15px] font-semibold">Rank gifts to deliver</h3>
          {gifts.length ? (
            gifts.map((g) => (
              <div key={g.id} className="flex items-center justify-between border-b border-line py-2.5 text-[13.5px] last:border-0">
                <span>
                  {g.name} · <span className="text-mute">{g.reward_item}</span>
                </span>
                <Badge tone="warn">Pending</Badge>
              </div>
            ))
          ) : (
            <p className="py-2 text-[13px] text-mute">No gifts waiting.</p>
          )}
        </Card>

        <Card title="Admins & roles" action={<Link href="/admin/admins">Manage</Link>} className="xl:col-span-4">
          {admins.map((a) => (
            <div key={a.code} className="flex items-center justify-between border-b border-line py-2.5 text-[13.5px] last:border-0">
              <span className="text-mute">{a.name}</span>
              <Badge tone={a.status === "blocked" ? "bad" : "acc"}>{a.status === "blocked" ? "Removed" : "Full access"}</Badge>
            </div>
          ))}
          <h3 className="mb-1 mt-6 text-[15px] font-semibold">Audit log</h3>
          {logs.map((l, i) => (
            <div key={i} className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-[13px] last:border-0">
              <span className="truncate text-mute">
                {l.action.replace(/[._]/g, " ")}
                {l.details?.code ? ` · ${l.details.code}` : ""}
              </span>
              <span className="num shrink-0 text-[12px] text-mute">{dt(l.created_at).split(", ").pop()}</span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
