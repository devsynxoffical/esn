import Link from "next/link";
import {
  Truck,
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
  ShieldCheck,
} from "lucide-react";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/fmt";

/** Every section is at least one screen tall (minus the header) and centres its content. */
const SCREEN = "flex min-h-[calc(100svh-68px)] scroll-mt-[68px] items-center py-8 sm:py-12";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-acc/25 bg-acc/[0.08] px-3 py-1 text-[12px] font-medium text-acc">
      <span className="h-1.5 w-1.5 rounded-full bg-acc" />
      {children}
    </span>
  );
}

function Head({ eyebrow, title, sub, center = true }: { eyebrow: string; title: React.ReactNode; sub?: string; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-[26px] font-bold leading-tight tracking-[-0.03em] sm:text-[36px]">{title}</h2>
      {sub && <p className="mt-2 text-[14.5px] leading-relaxed text-mute sm:text-[15.5px]">{sub}</p>}
    </div>
  );
}

function BrowserFrame({ src, alt, url }: { src: string; alt: string; url: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-[0_40px_120px_-40px_rgba(249,115,22,0.5)]">
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-side/80 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto flex h-6 w-full max-w-xs items-center justify-center rounded-md bg-white/[0.04] text-[11.5px] text-mute">
          {url}
        </div>
        <div className="w-[42px]" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block w-full" />
    </div>
  );
}

const FAQ = [
  ["What do I get for the package price?", "One original product (wireless handsfree or smart watch), a lifetime business ID with Left & Right referral links, your live team tree, two wallets and the training academy."],
  ["How do I activate my account?", "Register online, pay at the office and receive a 16-digit E-Pin. Enter it in your dashboard and your ID goes live instantly, with your product order and receipt created automatically."],
  ["How are commissions calculated?", "Your first pair (1 Left + 1 Right from your own links) pays the first-pair bonus. After that every 1:1 match anywhere in your team pays the team pair bonus, up to the daily limit."],
  ["When and how do I get paid?", "Pair income reaches your earning wallet at the midnight closing. Withdraw to JazzCash, EasyPaisa or a bank account from your dashboard."],
  ["How long does delivery take?", "Products ship by tracked courier across Pakistan, usually within 2–5 working days. Track the status in your dashboard."],
];

export default async function Home() {
  const s = await getSettings();
  const [packages, store, plans, ranks] = await Promise.all([
    q("SELECT * FROM products WHERE is_package AND active ORDER BY sort, id"),
    q(
      `SELECT p.*, u.brand_name FROM products p LEFT JOIN users u ON u.id = p.vendor_id
       WHERE NOT p.is_package AND p.active AND p.status = 'approved' ORDER BY p.sort, p.id DESC LIMIT 8`,
    ),
    q("SELECT * FROM plans WHERE active AND public ORDER BY sort, id"),
    q("SELECT * FROM ranks WHERE active ORDER BY level"),
  ]);
  const base = plans[0];
  const m = (n: number) => money(n, s.currency);
  const words = String(s.hero_title).split(" ");

  return (
    <>
      {/* ───────── 1. HERO ───────── */}
      <section className={`relative overflow-hidden ${SCREEN}`}>
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(55%_55%_at_75%_30%,rgba(249,115,22,0.16),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(70%_60%_at_50%_40%,black,transparent)]" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-5 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
          <div className="text-center lg:text-left">
            <Eyebrow>Free delivery across Pakistan · 7-day warranty</Eyebrow>
            <h1 className="mt-5 text-[38px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-[54px] xl:text-[60px]">
              {words.slice(0, -2).join(" ")} <span className="grad-text">{words.slice(-2).join(" ")}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-[15.5px] leading-relaxed text-mute sm:text-[17px] lg:mx-0">{s.hero_subtitle}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link href="/register" className="btn btn-acc btn-lg">
                Start your business <ArrowRight size={17} />
              </Link>
              <a href="#products" className="btn btn-ghost btn-lg">
                View products
              </a>
            </div>
            {base && (
              <div className="mx-auto mt-9 grid max-w-lg grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4 lg:mx-0">
                {[
                  [m(base.price), "Package"],
                  [m(base.direct_pair_bonus), "First pair"],
                  [m(base.indirect_pair_bonus), "Per team pair"],
                  [base.daily_cap_amount > 0 ? m(base.daily_cap_amount) : "No limit", "Daily max"],
                ].map(([v, l]) => (
                  <div key={l} className="bg-panel px-3 py-3.5 text-center">
                    <div className="num text-[16px] font-bold tracking-[-0.02em]">{v}</div>
                    <div className="text-[11.5px] text-mute">{l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="relative hidden md:block">
            <div className="pointer-events-none absolute -inset-8 rounded-[40px] bg-acc/15 blur-[80px]" />
            <div className="relative">
              <BrowserFrame src="/showcase/dashboard.webp" alt="ESN member dashboard" url={`${s.site_domain}/dashboard`} />
            </div>
            {base && (
              <div className="absolute -bottom-5 -left-5 flex items-center gap-3 rounded-xl border border-white/10 bg-panel/95 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur">
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

      {/* ───────── 2. PRODUCTS (only place with product photos) ───────── */}
      <section id="products" className={`border-t border-line bg-side/60 ${SCREEN}`}>
        <div className="mx-auto w-full max-w-7xl px-5">
          <Head eyebrow="Products" title="Two best-sellers. One fair price." sub="Every package includes one original product of your choice, delivered with a 7-day checking warranty." />
          <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:mt-10 md:grid-cols-2 md:gap-6">
            {packages.map((p) => {
              const specs = String(p.specs || "")
                .split("\n")
                .map((x: string) => x.trim())
                .filter(Boolean)
                .slice(0, 3);
              return (
                <div key={p.id} className="group flex overflow-hidden rounded-2xl border border-line bg-panel md:flex-col">
                  <div className="w-[118px] shrink-0 overflow-hidden bg-side sm:w-[160px] md:w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image_url || "/products/earbuds.webp"}
                      alt={p.name}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04] md:aspect-[2/1] md:h-auto"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-6">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-acc">{p.category}</div>
                    <h3 className="mt-1 text-[16px] font-bold leading-snug tracking-[-0.01em] sm:text-[19px]">{p.name}</h3>
                    <ul className="mt-2 hidden space-y-1 text-[13px] text-mute sm:block">
                      {specs.map((x: string) => (
                        <li key={x} className="flex items-center gap-2">
                          <Check size={14} className="shrink-0 text-ok" /> {x}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3 sm:pt-5">
                      <span className="num whitespace-nowrap text-[20px] font-bold tracking-[-0.02em] sm:text-[24px]">{m(p.price)}</span>
                      <div className="flex gap-2">
                        <Link href={`/product/${p.slug}`} className="btn btn-ghost btn-sm hidden sm:inline-flex">
                          Details
                        </Link>
                        <Link href={`/register?product=${p.id}`} className="btn btn-acc btn-sm">
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
            <div className="mx-auto mt-6 max-w-5xl text-center text-[13.5px] text-mute">
              Plus {store.length} product{store.length > 1 ? "s" : ""} from our partner brands —{" "}
              <Link href={`/product/${store[0].slug}`} className="font-semibold text-acc hover:underline">
                browse
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ───────── 3. HOW IT WORKS ───────── */}
      <section id="how-it-works" className={`border-t border-line ${SCREEN}`}>
        <div className="mx-auto w-full max-w-7xl px-5">
          <Head eyebrow="How it works" title="From first order to first payout" sub="Four simple steps — no experience needed." />
          <div className="relative mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-5 lg:grid-cols-4">
            <div className="pointer-events-none absolute left-[12%] right-[12%] top-[46px] hidden h-px bg-gradient-to-r from-transparent via-acc/40 to-transparent lg:block" />
            {(
              [
                [BadgeCheck, "Register", "Create your account and pick a Watch or Handsfree."],
                [Ticket, "Get your E-Pin", "Pay at the office and receive your 16-digit E-Pin."],
                [Truck, "Activate", "Your ID goes live and your product ships with tracking."],
                [Network, "Share & earn", "Share your Left & Right links. Every pair pays you."],
              ] as const
            ).map(([I, t, d], i) => (
              <div key={t} className="relative rounded-2xl border border-line bg-panel p-4 text-center sm:p-6">
                <span className="grad relative mx-auto grid h-11 w-11 place-items-center rounded-xl text-white shadow-[0_10px_30px_-10px_rgba(249,115,22,0.8)] sm:h-[52px] sm:w-[52px] sm:rounded-2xl">
                  <I size={20} />
                </span>
                <div className="num mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-mute sm:mt-5">Step {i + 1}</div>
                <div className="mt-0.5 text-[15px] font-semibold sm:text-[17px]">{t}</div>
                <p className="mt-1 text-[12.5px] leading-snug text-mute sm:mt-2 sm:text-[14px] sm:leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── 4. DASHBOARD ───────── */}
      <section className={`border-t border-line bg-side/60 ${SCREEN}`}>
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <div>
            <Head
              center={false}
              eyebrow="Your dashboard"
              title="Run your business from your phone"
              sub="See your team grow, track every rupee and withdraw when you want."
            />
            <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4">
              {(
                [
                  [Network, "Live team tree", "Every member on your Left and Right."],
                  [Wallet, "Two wallets", "Earnings and E-Pin balance."],
                  [Smartphone, "Fast payouts", "JazzCash, EasyPaisa or bank."],
                  [GraduationCap, "Training", "Videos & ready-made scripts."],
                ] as const
              ).map(([I, t, d]) => (
                <div key={t} className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-acc/10 text-acc sm:h-10 sm:w-10">
                    <I size={18} />
                  </span>
                  <div className="mt-3 text-[14px] font-semibold sm:text-[15px]">{t}</div>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-mute sm:text-[13.5px]">{d}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="pointer-events-none absolute -inset-6 rounded-[40px] bg-acc/15 blur-[70px]" />
            <div className="relative pr-20">
              <BrowserFrame src="/showcase/tree.webp" alt="Binary tree view" url={`${s.site_domain}/dashboard/tree`} />
            </div>
            <div className="absolute -bottom-8 right-0 w-[160px] overflow-hidden rounded-[26px] border-[6px] border-[#1f2530] bg-panel shadow-2xl shadow-black/70">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/showcase/mobile.webp" alt="Mobile dashboard" className="block w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ───────── 5. EARNINGS PLAN ───────── */}
      <section id="earnings" className={`border-t border-line ${SCREEN}`}>
        <div className="mx-auto w-full max-w-7xl px-5">
          <Head eyebrow="Earnings plan" title="Simple, transparent, capped for safety" />
          <div className="-mx-5 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 sm:mt-10 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0">
            {plans.map((p, i) => (
              <div
                key={p.id}
                className={`relative mt-3 flex w-[82vw] max-w-[340px] shrink-0 snap-center flex-col rounded-3xl border bg-panel p-6 md:w-auto md:max-w-none ${
                  i === 0 ? "border-acc/60 shadow-[0_30px_80px_-40px_rgba(249,115,22,0.7)]" : "border-line"
                }`}
              >
                {i === 0 && <span className="grad absolute -top-3 left-6 rounded-full px-3 py-1 text-[11px] font-semibold text-white">Most popular</span>}
                <div className="text-[15px] font-semibold">{p.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="num text-[34px] font-bold tracking-[-0.04em]">{m(p.price)}</span>
                  <span className="text-[12.5px] text-mute">one-time</span>
                </div>
                <div className="my-5 h-px bg-line" />
                <ul className="flex-1 space-y-2.5 text-[13.5px]">
                  {[
                    `First pair bonus ${m(p.direct_pair_bonus)}`,
                    `${m(p.indirect_pair_bonus)} per team pair`,
                    p.daily_cap_pairs > 0 ? `Up to ${p.daily_cap_pairs} pairs a day` : "No daily pair limit",
                    "Carry forward on the strong leg",
                    p.is_manager ? "Monthly salary + turnover pool" : p.is_distributor ? "Own brand & product portal" : "Training academy access",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-ok/15 text-ok">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
                <Link href={`/register?plan=${p.id}`} className={`btn mt-6 w-full ${i === 0 ? "btn-acc" : "btn-ghost"}`}>
                  Join as {p.name.split("/")[0].trim()}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-[12.5px] text-mute">
            Withdraw from {m(Number(s.withdrawal_min))} · {s.withdrawal_fee_percent}% service fee · income depends on real product sales by your team.
            <span className="md:hidden"> Swipe to compare plans →</span>
          </p>
        </div>
      </section>

      {/* ───────── 6. RANK REWARDS ───────── */}
      {ranks.length > 0 && (
        <section id="rewards" className={`border-t border-line bg-side/60 ${SCREEN}`}>
          <div className="mx-auto w-full max-w-7xl px-5">
            <Head eyebrow="Rank rewards" title="Bigger team, bigger rewards" sub="Each rank counts fresh pairs. Take the gift or the cash — your choice." />
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-10 sm:gap-4 lg:grid-cols-4">
              {ranks.map((r, i) => (
                <div
                  key={r.id}
                  className={`rounded-2xl border border-line bg-panel p-3.5 transition hover:border-acc/50 sm:p-5 ${
                    i === ranks.length - 1 && ranks.length % 2 === 1 ? "col-span-2 lg:col-span-1" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-acc/10 text-acc sm:h-9 sm:w-9">
                      {i < 2 ? <Gift size={16} /> : <Trophy size={16} />}
                    </span>
                    <span className="num text-[11px] font-semibold text-mute">RANK {r.level}</span>
                  </div>
                  <div className="mt-2.5 text-[14.5px] font-bold leading-tight sm:mt-4 sm:text-[17px]">{r.name}</div>
                  <div className="num text-[12px] font-medium text-acc sm:text-[13px]">{r.pairs_required.toLocaleString()} pairs</div>
                  <div className="mt-1.5 truncate text-[12px] text-mute sm:mt-3 sm:text-[13px]">
                    {r.reward_item}
                    {r.reward_cash > 0 ? ` · ${m(r.reward_cash)}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────── 7. FAQ + CTA ───────── */}
      <section id="faq" className={`border-t border-line ${SCREEN}`}>
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div>
            <Head center={false} eyebrow="FAQ" title="Questions? Answered." />
            <div className="mt-5 space-y-2">
              {FAQ.map(([qq, a], i) => (
                <details key={qq} className="group rounded-xl border border-line bg-panel px-5 py-3.5 open:border-acc/40 sm:py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14.5px] font-semibold [&::-webkit-details-marker]:hidden">
                    {qq}
                    <ChevronDown size={17} className="shrink-0 text-mute transition group-open:rotate-180 group-open:text-acc" />
                  </summary>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-mute">{a}</p>
                </details>
              ))}
            </div>
          </div>
          <div className="grad relative flex flex-col justify-center overflow-hidden rounded-3xl p-6 text-white sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full bg-white/15 blur-3xl" />
            <ShieldCheck size={30} className="relative hidden opacity-90 sm:block" />
            <h2 className="relative text-[22px] font-bold leading-tight tracking-[-0.03em] sm:mt-4 sm:text-[32px]">
              Start with one product. Build something bigger.
            </h2>
            <p className="relative mt-2 text-[14px] text-white/90 sm:mt-3 sm:text-[15px]">
              Your gadget, business ID and training academy{base ? ` — all for ${m(base.price)}` : ""}.
            </p>
            <div className="relative mt-5 flex flex-wrap gap-2.5 sm:mt-7 sm:gap-3">
              <Link href="/register" className="btn bg-white text-[#0d1117] hover:bg-white/90 sm:h-12 sm:px-[22px] sm:text-[15px]">
                Create my account <ArrowRight size={17} />
              </Link>
              <Link href="/login" className="btn border border-white/40 text-white hover:bg-white/10 sm:h-12 sm:px-[22px] sm:text-[15px]">
                Log in
              </Link>
            </div>
            <p className="relative mt-6 hidden text-[13px] text-white/85 sm:block">Questions? Call {s.support_phone}</p>
          </div>
        </div>
      </section>
    </>
  );
}
