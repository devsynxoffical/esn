import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money, dt } from "@/lib/fmt";
import { Card, PageHead, Flash, Table, Badge, Empty, Pager, Stat } from "@/components/ui";
import { withdrawalAction, bulkPayAction } from "@/app/actions/admin";

const PER = 100;

export default async function Withdrawals({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  await requireAdmin();
  const s = await getSettings();
  const cur = s.currency;
  const status = ["pending", "paid", "rejected", "all"].includes(sp.status || "") ? sp.status! : "pending";
  const page = Math.max(1, Number(sp.page) || 1);
  const [rows, t] = await Promise.all([
    q(
      `SELECT w.*, u.code, u.name, u.phone FROM withdrawals w JOIN users u ON u.id = w.user_id
       WHERE ($1 = 'all' OR w.status = $1) ORDER BY w.id ${status === "pending" ? "ASC" : "DESC"} LIMIT $2 OFFSET $3`,
      [status, PER + 1, (page - 1) * PER],
    ),
    one(`SELECT count(*) FILTER (WHERE status='pending')::int AS n, coalesce(sum(amount) FILTER (WHERE status='pending'),0) AS gross,
           coalesce(sum(fee) FILTER (WHERE status='pending'),0) AS fee, coalesce(sum(net) FILTER (WHERE status='pending'),0) AS net
         FROM withdrawals`),
  ]);

  return (
    <>
      <PageHead
        title="Withdrawals"
        sub={`${s.withdrawal_fee_percent}% fee is deducted automatically. Pay the "To pay" amount to the member.`}
        actions={
          <>
            {["pending", "paid", "rejected", "all"].map((x) => (
              <Link key={x} href={`/admin/withdrawals?status=${x}`} className={`btn capitalize ${status === x ? "btn-acc" : "btn-ghost"}`}>
                {x}
              </Link>
            ))}
            <a href={`/admin/withdrawals/export?status=${status}`} className="btn btn-ghost">
              Export CSV
            </a>
          </>
        }
      />
      <Flash sp={sp} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat hero label="Pending requests" value={t!.n} />
        <Stat label="Requested (gross)" value={money(t!.gross, cur)} />
        <Stat label="Fee kept" value={money(t!.fee, cur)} tone="ok" />
        <Stat label="To pay members" value={money(t!.net, cur)} tone="warn" />
      </div>
      <Card className="mt-4">
        {rows.length ? (
          <>
            <form id="bulk" action={bulkPayAction} />
            <Table>
              <thead>
                <tr>
                  {status === "pending" && <th></th>}
                  <th>#</th>
                  <th>Member</th>
                  <th>Method / account</th>
                  <th>Amount</th>
                  <th>Fee</th>
                  <th>To pay</th>
                  <th>Requested</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, PER).map((w) => (
                  <tr key={w.id}>
                    {status === "pending" && (
                      <td>
                        <input type="checkbox" name="ids" value={w.id} form="bulk" className="h-4 w-4 accent-[#f97316]" />
                      </td>
                    )}
                    <td>{w.id}</td>
                    <td>
                      <Link href={`/admin/members/${w.code}`} className="font-semibold hover:text-acc">
                        {w.name}
                      </Link>
                      <div className="text-xs text-mute">
                        {w.code} · {w.phone}
                      </div>
                    </td>
                    <td>
                      <div className="font-semibold">{w.method}</div>
                      <div className="font-mono text-xs">{w.account_number}</div>
                      <div className="text-xs text-mute">
                        {w.account_title}
                        {w.bank_name ? ` · ${w.bank_name}` : ""}
                      </div>
                    </td>
                    <td>{money(w.amount, cur)}</td>
                    <td className="text-ok">{money(w.fee, cur)}</td>
                    <td className="font-bold">{money(w.net, cur)}</td>
                    <td className="whitespace-nowrap text-xs text-mute">{dt(w.created_at)}</td>
                    <td>
                      <Badge>{w.status}</Badge>
                      {w.admin_note && <div className="text-xs text-mute">{w.admin_note}</div>}
                    </td>
                    <td>
                      {w.status === "pending" && (
                        <form action={withdrawalAction} className="flex flex-wrap gap-1">
                          <input type="hidden" name="id" value={w.id} />
                          <input className="inp w-28 py-1 text-xs" name="note" placeholder="Txn ID / note" />
                          <button name="do" value="paid" className="btn btn-ok btn-sm">
                            Paid
                          </button>
                          <button name="do" value="rejected" className="btn btn-bad btn-sm">
                            Reject
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {status === "pending" && (
              <button form="bulk" className="btn btn-acc mt-4">
                Mark selected as paid
              </button>
            )}
          </>
        ) : (
          <Empty>No withdrawals here.</Empty>
        )}
        <Pager page={page} hasMore={rows.length > PER} base={`/admin/withdrawals?status=${status}`} />
      </Card>
    </>
  );
}
