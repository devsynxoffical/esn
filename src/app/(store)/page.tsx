import Link from "next/link";
import {
  Truck,
  ShieldCheck,
  Wallet,
  GraduationCap,
  Network,
  BadgeCheck,
  Check,
  ArrowRight,
  Ticket,
  Trophy,
  Smartphone,
  ChevronDown,
  TrendingUp,
  Gift,
} from "lucide-react";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/fmt";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-acc/25 bg-acc/[0.08] px-3 py-1 text-[12.5px] font-medium text-acc">
      <span className="h-1.5 w-1.5 rounded-full bg-acc" />
      {children}
    </span>
  );
}

function SectionHead({ eyebrow, title, sub, center = true }: { eyebrow: string; title: React.ReactNode; sub?: string; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-[30px] font-bold leading-tight tracking-[-0.03em] sm:text-[38px]">{title}</h2>
      {sub && <p className="mt-3 text-[15.5px] leading-relaxed text-mute">{sub}</p>}
    </div>
  );
}

function BrowserFrame({ src, alt, url }: { src: string; alt: string; url: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-[0_40px_120px_-40px_rgba(249,115,22,0.45)]">
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-side/80 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto flex h-7 w-full max-w-sm items-center justify-center rounded-md bg-white/[0.04] text-[12px] text-mute">
          {url}
        </div>
        <div className="w-[52px]" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block w-full" />
    </div>
  );
}

const FAQ = [
  ["What do I get for the package price?", "One original product (a wireless handsfree or a smart watch, your choice), a lifetime business account with Left & Right referral links, your binary team tree, two wallets and full access to the training academy."],
  ["How do I activate my account?", "Register online, pay at the office (or through your sponsor) and you receive a 16-digit E-Pin. Enter it in your dashboard and your ID becomes active instantly. Your product order and sales receipt are created automatically."],
  ["How are commissions calculated?", "Your first pair (1 Left + 1 Right member from your own links) pays the first-pair bonus. After that every 1 Left : 1 Right match anywhere in your team pays the team pair bonus, up to the daily limit. Unmatched members carry forward."],
  ["When and how do I get paid?", "Pair income is added to your earning wallet at the midnight closing. You can withdraw to JazzCash, EasyPaisa or any bank account from your dashboard. A small service fee is deducted automatically."],
  ["How long does delivery take?", "Products are dispatched by tracked courier across Pakistan, usually within 2–5 working days. You can follow the status and tracking ID in your dashboard."],
  ["Is there any warranty?", "Yes. Every product comes with a 7-day checking warranty. If anything is wrong with your product, contact the office and we will replace it."],
];

export default async function Home() {
  const s = await getSettings();
  const [packages, store, plans, ranks] = await Promise.all([
    q("SELECT * FROM products WHERE is_package AND active ORDER BY sort, id"),
    q(
      `SELECT p.*, u.brand_name FROM products p LEFT JOIN users u ON u.id = p.vendor_id
       WHERE NOT p.is_package AND p.active AND p.status = 'approved' ORDER BY p.sort, p.id DESC LIMIT 12`,
    ),
    q("SELECT * FROM plans WHERE active AND public ORDER BY sort, id"),
    q("SELECT * FROM ranks WHERE active ORDER BY level"),
  ]);
  const base = plans[0];
  const m = (n: number) => money(n, s.currency);
  const words = String(s.hero_title).split(" ");
  const earbuds = packages.find((p) => /hands|ear|bud/i.test(p.name + p.category)) ?? packages[0];
  const watch = packages.find((p) => /watch/i.test(p.name + p.category)) ?? packages[1];

  return (
    <>
      {/* ───────────────── HERO ───────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_50%_at_50%_0%,rgba(249,115,22,0.18),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(70%_60%_at_50%_20%,black,transparent)]" />
        <div className="relative mx-auto max-w-7xl px-5 pt-16 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Free delivery across Pakistan · 7-day checking warranty</Eyebrow>
            <h1 className="mt-6 text-[42px] font-bold leading-[1.04] tracking-[-0.045em] sm:text-[64px]">
              {words.slice(0, -2).join(" ")}
              <br className="hidden sm:block" /> <span className="grad-text">{words.slice(-2).join(" ")}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[16.5px] leading-relaxed text-mute sm:text-[18px]">{s.hero_subtitle}</p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn btn-acc btn-lg">
                Start your business <ArrowRight size={17} />
              </Link>
              <a href="#products" className="btn btn-ghost btn-lg">
                Shop products
              </a>
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13.5px] text-mute">
              {["Original products", "Withdraw to JazzCash & EasyPaisa", "Live team dashboard"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check size={15} className="text-ok" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* showcase */}
          <div className="relative mx-auto mt-16 max-w-6xl pb-8 sm:mt-20">
            <div className="pointer-events-none absolute -inset-x-10 top-10 bottom-0 rounded-[40px] bg-acc/20 blur-[90px]" />
            <div className="relative">
              <BrowserFrame src="/showcase/dashboard.webp" alt="ESN member dashboard" url={`${s.site_domain}/dashboard`} />
            </div>
            {earbuds && (
              <Link
                href={`/product/${earbuds.slug}`}
                className="absolute -bottom-2 -left-2 hidden w-[200px] overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-2xl shadow-black/60 transition hover:-translate-y-1 md:block lg:-left-10 lg:w-[230px]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={earbuds.image_url || "/products/earbuds.webp"} alt={earbuds.name} className="aspect-[4/3] w-full object-cover" />
                <div className="flex items-center justify-between gap-2 px-4 py-3">
                  <span className="truncate text-[13px] font-semibold">{earbuds.name}</span>
                  <span className="num shrink-0 text-[13px] font-bold text-acc">{m(earbuds.price)}</span>
                </div>
              </Link>
            )}
            {watch && (
              <Link
                href={`/product/${watch.slug}`}
                className="absolute -bottom-2 -right-2 hidden w-[200px] overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-2xl shadow-black/60 transition hover:-translate-y-1 md:block lg:-right-10 lg:w-[230px]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={watch.image_url || "/products/watch.webp"} alt={watch.name} className="aspect-[4/3] w-full object-cover" />
                <div className="flex items-center justify-between gap-2 px-4 py-3">
                  <span className="truncate text-[13px] font-semibold">{watch.name}</span>
                  <span className="num shrink-0 text-[13px] font-bold text-acc">{m(watch.price)}</span>
                </div>
              </Link>
            )}
            {base && (
              <div className="absolute -top-6 right-6 hidden items-center gap-3 rounded-xl border border-white/10 bg-panel/95 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur lg:flex">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-ok/15 text-ok">
                  <TrendingUp size={18} />
                </span>
                <div className="leading-tight">
                  <div className="text-[12px] text-mute">Team pair matched</div>
                  <div className="num text-[15px] font-bold text-ok">+{m(base.indirect_pair_bonus)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ───────────────── HIGHLIGHTS ───────────────── */}
      {base && (
        <section className="border-y border-line bg-side/70">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-line px-5 md:grid-cols-4 md:divide-x">
            {[
              [m(base.price), "One-time package", "Product + business ID"],
              [m(base.direct_pair_bonus), "First pair bonus", "1 Left + 1 Right direct"],
              [m(base.indirect_pair_bonus), "Per team pair", "Unlimited depth"],
              [base.daily_cap_pairs > 0 ? `${base.daily_cap_pairs} pairs` : "No limit", "Daily earning limit", base.daily_cap_amount > 0 ? `Up to ${m(base.daily_cap_amount)} / day` : "Every day"],
            ].map(([v, l, d]) => (
              <div key={l} className="px-2 py-8 text-center md:px-6">
                <div className="num text-[26px] font-bold tracking-[-0.03em] sm:text-[30px]">{v}</div>
                <div className="mt-1 text-[14px] font-medium">{l}</div>
                <div className="text-[12.5px] text-mute">{d}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ───────────────── PRODUCTS ───────────────── */}
      <section id="products" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24">
        <SectionHead
          eyebrow="Products"
          title={
            <>
              Gadgets people love. <span className="text-mute">One fair price.</span>
            </>
          }
          sub="Every starter package includes one original product of your choice, delivered to your door with a 7-day checking warranty."
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {packages.map((p) => {
            const specs = String(p.specs || "")
              .split("\n")
              .map((x: string) => x.trim())
              .filter(Boolean)
              .slice(0, 4);
            return (
              <div key={p.id} className="group grid overflow-hidden rounded-3xl border border-line bg-panel sm:grid-cols-[1fr_1.1fr]">
                <div className="overflow-hidden bg-side">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image_url || "/products/earbuds.webp"}
                    alt={p.name}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="flex flex-col p-7">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-acc">{p.category}</div>
                  <h3 className="mt-2 text-[21px] font-bold leading-snug tracking-[-0.02em]">{p.name}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-mute">{p.description}</p>
                  <ul className="mt-5 space-y-2 text-[13.5px]">
                    {specs.map((x: string) => (
                      <li key={x} className="flex items-start gap-2">
                        <Check size={15} className="mt-0.5 shrink-0 text-ok" /> {x}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-7">
                    <div>
                      <div className="text-[12px] text-mute">Package price</div>
                      <div className="num whitespace-nowrap text-[26px] font-bold tracking-[-0.03em]">{m(p.price)}</div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/product/${p.slug}`} className="btn btn-ghost">
                        Details
                      </Link>
                      <Link href={`/register?product=${p.id}`} className="btn btn-acc">
                        Buy & join
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {store.length > 0 && (
          <>
            <h3 className="mt-16 text-[20px] font-bold tracking-[-0.02em]">More from our partner brands</h3>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {store.map((p) => (
                <Link key={p.id} href={`/product/${p.slug}`} className="group overflow-hidden rounded-2xl border border-line bg-panel transition hover:border-acc/50">
                  <div className="overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image_url || "/products/earbuds.webp"} alt={p.name} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                  </div>
                  <div className="p-4">
                    <div className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-mute">{p.brand_name || p.category}</div>
                    <div className="mt-1 line-clamp-2 text-[14px] font-semibold">{p.name}</div>
                    <div className="num mt-1.5 font-bold text-acc">{m(p.price)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ───────────────── HOW IT WORKS ───────────────── */}
      <section id="how-it-works" className="scroll-mt-24 border-y border-line bg-side/60">
        <div className="mx-auto max-w-7xl px-5 py-24">
          <SectionHead eyebrow="How it works" title="From first order to first payout in four steps" />
          <div className="relative mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="pointer-events-none absolute left-[12%] right-[12%] top-[34px] hidden h-px bg-gradient-to-r from-transparent via-acc/40 to-transparent lg:block" />
            {(
              [
                [BadgeCheck, "Register", "Create your account in two minutes and pick a Watch or Handsfree."],
                [Ticket, "Pay & get your E-Pin", "Pay at the office and receive your 16-digit activation E-Pin."],
                [Truck, "Activate & receive", "Your ID goes live instantly and your product ships with tracking."],
                [Network, "Share & earn", "Share your Left and Right links. Every matched pair adds to your wallet."],
              ] as const
            ).map(([I, t, d], i) => (
              <div key={t} className="relative rounded-2xl border border-line bg-panel p-6 text-center">
                <span className="grad relative mx-auto grid h-[52px] w-[52px] place-items-center rounded-2xl text-white shadow-[0_10px_30px_-10px_rgba(249,115,22,0.8)]">
                  <I size={22} />
                </span>
                <div className="num mt-5 text-[12px] font-semibold uppercase tracking-[0.1em] text-mute">Step {i + 1}</div>
                <div className="mt-1 text-[17px] font-semibold">{t}</div>
                <p className="mt-2 text-[14px] leading-relaxed text-mute">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────── DASHBOARD SHOWCASE ───────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHead
              center={false}
              eyebrow="Your business dashboard"
              title="Everything you need to grow, in one place"
              sub="A live dashboard on your phone or computer: see your team grow, track every rupee and withdraw when you want."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {(
                [
                  [Network, "Live binary tree", "See every member on your Left and Right, level by level."],
                  [Wallet, "Two wallets", "Earning wallet for payouts, E-Pin wallet to activate members."],
                  [Smartphone, "Fast withdrawals", "Request payouts to JazzCash, EasyPaisa or bank."],
                  [GraduationCap, "Training academy", "Videos and ready-made scripts for WhatsApp, TikTok & more."],
                ] as const
              ).map(([I, t, d]) => (
                <div key={t} className="rounded-2xl border border-line bg-panel p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-acc/10 text-acc">
                    <I size={19} />
                  </span>
                  <div className="mt-4 text-[15px] font-semibold">{t}</div>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-mute">{d}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute -inset-6 rounded-[40px] bg-acc/15 blur-[70px]" />
            <div className="relative pr-0 sm:pr-16">
              <BrowserFrame src="/showcase/tree.webp" alt="Binary tree view" url={`${s.site_domain}/dashboard/tree`} />
            </div>
            <div className="absolute -bottom-10 right-0 hidden w-[170px] overflow-hidden rounded-[28px] border-[6px] border-[#1f2530] bg-panel shadow-2xl shadow-black/70 sm:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/showcase/mobile.webp" alt="Mobile dashboard" className="block w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── EARNINGS PLAN ───────────────── */}
      <section id="earnings" className="scroll-mt-24 border-y border-line bg-side/60">
        <div className="mx-auto max-w-7xl px-5 py-24">
          <SectionHead
            eyebrow="Earnings plan"
            title="Simple, transparent and capped for everyone's safety"
            sub="Choose the package that fits you. Every rupee is calculated automatically and shown in your dashboard."
          />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {plans.map((p, i) => (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-3xl border bg-panel p-7 ${
                  i === 0 ? "border-acc/60 shadow-[0_30px_80px_-40px_rgba(249,115,22,0.7)]" : "border-line"
                }`}
              >
                {i === 0 && (
                  <span className="grad absolute -top-3 left-7 rounded-full px-3 py-1 text-[11.5px] font-semibold text-white">Most popular</span>
                )}
                <div className="text-[15px] font-semibold">{p.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="num text-[38px] font-bold tracking-[-0.04em]">{m(p.price)}</span>
                  <span className="text-[13px] text-mute">one-time</span>
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-mute">{p.description}</p>
                <div className="my-6 h-px bg-line" />
                <ul className="flex-1 space-y-3 text-[14px]">
                  {[
                    `First pair bonus ${m(p.direct_pair_bonus)}`,
                    `Team pair bonus ${m(p.indirect_pair_bonus)} per pair`,
                    p.daily_cap_pairs > 0 ? `Up to ${p.daily_cap_pairs} pairs a day${p.daily_cap_amount > 0 ? ` (${m(p.daily_cap_amount)})` : ""}` : "No daily pair limit",
                    "Unmatched members carry forward",
                    p.is_distributor ? "Own brand & product portal" : "Training academy access",
                    p.is_manager ? "Monthly salary + turnover pool" : null,
                  ]
                    .filter((t): t is string => !!t)
                    .map((t) => (
                      <li key={t} className="flex items-start gap-2.5">
                        <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-ok/15 text-ok">
                          <Check size={12} strokeWidth={3} />
                        </span>
                        {t}
                      </li>
                    ))}
                </ul>
                <Link href={`/register?plan=${p.id}`} className={`btn btn-lg mt-8 w-full ${i === 0 ? "btn-acc" : "btn-ghost"}`}>
                  Join as {p.name.split("/")[0].trim()}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[13px] text-mute">
            Withdrawals: minimum {m(Number(s.withdrawal_min))}, {s.withdrawal_fee_percent}% service fee. Income depends on real product
            sales made by your team.
          </p>
        </div>
      </section>

      {/* ───────────────── RANK REWARDS ───────────────── */}
      {ranks.length > 0 && (
        <section id="rewards" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24">
          <SectionHead
            eyebrow="Rank rewards"
            title="Grow your team, unlock bigger rewards"
            sub="Each rank counts fresh pairs. Choose the gift or take the cash — it's your call."
          />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ranks.map((r, i) => (
              <div
                key={r.id}
                className={`group relative overflow-hidden rounded-2xl border border-line bg-panel p-6 transition hover:border-acc/50 ${
                  i === ranks.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-acc/10 text-acc">
                    {i < 2 ? <Gift size={19} /> : <Trophy size={19} />}
                  </span>
                  <span className="num text-[12px] font-semibold text-mute">RANK {r.level}</span>
                </div>
                <div className="mt-5 text-[18px] font-bold tracking-[-0.02em]">{r.name}</div>
                <div className="num mt-1 text-[13.5px] font-medium text-acc">
                  {r.pairs_required.toLocaleString()} : {r.pairs_required.toLocaleString()} pairs
                </div>
                <div className="mt-4 border-t border-line pt-4 text-[13.5px]">
                  <div className="font-medium">{r.reward_item}</div>
                  {r.reward_cash > 0 && <div className="text-mute">or {m(r.reward_cash)} cash</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ───────────────── FAQ ───────────────── */}
      <section id="faq" className="scroll-mt-24 border-t border-line bg-side/60">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHead center={false} eyebrow="FAQ" title="Questions? We've got answers." />
            <p className="mt-4 text-[15px] leading-relaxed text-mute">
              Still unsure? Call us on <span className="text-fg">{s.support_phone}</span> or message us on WhatsApp — our office team
              is happy to help.
            </p>
          </div>
          <div className="space-y-3">
            {FAQ.map(([qq, a], i) => (
              <details key={qq} className="group rounded-2xl border border-line bg-panel px-6 py-5 open:border-acc/40" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15.5px] font-semibold [&::-webkit-details-marker]:hidden">
                  {qq}
                  <ChevronDown size={18} className="shrink-0 text-mute transition group-open:rotate-180 group-open:text-acc" />
                </summary>
                <p className="mt-3 text-[14.5px] leading-relaxed text-mute">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────── CTA ───────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <div className="grad relative overflow-hidden rounded-[32px] px-8 py-14 text-center text-white sm:px-16 sm:py-16">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-black/10 blur-3xl" />
          <div className="relative mx-auto max-w-2xl">
            <ShieldCheck size={34} className="mx-auto opacity-90" />
            <h2 className="mt-4 text-[30px] font-bold leading-tight tracking-[-0.03em] sm:text-[40px]">
              Start with one product. Build something bigger.
            </h2>
            <p className="mt-3 text-[16px] text-white/90">
              Get your gadget, your business ID and your training academy today{base ? ` — all for ${m(base.price)}` : ""}.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn btn-lg bg-white text-[#0d1117] hover:bg-white/90">
                Create my account <ArrowRight size={17} />
              </Link>
              <Link href="/login" className="btn btn-lg border border-white/40 text-white hover:bg-white/10">
                Member login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
