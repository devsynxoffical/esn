import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { q, type Row } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money, dt } from "@/lib/fmt";
import { Card, PageHead, Flash, Check, Badge, Table, Empty } from "@/components/ui";
import { saveProductAction, reviewProductAction } from "@/app/actions/admin";

function ProductForm({ p }: { p?: Row }) {
  return (
    <form action={saveProductAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="id" value={p?.id ?? 0} />
      <input type="hidden" name="_back" value="/admin/products" />
      <label className="block sm:col-span-2">
        <span className="lbl">Name</span>
        <input className="inp" name="name" defaultValue={p?.name ?? ""} required />
      </label>
      <label className="block">
        <span className="lbl">Category</span>
        <input className="inp" name="category" defaultValue={p?.category ?? "Handsfree"} />
      </label>
      <label className="block">
        <span className="lbl">Price</span>
        <input className="inp" name="price" type="number" step="0.01" min={0} defaultValue={p?.price ?? 900} required />
      </label>
      <label className="block sm:col-span-2">
        <span className="lbl">Description</span>
        <textarea className="inp" name="description" rows={3} defaultValue={p?.description ?? ""} />
      </label>
      <label className="block sm:col-span-2">
        <span className="lbl">Specifications (one per line)</span>
        <textarea className="inp" name="specs" rows={3} defaultValue={p?.specs ?? ""} />
      </label>
      <label className="block sm:col-span-2">
        <span className="lbl">Image URL</span>
        <input className="inp" name="image_url" defaultValue={p?.image_url ?? ""} placeholder="/products/watch.webp or https://..." />
      </label>
      <label className="block">
        <span className="lbl">…or upload image</span>
        <input className="inp" type="file" name="image" accept="image/*" />
      </label>
      <label className="block">
        <span className="lbl">URL slug</span>
        <input className="inp" name="slug" defaultValue={p?.slug ?? ""} placeholder="auto from name" />
      </label>
      <label className="block">
        <span className="lbl">Order</span>
        <input className="inp" name="sort" type="number" defaultValue={p?.sort ?? 0} />
      </label>
      <div className="flex flex-col justify-end gap-2 sm:col-span-2">
        <Check name="is_package" label="Joining product (Handsfree/Watch choice at registration)" defaultChecked={p ? p.is_package : true} />
        <Check name="active" label="Visible in store" defaultChecked={p ? p.active : true} />
      </div>
      <button className="btn btn-acc">{p ? "Save product" : "Add product"}</button>
    </form>
  );
}

export default async function Products({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; tab?: string; edit?: string }>;
}) {
  const sp = await searchParams;
  await requireAdmin();
  const s = await getSettings();
  const tab = sp.tab === "vendor" ? "vendor" : "company";
  const company = await q("SELECT * FROM products WHERE vendor_id IS NULL ORDER BY sort, id");
  const vendor = await q(
    `SELECT p.*, u.code, u.brand_name FROM products p JOIN users u ON u.id = p.vendor_id
     ORDER BY (p.status = 'pending') DESC, p.id DESC LIMIT 200`,
  );
  const editing = company.find((p) => String(p.id) === sp.edit);

  return (
    <>
      <PageHead
        title="Products & Store"
        actions={
          <>
            <Link href="/admin/products" className={`btn ${tab === "company" ? "btn-acc" : "btn-ghost"}`}>
              Company products
            </Link>
            <Link href="/admin/products?tab=vendor" className={`btn ${tab === "vendor" ? "btn-acc" : "btn-ghost"}`}>
              Distributor products
            </Link>
          </>
        }
      />
      <Flash sp={sp} />
      {tab === "company" ? (
        <>
          <Card title={editing ? `Edit: ${editing.name}` : "Add product"}>
            <ProductForm key={editing?.id ?? "new"} p={editing} />
          </Card>
          <Card title="Company products" className="mt-4">
            <Table>
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Joining product</th>
                  <th>Visible</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {company.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.image_url || "/products/earbuds.webp"} alt="" className="h-10 w-10 rounded object-cover" />
                    </td>
                    <td className="font-semibold">{p.name}</td>
                    <td>{p.category}</td>
                    <td>{money(p.price, s.currency)}</td>
                    <td>{p.is_package ? "Yes" : "—"}</td>
                    <td>{p.active ? <Badge tone="ok">yes</Badge> : <Badge tone="bad">hidden</Badge>}</td>
                    <td>
                      <Link className="text-acc" href={`/admin/products?edit=${p.id}`}>
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      ) : (
        <Card title={`Distributor products (platform fee ${s.distributor_platform_fee_percent}%)`}>
          {vendor.length ? (
            <Table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Brand</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {vendor.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.image_url && <img src={p.image_url} alt="" className="h-10 w-10 rounded object-cover" />}
                        <div>
                          <div className="font-semibold">{p.name}</div>
                          <div className="max-w-xs truncate text-xs text-mute">{p.description}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {p.brand_name} <span className="text-xs text-mute">({p.code})</span>
                    </td>
                    <td>{money(p.price, s.currency)}</td>
                    <td>
                      <Badge>{p.active ? p.status : "removed"}</Badge>
                    </td>
                    <td className="whitespace-nowrap text-mute">{dt(p.created_at)}</td>
                    <td>
                      <form action={reviewProductAction} className="flex flex-wrap gap-1">
                        <input type="hidden" name="id" value={p.id} />
                        <input className="inp w-32 py-1 text-xs" name="note" placeholder="note" defaultValue={p.admin_note ?? ""} />
                        <button name="status" value="approved" className="btn btn-ok btn-sm">
                          Approve
                        </button>
                        <button name="status" value="rejected" className="btn btn-bad btn-sm">
                          Reject
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty>No distributor products yet.</Empty>
          )}
        </Card>
      )}
    </>
  );
}
