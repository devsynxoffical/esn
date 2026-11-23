import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { q, one, pool } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { todayIn } from "@/lib/engine";
import { money, num, dt } from "@/lib/fmt";
import { Card, Stat, Flash, Table, Badge, Empty } from "@/components/ui";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const s = await getSettings();
  const cur = s.currency;
  const day = await todayIn(pool(), s.closing_timezone);

  const [m, f, cl, w, today, joins, recentW, recentA] = await Promise.all([
    one(`SELECT count(*)::int AS total,
           count(*) FILTER (WHERE status='active')::int AS active,
           count(*) FILTER (WHERE status='inactive')::int AS inactive,
           count(*) FILTER (WHERE status='blocked')::int AS blocked,
           coalesce(sum(earning_balance),0) AS earning_liab, coalesce(sum(epin_balance),0) AS epin_liab
         FROM users WHERE role='member' AND NOT is_company`),
    one(`SELECT
           coalesce(sum(amount) FILTER (WHERE type='direct_pair'),0) AS direct,
           coalesce(sum(amount) FILTER (WHERE type='pair_bonus'),0) AS indirect,
           coalesce(sum(amount) FILTER (WHERE type='direct_referral'),0) AS referral,
           coalesce(sum(amount) FILTER (WHERE type='rank_reward'),0) AS rank,
           coalesce(sum(amount) FILTER (WHERE type='salary'),0) AS salary,
           coalesce(sum(amount) FILTER (WHERE type='pool_share'),0) AS pool,
           coalesce(sum(amount) FILTER (WHERE type='admin_fund'),0) AS funds
         FROM transactions`),
    one(`SELECT
           coalesce(sum(amount) FILTER (WHERE kind='flush'),0) AS flush,
           coalesce(sum(amount) FILTER (WHERE kind='withdrawal_fee'),0) AS wfee,
           coalesce(sum(amount) FILTER (WHERE kind='platform_fee'),0) AS pfee,
           coalesce(sum(amount) FILTER (WHERE kind='conversion_fee'),0) AS cfee,
           coalesce(sum(amount) FILTER (WHERE kind='normalization'),0) AS norm
         FROM company_ledger`),
    one(`SELECT
           coalesce(sum(amount) FILTER (WHERE status='paid'),0) AS paid_gross,
           coalesce(sum(net) FILTER (WHERE status='paid'),0) AS paid_net,
           count(*) FILTER (WHERE status='pending')::int AS pending_n,
           coalesce(sum(net) FILTER (WHERE status='pending'),0) AS pending_net
         FROM withdrawals`),
    one(
      `SELECT
         (SELECT count(*)::int FROM activations WHERE day=$1 AND method <> 'company') AS joins,
         (SELECT coalesce(sum(amount),0) FROM activations WHERE day=$1) AS sales,
         (SELECT count(*)::int FROM pairs WHERE day=$1 AND status='pending') AS pending_pairs,
         (SELECT coalesce(sum(amount),0) FROM pairs WHERE day=$1 AND status='pending') AS pending_amt,
         (SELECT count(*)::int FROM users WHERE created_at::date = $1::date AND role='member') AS registrations`,
      [day],
    ),
    q(`SELECT d::date::text AS day, (SELECT count(*)::int FROM activations a WHERE a.day = d::date AND a.method <> 'company') AS n
       FROM generate_series((now() AT TIME ZONE 'Asia/Karachi')::date - 13, (now() AT TIME ZONE 'Asia/Karachi')::date, '1 day') d`),
    q(`SELECT w.*, u.code, u.name FROM withdrawals w JOIN users u ON u.id=w.user_id WHERE w.status='pending' ORDER BY w.id LIMIT 6`),
    q(`SELECT a.*, u.code, u.name, p.name AS plan FROM activations a JOIN users u ON u.id=a.user_id JOIN plans p ON p.id=a.plan_id
       WHERE a.method <> 'company' ORDER BY a.id DESC LIMIT 6`),
  ]);
  const sales = await one(`SELECT coalesce(sum(amount),0) AS total,
     coalesce(sum(amount) FILTER (WHERE cash_in),0) AS cash FROM activations`);

  const commissions = f!.direct + f!.indirect + f!.referral + f!.rank + f!.salary + f!.pool;
  const deposits = sales!.cash + f!.funds;
  const net = sales!.total - commissions + cl!.wfee + cl!.pfee + cl!.cfee;
  const maxJ = Math.max(1, ...joins.map((j) => j.n));

  return (
    <>
      <Flash sp={sp} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat hero label="Total deposit (cash in)" value={money(deposits, cur)} sub={`Sales value ${money(sales!.total, cur)}`} />
        <Stat label="Direct pair paid" value={money(f!.direct, cur)} sub={`Referral bonus ${money(f!.referral, cur)}`} />
        <Stat label="Indirect pair paid" value={money(f!.indirect, cur)} sub={`Rank cash ${money(f!.rank, cur)}`} />
        <Stat label="Flush-out profit" value={money(cl!.flush, cur)} tone="ok" sub="Pairs over daily cap" />
        <Stat label={`${s.withdrawal_fee_percent}% fee collection`} value={money(cl!.wfee, cur)} tone="ok" sub={`Platform fees ${money(cl!.pfee, cur)}`} />
        <Stat
          label="Net profit"
          value={money(net, cur)}
          tone={net >= 0 ? "ok" : "bad"}
          sub={`Payout ratio ${sales!.total > 0 ? ((commissions / sales!.total) * 100).toFixed(1) : "0"}%`}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Active members" value={`${num(m!.active)} / ${num(m!.total)}`} sub={`${m!.inactive} inactive · ${m!.blocked} blocked`} />
        <Stat label="Today joined" value={num(today!.joins)} sub={`Sales today ${money(today!.sales, cur)}`} />
        <Stat label="Today pending pairs" value={num(today!.pending_pairs)} sub={`${money(today!.pending_amt, cur)} before cap`} tone="warn" />
        <Stat label="Pending withdrawals" value={num(w!.pending_n)} sub={`To pay ${money(w!.pending_net, cur)}`} tone="warn" />
        <Stat label="Withdrawals paid" value={money(w!.paid_net, cur)} sub={`Gross ${money(w!.paid_gross, cur)}`} />
        <Stat label="Member wallets (liability)" value={money(m!.earning_liab, cur)} sub={`E-Pin wallets ${money(m!.epin_liab, cur)}`} tone="warn" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Activations — last 14 days" className="lg:col-span-2">
          <div className="flex h-40 items-end gap-1.5">
            {joins.map((j, i) => (
              <div key={j.day} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-mute">{j.n || ""}</span>
                <div
                  className={`w-full rounded-t ${i % 2 ? "bg-acc2" : "bg-acc"}`}
                  style={{ height: `${Math.max(2, (j.n / maxJ) * 120)}px` }}
                  title={`${j.day}: ${j.n}`}
                />
                <span className="text-[9px] text-mute">{j.day.slice(8)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Profit breakdown">
          <ul className="space-y-2 text-sm">
            {[
              ["Total sales value", sales!.total, ""],
              ["− Direct pair bonus", -f!.direct, "text-bad"],
              ["− Indirect pair bonus", -f!.indirect, "text-bad"],
              ["− Referral bonus", -f!.referral, "text-bad"],
              ["− Rank cash rewards", -f!.rank, "text-bad"],
              ["− Manager salary & pool", -(f!.salary + f!.pool), "text-bad"],
              ["+ Withdrawal fees", cl!.wfee, "text-ok"],
              ["+ Platform & conversion fees", cl!.pfee + cl!.cfee, "text-ok"],
            ].map(([l, v, c]) => (
              <li key={l as string} className="flex justify-between">
                <span className="text-mute">{l}</span>
                <b className={c as string}>{money(v as number, cur)}</b>
              </li>
            ))}
            <li className="flex justify-between border-t border-line pt-2">
              <span className="font-bold">Net profit</span>
              <b className={net >= 0 ? "text-ok" : "text-bad"}>{money(net, cur)}</b>
            </li>
            <li className="text-[11px] text-mute">
              Flush-out ({money(cl!.flush, cur)}) and normalization ({money(cl!.norm, cur)}) are income that was never paid out.
              Gift rewards are not included.
            </li>
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Pending withdrawals" action={<Link href="/admin/withdrawals">Open queue</Link>}>
          {recentW.length ? (
            <Table>
              <tbody>
                {recentW.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <div className="font-semibold">{x.name}</div>
                      <div className="text-xs text-mute">
                        {x.code} · {x.method}
                      </div>
                    </td>
                    <td className="text-right font-bold">{money(x.net, cur)}</td>
                    <td className="text-right text-mute">{dt(x.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty>No pending withdrawals.</Empty>
          )}
        </Card>
        <Card title="Latest activations" action={<Link href="/admin/invoices">Invoices</Link>}>
          {recentA.length ? (
            <Table>
              <tbody>
                {recentA.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <Link href={`/admin/members/${x.code}`} className="font-semibold hover:text-acc">
                        {x.name}
                      </Link>
                      <div className="text-xs text-mute">
                        {x.code} · {x.plan}
                      </div>
                    </td>
                    <td>
                      <Badge tone={x.cash_in ? "ok" : "mute"}>{x.method}</Badge>
                    </td>
                    <td className="text-right font-bold">{money(x.amount, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty>No activations yet.</Empty>
          )}
        </Card>
      </div>
    </>
  );
}
