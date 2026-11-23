import Link from "next/link";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/fmt";

export default async function Home() {
  const s = await getSettings();
  const [packages, store, plans, ranks] = await Promise.all([
    q("SELECT * FROM products WHERE is_package AND active ORDER BY sort, id"),
    q("SELECT p.*, u.brand_name FROM products p LEFT JOIN users u ON u.id = p.vendor_id WHERE NOT p.is_package AND p.active AND p.status = 'approved' ORDER BY p.sort, p.id DESC LIMIT 24"),
    q("SELECT * FROM plans WHERE active AND public ORDER BY sort, id"),
    q("SELECT * FROM ranks WHERE active ORDER BY level"),
  ]);
  const base = plans[0];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-acc/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:py-20 md:grid-cols-2">
          <div>
            <span className="inline-block rounded-full border border-acc/40 bg-acc/10 px-3 py-1 text-xs font-bold text-acc">
              Free delivery · Cash at office · 7-day checking warranty
            </span>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
              <span className="grad-text">{s.hero_title}</span>
            </h1>
            <p className="mt-4 max-w-lg text-base text-mute sm:text-lg">{s.hero_subtitle}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#shop" className="btn btn-acc px-6 py-3 text-base">
                Shop Now
              </a>
              <Link href="/register" className="btn btn-ghost px-6 py-3 text-base">
                Start Your Business
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {packages.slice(0, 2).map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.slug}`}
                className="overflow-hidden rounded-2xl border border-line bg-panel transition hover:-translate-y-1 hover:border-acc"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url || "/products/handsfree.svg"} alt={p.name} className="aspect-square w-full object-cover" />
                <div className="p-3">
                  <div className="truncate text-sm font-bold">{p.name}</div>
                  <div className="text-sm font-extrabold text-acc">{money(p.price, s.currency)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Shop */}
      <section id="shop" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-extrabold sm:text-3xl">Shop</h2>
        <p className="mt-1 text-mute">Original products at one fair price.</p>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[...packages, ...store].map((p) => (
            <Link
              key={p.id}
              href={`/product/${p.slug}`}
              className="group overflow-hidden rounded-2xl border border-line bg-panel transition hover:border-acc"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image_url || "/products/handsfree.svg"}
                alt={p.name}
                className="aspect-square w-full object-cover transition group-hover:scale-[1.03]"
              />
              <div className="p-3 sm:p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-mute">
                  {p.brand_name || p.category}
                </div>
                <div className="mt-0.5 line-clamp-2 text-sm font-bold">{p.name}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-extrabold text-acc">{money(p.price, s.currency)}</span>
                  {p.is_package && <span className="rounded-full bg-ok/15 px-2 py-0.5 text-[10px] font-bold text-ok">+ Business ID</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Business */}
      <section id="business" className="border-y border-line bg-panel/50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Buy a product, get a business</h2>
          <p className="mt-1 max-w-2xl text-mute">
            Every {base ? money(base.price, s.currency) : ""} product purchase includes a lifetime business ID, your own Left &
            Right referral links, a live binary team tree, wallets and a training academy.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["1", "Register", "Create your account and choose a Watch or Handsfree."],
              ["2", "Pay at office", "Pay at the office and receive your 16-digit E-Pin."],
              ["3", "Activate", "Enter the E-Pin — your ID goes live and your product is dispatched."],
              ["4", "Build & earn", "Share your Left & Right links. Earn on direct and team pairs."],
            ].map(([n, t, d]) => (
              <div key={n} className="rounded-2xl border border-line bg-panel p-5">
                <div className="grad grid h-9 w-9 place-items-center rounded-lg font-black text-white">{n}</div>
                <div className="mt-3 font-bold">{t}</div>
                <p className="mt-1 text-sm text-mute">{d}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {plans.map((p) => (
              <div key={p.id} className="flex flex-col rounded-2xl border border-line bg-panel p-5">
                <div className="text-sm font-bold text-acc">{p.name}</div>
                <div className="mt-1 text-3xl font-black">{money(p.price, s.currency)}</div>
                <p className="mt-2 text-sm text-mute">{p.description}</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  <li>✓ Direct pair bonus {money(p.direct_pair_bonus, s.currency)}</li>
                  <li>✓ Team pair bonus {money(p.indirect_pair_bonus, s.currency)} / pair</li>
                  {p.daily_cap_pairs > 0 && (
                    <li>
                      ✓ Up to {p.daily_cap_pairs} pairs / day
                      {p.daily_cap_amount > 0 ? ` (${money(p.daily_cap_amount, s.currency)})` : ""}
                    </li>
                  )}
                  {p.is_distributor && <li>✓ Own brand & product portal</li>}
                  {p.is_manager && <li>✓ Monthly salary + turnover pool</li>}
                </ul>
                <Link href={`/register?plan=${p.id}`} className="btn btn-acc mt-5">
                  Join as {p.name.split("/")[0].trim()}
                </Link>
              </div>
            ))}
          </div>

          {ranks.length > 0 && (
            <div className="mt-10">
              <h3 className="text-lg font-extrabold">Rank rewards</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {ranks.map((r) => (
                  <div key={r.id} className="rounded-xl border border-line bg-panel p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-mute">Rank {r.level}</div>
                    <div className="font-extrabold">{r.name}</div>
                    <div className="mt-1 text-sm text-acc">
                      {r.pairs_required.toLocaleString()} : {r.pairs_required.toLocaleString()} pairs
                    </div>
                    <div className="mt-1 text-sm text-mute">
                      {r.reward_item}
                      {r.reward_item && r.reward_cash > 0 ? " or " : ""}
                      {r.reward_cash > 0 ? money(r.reward_cash, s.currency) + " cash" : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
