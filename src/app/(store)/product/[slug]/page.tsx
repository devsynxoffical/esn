import Link from "next/link";
import { notFound } from "next/navigation";
import { one } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/fmt";
import { Flash } from "@/components/ui";
import { placeOrderAction } from "@/app/actions/public";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const s = await getSettings();
  const p = await one(
    `SELECT p.*, u.brand_name FROM products p LEFT JOIN users u ON u.id = p.vendor_id
     WHERE p.slug = $1 AND p.active AND p.status = 'approved'`,
    [slug],
  );
  if (!p) notFound();
  const specs = String(p.specs || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/#shop" className="text-sm text-mute hover:text-fg">
        ← Back to shop
      </Link>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.image_url || "/products/earbuds.webp"}
          alt={p.name}
          className="aspect-square w-full rounded-2xl border border-line object-cover"
        />
        <div>
          <Flash sp={sp} />
          <div className="text-xs font-bold uppercase tracking-wide text-mute">{p.brand_name || p.category}</div>
          <h1 className="mt-1 text-3xl font-bold">{p.name}</h1>
          <div className="mt-3 text-3xl font-bold text-acc">{money(p.price, s.currency)}</div>
          <p className="mt-4 text-mute">{p.description}</p>
          {specs.length > 0 && (
            <div className="mt-6 rounded-2xl border border-line bg-panel p-5">
              <div className="mb-2 font-bold">Specifications</div>
              <ul className="space-y-1.5 text-sm">
                {specs.map((x) => (
                  <li key={x} className="flex gap-2">
                    <span className="text-acc">•</span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.is_package ? (
            <div className="mt-6 rounded-2xl border border-acc/40 bg-acc/10 p-5">
              <div className="font-bold">Includes a lifetime business ID</div>
              <p className="mt-1 text-sm text-mute">
                Register, pay at the office, enter your E-Pin and this product is dispatched to you, plus your business
                account, referral links and training academy.
              </p>
              <Link href={`/register?product=${p.id}`} className="btn btn-acc mt-4 w-full py-3 text-base">
                Buy & Join
              </Link>
            </div>
          ) : (
            <form action={placeOrderAction} className="mt-6 space-y-3 rounded-2xl border border-line bg-panel p-5">
              <div className="font-bold">Order now: Cash on Delivery</div>
              <input type="hidden" name="slug" value={p.slug} />
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="inp" name="name" placeholder="Full name" required />
                <input className="inp" name="phone" placeholder="Mobile 03xxxxxxxxx" inputMode="tel" required />
                <input className="inp" name="city" placeholder="City" required />
                <input className="inp" name="qty" type="number" min={1} max={20} defaultValue={1} />
              </div>
              <textarea className="inp" name="address" placeholder="Full delivery address" rows={2} required />
              <button className="btn btn-acc w-full py-3">Place Order</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
