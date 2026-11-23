import { requireAdmin } from "@/lib/auth";
import { q, one, pool } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { todayIn } from "@/lib/engine";
import { money, dt } from "@/lib/fmt";
import { Card, PageHead, Flash, Table, Empty, Stat } from "@/components/ui";
import { runClosingAction } from "@/app/actions/admin";

export default async function Closings({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const s = await getSettings();
  const cur = s.currency;
  const day = await todayIn(pool(), s.closing_timezone);
  const [rows, today, top] = await Promise.all([
    q("SELECT * FROM closings ORDER BY day DESC LIMIT 60"),
    one(
      `SELECT count(*)::int AS n, coalesce(sum(amount),0) AS amt, count(DISTINCT user_id)::int AS users
       FROM pairs WHERE status = 'pending' AND day = $1`,
      [day],
    ),
    q(
      `SELECT u.code, u.name, count(*)::int AS n, p2.daily_cap_pairs FROM pairs p JOIN users u ON u.id = p.user_id
       JOIN plans p2 ON p2.id = u.plan_id WHERE p.status = 'pending' AND p.day = $1
       GROUP BY u.code, u.name, p2.daily_cap_pairs ORDER BY n DESC LIMIT 10`,
      [day],
    ),
  ]);

  return (
    <>
      <PageHead
        title="Daily Closing (Cut-off)"
        sub={`Every night at 12:00 AM (${s.closing_timezone}) the system pays pairs up to each member's daily cap and flushes the rest. Mode: ${s.pair_credit_mode === "closing" ? "credit at closing" : "instant credit"}.`}
        actions={
          <form action={runClosingAction}>
            <button className="btn btn-acc">Run due closings now</button>
          </form>
        }
      />
      <Flash sp={sp} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat hero label={`Today (${day}) pending pairs`} value={today!.n} sub={`${today!.users} members`} />
        <Stat label="Pending value (before cap)" value={money(today!.amt, cur)} tone="warn" />
        <Stat label="Normalization" value={s.normalization_enabled ? `ON · ${s.normalization_percent}%` : "OFF"} />
      </div>
      {top.length > 0 && (
        <Card title="Top earners today (pending)" className="mt-4">
          <Table>
            <tbody>
              {top.map((t) => (
                <tr key={t.code}>
                  <td>
                    {t.name} <span className="text-xs text-mute">({t.code})</span>
                  </td>
                  <td>{t.n} pairs</td>
                  <td className={t.daily_cap_pairs > 0 && t.n > t.daily_cap_pairs ? "text-bad" : "text-mute"}>
                    {t.daily_cap_pairs > 0 && t.n > t.daily_cap_pairs ? `${t.n - t.daily_cap_pairs} will flush` : "within cap"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
      <Card title="Closing history" className="mt-4">
        {rows.length ? (
          <Table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Members paid</th>
                <th>Pairs paid</th>
                <th>Pairs flushed</th>
                <th>Amount paid</th>
                <th>Flush-out profit</th>
                <th>Factor</th>
                <th>Carry expired</th>
                <th>Run at</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold">{c.day}</td>
                  <td>{c.users_paid}</td>
                  <td>{c.pairs_paid}</td>
                  <td className="text-bad">{c.pairs_flushed}</td>
                  <td>{money(c.amount_paid, cur)}</td>
                  <td className="text-ok">{money(c.amount_flushed, cur)}</td>
                  <td>{Number(c.normalization_factor).toFixed(3)}</td>
                  <td>{c.carry_expired}</td>
                  <td className="whitespace-nowrap text-mute">{dt(c.run_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No closings yet.</Empty>
        )}
      </Card>
    </>
  );
}
