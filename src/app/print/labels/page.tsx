import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/fmt";
import PrintButton from "@/components/PrintButton";

export default async function Labels({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const s = await getSettings();
  const status = ["pending", "dispatched"].includes(sp.status || "") ? sp.status! : "pending";
  const rows = await q("SELECT * FROM orders WHERE status = $1 ORDER BY id LIMIT 300", [status]);
  return (
    <div className="min-h-screen bg-white p-6 text-black">
      <div className="no-print mb-4 flex items-center gap-3">
        <PrintButton label={`Print ${rows.length} labels`} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((o) => (
          <div key={o.id} className="break-inside-avoid rounded border-2 border-dashed border-black p-4 text-sm">
            <div className="flex justify-between font-bold">
              <span>{s.site_name}</span>
              <span>Order #{o.id}</span>
            </div>
            <div className="mt-2 text-base font-bold">{o.customer_name}</div>
            <div>{o.phone}</div>
            <div>
              {o.address}, {o.city}
            </div>
            <div className="mt-2 border-t border-black pt-2">
              {o.product_name} × {o.qty} · {o.kind === "store" ? `COD ${money(o.amount, s.currency)}` : "PAID"}
            </div>
            <div className="text-xs">From: {s.office_address} · {s.support_phone}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
