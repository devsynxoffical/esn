import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money, dt } from "@/lib/fmt";
import { Card, PageHead, Flash, Table, Badge, Empty, Pager } from "@/components/ui";
import { orderUpdateAction } from "@/app/actions/admin";

const PER = 100;

export default async function Orders({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; status?: string; kind?: string; page?: string }>;
}) {
  const sp = await searchParams;
  await requireAdmin();
  const s = await getSettings();
  const status = ["pending", "dispatched", "delivered", "cancelled", "all"].includes(sp.status || "") ? sp.status! : "pending";
  const kind = ["package", "store"].includes(sp.kind || "") ? sp.kind! : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const rows = await q(
    `SELECT o.*, u.code, v.brand_name, i.number AS invoice FROM orders o LEFT JOIN users u ON u.id = o.user_id
     LEFT JOIN users v ON v.id = o.vendor_id LEFT JOIN invoices i ON i.order_id = o.id
     WHERE ($1 = 'all' OR o.status = $1) AND ($2 = '' OR o.kind = $2)
     ORDER BY o.id ${status === "pending" ? "ASC" : "DESC"} LIMIT $3 OFFSET $4`,
    [status, kind, PER + 1, (page - 1) * PER],
  );
  const base = `/admin/orders?status=${status}&kind=${kind}`;

  return (
    <>
      <PageHead
        title="Orders & Dispatch"
        sub="Starter package products (Watch / Handsfree) and store orders. Mark delivered to settle distributor profit."
        actions={
          <>
            {["pending", "dispatched", "delivered", "cancelled", "all"].map((x) => (
              <Link key={x} href={`/admin/orders?status=${x}&kind=${kind}`} className={`btn capitalize ${status === x ? "btn-acc" : "btn-ghost"}`}>
                {x}
              </Link>
            ))}
            <Link href={`/print/labels?status=${status}`} target="_blank" className="btn btn-ghost">
              Print labels
            </Link>
          </>
        }
      />
      <Flash sp={sp} />
      <Card>
        <div className="mb-3 flex flex-wrap gap-2 text-sm">
          {[
            ["", "All types"],
            ["package", "Package products"],
            ["store", "Store orders"],
          ].map(([k, l]) => (
            <Link key={k} href={`/admin/orders?status=${status}&kind=${k}`} className={`btn btn-sm ${kind === k ? "btn-acc" : "btn-ghost"}`}>
              {l}
            </Link>
          ))}
        </div>
        {rows.length ? (
          <Table>
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Amount</th>
                <th>Address</th>
                <th>Status</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, PER).map((o) => (
                <tr key={o.id}>
                  <td>
                    {o.id}
                    <div className="text-[10px] uppercase text-mute">{o.kind}</div>
                  </td>
                  <td>
                    <div className="font-semibold">{o.customer_name}</div>
                    <div className="text-xs text-mute">
                      {o.phone} {o.code ? `· ${o.code}` : ""}
                    </div>
                  </td>
                  <td>
                    {o.product_name} {o.qty > 1 && `× ${o.qty}`}
                    {o.brand_name && <div className="text-xs text-mute">by {o.brand_name}</div>}
                    {o.invoice && (
                      <Link href={`/invoice/${o.invoice}`} target="_blank" className="block text-xs text-acc">
                        {o.invoice}
                      </Link>
                    )}
                  </td>
                  <td>{money(o.amount, s.currency)}</td>
                  <td className="max-w-[200px] text-xs text-mute">
                    {o.address}, {o.city}
                  </td>
                  <td>
                    <Badge>{o.status}</Badge>
                    <div className="text-[10px] text-mute">{dt(o.updated_at)}</div>
                  </td>
                  <td>
                    <form action={orderUpdateAction} className="flex flex-wrap gap-1">
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="_back" value={base} />
                      <select className="inp w-28 py-1 text-xs" name="status" defaultValue={o.status}>
                        <option value="pending">Pending</option>
                        <option value="dispatched">Dispatched</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <input className="inp w-24 py-1 text-xs" name="courier" placeholder="Courier" defaultValue={o.courier ?? ""} />
                      <input className="inp w-28 py-1 text-xs" name="tracking_id" placeholder="Tracking ID" defaultValue={o.tracking_id ?? ""} />
                      <button className="btn btn-acc btn-sm">Save</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No orders here.</Empty>
        )}
        <Pager page={page} hasMore={rows.length > PER} base={base} />
      </Card>
    </>
  );
}
