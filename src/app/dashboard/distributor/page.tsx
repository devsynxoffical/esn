import { redirect } from "next/navigation";
import { requireActiveMember } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { distributorWhere } from "@/lib/ops";
import { money, dt } from "@/lib/fmt";
import { Card, PageHead, Flash, Table, Badge, Empty, Stat } from "@/components/ui";
import { brandAction, vendorProductAction, vendorProductDeleteAction } from "@/app/actions/member";

export default async function Distributor({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const me = await requireActiveMember();
  const ok = await one(`SELECT 1 FROM users u LEFT JOIN plans p ON p.id = u.plan_id WHERE u.id = $1 AND ${distributorWhere}`, [me.id]);
  if (!ok) redirect("/dashboard?err=Distributor+portal+is+not+unlocked+for+your+ID.");
  const s = await getSettings();
  const cur = s.currency;
  const [products, orders, totals] = await Promise.all([
    q("SELECT * FROM products WHERE vendor_id = $1 AND active ORDER BY id DESC", [me.id]),
    q("SELECT * FROM orders WHERE vendor_id = $1 ORDER BY id DESC LIMIT 50", [me.id]),
    one(
      `SELECT count(*)::int AS n, coalesce(sum(amount) FILTER (WHERE status='delivered'),0) AS sales,
              coalesce(sum(vendor_profit),0) AS profit FROM orders WHERE vendor_id = $1`,
      [me.id],
    ),
  ]);

  return (
    <>
      <PageHead
        title="Distributor Portal"
        sub={`List your own brand products on the company store. Platform fee: ${s.distributor_platform_fee_percent}% per sale.`}
      />
      <Flash sp={sp} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat hero label="Your profit (credited)" value={money(totals!.profit, cur)} />
        <Stat label="Delivered sales" value={money(totals!.sales, cur)} />
        <Stat label="Orders" value={totals!.n} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="My brand">
          <form action={brandAction} className="space-y-3">
            {me.brand_logo_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={me.brand_logo_url} alt="logo" className="h-16 w-16 rounded-lg border border-line object-cover" />
            )}
            <label className="block">
              <span className="lbl">Brand name</span>
              <input className="inp" name="brand_name" defaultValue={me.brand_name ?? ""} required />
            </label>
            <label className="block">
              <span className="lbl">About the brand</span>
              <textarea className="inp" name="brand_description" rows={2} defaultValue={me.brand_description ?? ""} />
            </label>
            <label className="block">
              <span className="lbl">Logo (image, max 5 MB)</span>
              <input className="inp" type="file" name="logo" accept="image/*" />
            </label>
            <button className="btn btn-acc w-full">Save brand</button>
          </form>
        </Card>
        <Card title="Add a product (needs admin approval)">
          <form action={vendorProductAction} className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="lbl">Product name</span>
              <input className="inp" name="name" required />
            </label>
            <label className="block">
              <span className="lbl">Category</span>
              <select className="inp" name="category">
                {["Cosmetics", "Clothing", "Herbal", "Electronics", "Accessories", "Home", "General"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="lbl">Price</span>
              <input className="inp" name="price" type="number" min={1} step="0.01" required />
            </label>
            <label className="block sm:col-span-2">
              <span className="lbl">Description</span>
              <textarea className="inp" name="description" rows={2} />
            </label>
            <label className="block sm:col-span-2">
              <span className="lbl">Specifications (one per line)</span>
              <textarea className="inp" name="specs" rows={3} />
            </label>
            <label className="block sm:col-span-2">
              <span className="lbl">Product image</span>
              <input className="inp" type="file" name="image" accept="image/*" />
            </label>
            <button className="btn btn-acc sm:col-span-2">Submit product</button>
          </form>
        </Card>
      </div>
      <Card title="My products" className="mt-4">
        {products.length ? (
          <Table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Status</th>
                <th>Admin note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{money(p.price, cur)}</td>
                  <td>
                    <Badge>{p.status}</Badge>
                  </td>
                  <td className="text-mute">{p.admin_note ?? ""}</td>
                  <td>
                    <form action={vendorProductDeleteAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="btn btn-bad btn-sm">Remove</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No products yet.</Empty>
        )}
      </Card>
      <Card title="Orders for my products" className="mt-4">
        {orders.length ? (
          <Table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Amount</th>
                <th>City</th>
                <th>Status</th>
                <th>My profit</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.product_name}</td>
                  <td>{o.qty}</td>
                  <td>{money(o.amount, cur)}</td>
                  <td>{o.city}</td>
                  <td>
                    <Badge>{o.status}</Badge>
                  </td>
                  <td className="text-ok">{o.settled ? money(o.vendor_profit, cur) : "—"}</td>
                  <td className="whitespace-nowrap text-mute">{dt(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No orders yet.</Empty>
        )}
      </Card>
    </>
  );
}
