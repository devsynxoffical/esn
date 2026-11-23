import Link from "next/link";
import { Truck, ShieldCheck, Wallet, GraduationCap, Network, BadgeCheck, Check } from "lucide-react";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/fmt";

export default async function Home() {
  const s = await getSettings();
  const [packages, store, plans, ranks] = await Promise.all([
    q("SELECT * FROM products WHERE is_package AND active ORDER BY sort, id"),
    q(
      `SELECT p.*, u.brand_name FROM products p LEFT JOIN users u ON u.id = p.vendor_id
       WHERE NOT p.is_package AND p.active AND p.status = 'approved' ORDER BY p.sort, p.id DESC LIMIT 24`,
    ),
    q("SELECT * FROM plans WHERE active AND public ORDER BY sort, id"),
    q("SELECT * FROM ranks WHERE active ORDER BY level"),
  ]);
  const base = plans[0];
  const m = (n: number) => money(n, s.currency);
  const words = String(s.hero_title).split(" ");

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -right-32 -top-48 h-[560px] w-[560px] rounded-full bg-acc/15 blur-[120px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:py-20 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-acc/30 bg-acc/10 px-3 py-1 text-[12.5px] font-medium text-acc">
              <span className="h-1.5 w-1.5 rounded-full bg-acc" /> Free delivery across Pakistan · 7-day checking warranty
            </span>
            <h1 className="mt-5 text-[40px] font-bold leading-[1.08] tracking-[-0.035em] sm:text-[54px]">
              {words.slice(0, -2).join(" ")} <span className="grad-text">{words.slice(-2).join(" ")}</span>
            </h1>
            <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-mute sm:text-[17px]">{s.hero_subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#shop" className="btn btn-acc btn-lg">
                Shop now
              </a>
              <Link href="/register" className="btn btn-ghost btn-lg">
                Start your business
              </Link>
            </div>
            {base && (
              <div className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6">
                {[
                  [m(base.price), "One fair price"],
                  [m(base.direct_pair_bonus), "First pair bonus"],
                  ["24/7", "Online dashboard"],
                ].map(([a, b]) => (
                  <div key={b}>
                    <div className="num text-[20px] font-bold tracking-[-0.02em]">{a}</div>
                    <div className="text-[12.5px] text-mute">{b}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {packages.slice(0, 2).map((p, i) => (
              <Link
                key={p.id}
                href={`/product/${p.slug}`}
                className={`group overflow-hidden rounded-2xl border border-line bg-panel transition hover:border-acc/60 ${i === 1 ? "mt-10" : ""}`}
              >
                <div className="overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image_url || "/products/earbuds.webp"}
                    alt={p.name}
                    className="aspect-square w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="p-4">
                  <div className="truncate text-[14px] font-semibold">{p.name}</div>
                  <div className="num mt-0.5 text-[15px] font-bold text-acc">{m(p.price)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-line bg-side/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-6 md:grid-cols-4">
          {(
            [
              [Truck, "Nationwide delivery", "Tracked courier to your door"],
              [ShieldCheck, "Original products", "7-day checking warranty"],
              [Wallet, "JazzCash · EasyPaisa", "Fast withdrawals"],
              [GraduationCap, "Training academy", "Videos & social media scripts"],
            ] as const
          ).map(([I, t, d]) => (
            <div key={t} className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc">
                <I size={19} />
              </span>
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold">{t}</div>
                <div className="text-[12px] text-mute">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shop */}
      <section id="shop" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="text-[28px] font-bold tracking-[-0.025em]">Shop</h2>
        <p className="mt-1 text-[14.5px] text-mute">Original gadgets at one fair price.</p>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[...packages, ...store].map((p) => (
            <Link
              key={p.id}
              href={`/product/${p.slug}`}
              className="group overflow-hidden rounded-2xl border border-line bg-panel transition hover:border-acc/60"
            >
              <div className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image_url || "/products/earbuds.webp"}
                  alt={p.name}
                  className="aspect-square w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <div className="p-4">
                <div className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-mute">{p.brand_name || p.category}</div>
                <div className="mt-1 line-clamp-2 text-[14px] font-semibold leading-snug">{p.name}</div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="num text-[15px] font-bold text-acc">{m(p.price)}</span>
                  {p.is_package && (
                    <span className="rounded-md bg-ok/15 px-2 py-0.5 text-[11px] font-semibold text-ok">+ Business ID</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Business */}
      <section id="business" className="scroll-mt-20 border-y border-line bg-side/60">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-2xl">
            <h2 className="text-[28px] font-bold tracking-[-0.025em]">Buy a product, get a business</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-mute">
              Every {base ? m(base.price) : ""} purchase includes a lifetime business ID, your own Left & Right referral links, a
              live binary team tree, wallets and the training academy.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                [BadgeCheck, "Register", "Create your account and choose a Watch or Handsfree."],
                [Wallet, "Pay at the office", "Pay and receive your 16-digit E-Pin."],
                [ShieldCheck, "Activate", "Enter the E-Pin — your ID goes live and your product ships."],
                [Network, "Build & earn", "Share your Left & Right links and earn on team pairs."],
              ] as const
            ).map(([I, t, d], i) => (
              <div key={t} className="rounded-2xl border border-line bg-panel p-6">
                <div className="flex items-center justify-between">
                  <span className="grad grid h-10 w-10 place-items-center rounded-xl text-white">
                    <I size={19} />
                  </span>
                  <span className="num text-[13px] font-semibold text-mute">0{i + 1}</span>
                </div>
                <div className="mt-4 text-[15px] font-semibold">{t}</div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-mute">{d}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {plans.map((p, i) => (
              <div
                key={p.id}
                className={`flex flex-col rounded-2xl border bg-panel p-6 ${
                  i === 0 ? "border-acc/60 shadow-[0_20px_60px_-30px_rgba(249,115,22,0.6)]" : "border-line"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[14px] font-semibold text-acc">{p.name}</div>
                  {i === 0 && <span className="rounded-md bg-acc/15 px-2 py-0.5 text-[11px] font-semibold text-acc">Popular</span>}
                </div>
                <div className="num mt-2 text-[34px] font-bold tracking-[-0.03em]">{m(p.price)}</div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-mute">{p.description}</p>
                <ul className="mt-5 flex-1 space-y-2.5 text-[13.5px]">
                  {[
                    `First pair bonus ${m(p.direct_pair_bonus)}`,
                    `Team pair bonus ${m(p.indirect_pair_bonus)} / pair`,
                    p.daily_cap_pairs > 0
                      ? `Up to ${p.daily_cap_pairs} pairs / day${p.daily_cap_amount > 0 ? ` (${m(p.daily_cap_amount)})` : ""}`
                      : null,
                    p.is_distributor ? "Own brand & product portal" : null,
                    p.is_manager ? "Monthly salary + turnover pool" : null,
                  ]
                    .filter((t): t is string => !!t)
                    .map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <Check size={16} className="mt-0.5 shrink-0 text-ok" />
                        {t}
                      </li>
                    ))}
                </ul>
                <Link href={`/register?plan=${p.id}`} className={`btn mt-6 ${i === 0 ? "btn-acc" : "btn-ghost"}`}>
                  Join as {p.name.split("/")[0].trim()}
                </Link>
              </div>
            ))}
          </div>

          {ranks.length > 0 && (
            <div className="mt-14">
              <h3 className="text-[20px] font-bold tracking-[-0.02em]">Rank rewards</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {ranks.map((r) => (
                  <div key={r.id} className="rounded-xl border border-line bg-panel p-5">
                    <div className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-mute">Rank {r.level}</div>
                    <div className="mt-1 text-[16px] font-semibold">{r.name}</div>
                    <div className="num mt-1 text-[13.5px] text-acc">
                      {r.pairs_required.toLocaleString()} : {r.pairs_required.toLocaleString()} pairs
                    </div>
                    <div className="mt-2 text-[13px] text-mute">
                      {r.reward_item}
                      {r.reward_item && r.reward_cash > 0 ? " or " : ""}
                      {r.reward_cash > 0 ? `${m(r.reward_cash)} cash` : ""}
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
