import { redirect } from "next/navigation";
import { requireActiveMember } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { managerWhere } from "@/lib/ops";
import { money, dt } from "@/lib/fmt";
import { Card, PageHead, Table, Empty, Stat } from "@/components/ui";

export default async function Manager() {
  const me = await requireActiveMember();
  const mgr = await one(
    `SELECT p.monthly_salary FROM users u LEFT JOIN plans p ON p.id = u.plan_id WHERE u.id = $1 AND ${managerWhere}`,
    [me.id],
  );
  if (!mgr) redirect("/dashboard?err=Manager+portal+is+not+unlocked+for+your+ID.");
  const s = await getSettings();
  const cur = s.currency;
  const [rows, totals] = await Promise.all([
    q("SELECT * FROM transactions WHERE user_id = $1 AND type IN ('salary','pool_share') ORDER BY id DESC LIMIT 60", [me.id]),
    one(
      `SELECT coalesce(sum(amount) FILTER (WHERE type='salary'),0) AS salary,
              coalesce(sum(amount) FILTER (WHERE type='pool_share'),0) AS pool
       FROM transactions WHERE user_id = $1`,
      [me.id],
    ),
  ]);
  return (
    <>
      <PageHead title="Executive Manager Portal" sub="Fixed monthly salary and company turnover pool share." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat hero label="Monthly salary" value={money(mgr.monthly_salary, cur)} sub="Credited by the company each month" />
        <Stat label="Salary received" value={money(totals!.salary, cur)} />
        <Stat label="Pool share received" value={money(totals!.pool, cur)} sub={`Pool = ${s.manager_pool_percent}% of monthly collection`} />
      </div>
      <Card title="Payout history" className="mt-4">
        {rows.length ? (
          <Table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Detail</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap text-mute">{dt(t.created_at)}</td>
                  <td>{t.note}</td>
                  <td className="font-bold text-ok">{money(t.amount, cur)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No payouts yet.</Empty>
        )}
      </Card>
    </>
  );
}
