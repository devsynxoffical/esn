import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money, dt } from "@/lib/fmt";
import PrintButton from "@/components/PrintButton";

export const metadata = { title: "Invoice" };

export default async function Invoice({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const me = await currentUser();
  if (!me) notFound();
  const inv = await one(
    `SELECT i.*, u.code, u.name, u.phone, u.cnic, u.address, u.city, o.status AS order_status, o.tracking_id, o.courier
     FROM invoices i JOIN users u ON u.id = i.user_id LEFT JOIN orders o ON o.id = i.order_id WHERE i.number = $1`,
    [number],
  );
  if (!inv || (me.role !== "admin" && inv.user_id !== me.id)) notFound();
  const s = await getSettings();

  return (
    <div className="min-h-screen bg-white py-8 text-neutral-900 print:py-0">
      <div className="mx-auto max-w-2xl rounded-xl border border-neutral-200 p-8 print:border-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-black text-orange-600">{s.site_name}</div>
            <div className="mt-1 whitespace-pre-line text-sm text-neutral-600">{s.office_address}</div>
            <div className="text-sm text-neutral-600">
              {s.support_phone} · {s.site_domain}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black">SALES RECEIPT</div>
            <div className="text-sm">{inv.number}</div>
            <div className="text-sm text-neutral-600">{dt(inv.created_at)}</div>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-bold">Billed to</div>
            <div>
              {inv.name} ({inv.code})
            </div>
            <div>{inv.phone}</div>
            {inv.cnic && <div>CNIC: {inv.cnic}</div>}
            <div>{[inv.address, inv.city].filter(Boolean).join(", ")}</div>
          </div>
          <div className="text-right">
            <div className="font-bold">Delivery</div>
            <div className="capitalize">{inv.order_status ?? "pending"}</div>
            {inv.tracking_id && (
              <div>
                {inv.courier} {inv.tracking_id}
              </div>
            )}
          </div>
        </div>
        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-left">
              <th className="py-2">Item</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-neutral-200">
              <td className="py-3">
                <div className="font-semibold">{inv.product_name}</div>
                <div className="text-xs text-neutral-500">Includes business account ({inv.plan_name}) & training access</div>
              </td>
              <td className="py-3 text-center">1</td>
              <td className="py-3 text-right">{money(inv.amount, s.currency)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="py-3 text-right font-bold">
                Total paid
              </td>
              <td className="py-3 text-right text-lg font-black">{money(inv.amount, s.currency)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="mt-8 text-xs text-neutral-500">
          This is a computer-generated receipt for the sale of a physical product. Thank you for shopping with {s.site_name}.
        </p>
        <div className="mt-6 text-center">
          <PrintButton label="Print / Save PDF" />
        </div>
      </div>
    </div>
  );
}
