import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money, dt } from "@/lib/fmt";
import { Card, PageHead, Table, Badge, Empty } from "@/components/ui";

export default async function Orders() {
  const me = await requireMember();
  const s = await getSettings();
  const rows = await q(
    `SELECT o.*, i.number AS invoice FROM orders o LEFT JOIN invoices i ON i.order_id = o.id
     WHERE o.user_id = $1 ORDER BY o.id DESC`,
    [me.id],
  );
  return (
    <>
      <PageHead title="Orders & Invoices" sub="Your product orders, dispatch status and sale receipts." />
      <Card>
        {rows.length ? (
          <Table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Product</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Courier / Tracking</th>
                <th>Invoice</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{o.product_name}</td>
                  <td>{money(o.amount, s.currency)}</td>
                  <td>
                    <Badge>{o.status}</Badge>
                  </td>
                  <td className="text-mute">{[o.courier, o.tracking_id].filter(Boolean).join(" · ") || "—"}</td>
                  <td>
                    {o.invoice ? (
                      <Link className="text-acc" href={`/invoice/${o.invoice}`} target="_blank">
                        {o.invoice}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap text-mute">{dt(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No orders yet. Your product order is created when your ID is activated.</Empty>
        )}
      </Card>
    </>
  );
}
