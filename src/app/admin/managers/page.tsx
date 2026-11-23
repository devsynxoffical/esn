import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { managerWhere, distributorWhere } from "@/lib/ops";
import { money, dt } from "@/lib/fmt";
import { Card, PageHead, Flash, Table, Empty, Stat } from "@/components/ui";
import { managerRunAction } from "@/app/actions/admin";

export default async function Managers({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const s = await getSettings();
  const cur = s.currency;
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const [managers, distributors, runs, col] = await Promise.all([
    q(`SELECT u.code, u.name, u.phone, p.name AS plan, p.monthly_salary FROM users u LEFT JOIN plans p ON p.id = u.plan_id WHERE ${managerWhere} ORDER BY u.id`),
    one(`SELECT count(*)::int AS n FROM users u LEFT JOIN plans p ON p.id = u.plan_id WHERE u.status='active' AND ${distributorWhere}`),
    q("SELECT r.*, u.name AS by_name FROM manager_runs r LEFT JOIN users u ON u.id = r.created_by ORDER BY r.id DESC LIMIT 50"),
    one(`SELECT coalesce(sum(amount),0) AS amt FROM activations WHERE to_char(day,'YYYY-MM') = $1`, [lastMonth]),
  ]);
  const pool = (col!.amt * Number(s.manager_pool_percent)) / 100;

  return (
    <>
      <PageHead
        title="Managers Payroll"
        sub="Managers = Manager plan, rank that unlocks Manager, or manual unlock on the member page. Salary amount is set on the plan."
      />
      <Flash sp={sp} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat hero label="Qualified managers" value={managers.length} />
        <Stat label="Active distributors" value={distributors!.n} />
        <Stat label={`Collection ${lastMonth}`} value={money(col!.amt, cur)} />
        <Stat label={`Pool (${s.manager_pool_percent}%)`} value={money(pool, cur)} sub={managers.length ? `${money(pool / managers.length, cur)} each` : ""} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Pay monthly salary">
          <form action={managerRunAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="kind" value="salary" />
            <label className="block">
              <span className="lbl">Month (YYYY-MM)</span>
              <input className="inp" name="month" defaultValue={lastMonth} pattern="\d{4}-\d{2}" required />
            </label>
            <button className="btn btn-acc">Pay salaries</button>
          </form>
        </Card>
        <Card title="Distribute turnover pool">
          <form action={managerRunAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="kind" value="pool" />
            <label className="block">
              <span className="lbl">Month (YYYY-MM)</span>
              <input className="inp" name="month" defaultValue={lastMonth} pattern="\d{4}-\d{2}" required />
            </label>
            <button className="btn btn-acc">Distribute pool</button>
          </form>
        </Card>
      </div>
      <Card title="Managers" className="mt-4">
        {managers.length ? (
          <Table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Plan</th>
                <th>Monthly salary</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((m) => (
                <tr key={m.code}>
                  <td>
                    <Link href={`/admin/members/${m.code}`} className="font-mono text-acc">
                      {m.code}
                    </Link>
                  </td>
                  <td>{m.name}</td>
                  <td>{m.plan}</td>
                  <td>{money(m.monthly_salary, cur)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No managers yet.</Empty>
        )}
      </Card>
      <Card title="Payout runs" className="mt-4">
        {runs.length ? (
          <Table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Month</th>
                <th>Recipients</th>
                <th>Total</th>
                <th>By</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="capitalize">{r.kind}</td>
                  <td>{r.month}</td>
                  <td>{r.recipients}</td>
                  <td>{money(r.total, cur)}</td>
                  <td>{r.by_name}</td>
                  <td className="text-mute">{dt(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No runs yet.</Empty>
        )}
      </Card>
    </>
  );
}
