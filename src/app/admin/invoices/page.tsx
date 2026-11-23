import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money, dt } from "@/lib/fmt";
import { Card, PageHead, Table, Empty, Pager } from "@/components/ui";

const PER = 100;

export default async function Invoices({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const s = await getSettings();
  const page = Math.max(1, Number(sp.page) || 1);
  const term = (sp.q || "").trim();
  const rows = await q(
    `SELECT i.*, u.code, u.name FROM invoices i JOIN users u ON u.id = i.user_id
     WHERE ($1 = '' OR i.number ILIKE '%' || $1 || '%' OR u.code ILIKE '%' || $1 || '%' OR u.name ILIKE '%' || $1 || '%')
     ORDER BY i.id DESC LIMIT $2 OFFSET $3`,
    [term, PER + 1, (page - 1) * PER],
  );
  return (
    <>
      <PageHead title="Invoices (Product Sale Receipts)" sub="One receipt is generated automatically on every paid activation." />
      <Card>
        <form className="mb-4 flex gap-2">
          <input className="inp max-w-xs" name="q" defaultValue={term} placeholder="Invoice no., member ID or name" />
          <button className="btn btn-acc">Search</button>
        </form>
        {rows.length ? (
          <Table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Member</th>
                <th>Product</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, PER).map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link className="font-mono text-acc" href={`/invoice/${i.number}`} target="_blank">
                      {i.number}
                    </Link>
                  </td>
                  <td>
                    {i.name} <span className="text-xs text-mute">({i.code})</span>
                  </td>
                  <td>{i.product_name}</td>
                  <td className="text-mute">{i.plan_name}</td>
                  <td>{money(i.amount, s.currency)}</td>
                  <td className="whitespace-nowrap text-mute">{dt(i.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No invoices yet.</Empty>
        )}
        <Pager page={page} hasMore={rows.length > PER} base={`/admin/invoices?q=${encodeURIComponent(term)}`} />
      </Card>
    </>
  );
}
