import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { DEMO_PASSWORD, DEMO_EMAIL_DOMAIN } from "@/lib/demo";
import { money } from "@/lib/fmt";
import { Card, PageHead, Flash, Table, Badge, Empty } from "@/components/ui";
import { generateDemoAction, resetDataAction } from "@/app/actions/admin";

export const maxDuration = 300;

export default async function Tools({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const demo = await q(
    `SELECT u.code, u.name, u.phone, u.status, u.left_count, u.right_count, u.earning_balance
     FROM users u WHERE u.email LIKE $1 ORDER BY u.total_earned DESC, u.id LIMIT 12`,
    [`%@${DEMO_EMAIL_DOMAIN}`],
  );
  return (
    <>
      <PageHead title="Testing Tools" sub="Fill the system with realistic demo data to test every screen, then reset before going live." />
      <Flash sp={sp} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Generate demo data">
          <p className="mb-4 text-[13.5px] text-mute">
            Creates members spread over the last 14 days (placed with spillover), runs the daily closings with capping and
            flush-out, rank rewards, withdrawals (paid and pending), dispatch orders, E-Pins and fund transfers.
          </p>
          <form action={generateDemoAction} className="flex flex-wrap items-end gap-3">
            <label className="block w-40">
              <span className="lbl">Number of members</span>
              <input className="inp" name="count" type="number" min={5} max={200} defaultValue={100} />
            </label>
            <button className="btn btn-acc">Generate demo data</button>
          </form>
          <p className="mt-3 text-[12.5px] text-mute">Takes 10–60 seconds. You can run it more than once.</p>
        </Card>
        <Card title="Reset all member data">
          <p className="mb-4 text-[13.5px] text-mute">
            Deletes <b className="text-fg">all</b> members, wallets, pairs, E-Pins, orders, invoices and withdrawals, and recreates
            the company top ID. Settings, plans, ranks, company products, training and admin logins are kept.{" "}
            <b className="text-bad">This cannot be undone.</b>
          </p>
          <form action={resetDataAction} className="flex flex-wrap items-end gap-3">
            <label className="block w-48">
              <span className="lbl">Type RESET to confirm</span>
              <input className="inp" name="confirm" autoComplete="off" placeholder="RESET" required />
            </label>
            <button className="btn btn-bad">Delete member data</button>
          </form>
        </Card>
      </div>
      <Card title="Demo member logins" action={<Link href="/admin/members">All members</Link>} className="mt-4">
        <p className="mb-3 text-[13.5px] text-mute">
          Every demo member uses the password <b className="font-mono text-fg">{DEMO_PASSWORD}</b>. Log in at /login with the
          member ID or mobile number.
        </p>
        {demo.length ? (
          <Table>
            <thead>
              <tr>
                <th>Member ID</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>L / R</th>
                <th>Wallet</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {demo.map((d) => (
                <tr key={d.code}>
                  <td className="font-mono text-[12.5px]">{d.code}</td>
                  <td>{d.name}</td>
                  <td className="font-mono text-[12.5px]">{d.phone}</td>
                  <td className="num">
                    {d.left_count} / {d.right_count}
                  </td>
                  <td className="num">{money(d.earning_balance)}</td>
                  <td className="text-right">
                    <Badge>{d.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No demo members yet. Generate demo data above.</Empty>
        )}
      </Card>
    </>
  );
}
