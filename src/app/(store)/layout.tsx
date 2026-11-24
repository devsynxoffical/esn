import Link from "next/link";
import { connection } from "next/server";
import { Menu, Phone, Mail, MapPin, MessageCircle, ArrowRight } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Logo, LogoMark } from "@/components/ui";
import { setupProblem } from "@/lib/bootstrap";
import SetupNotice from "@/components/SetupNotice";

const NAV = [
  ["/#products", "Products"],
  ["/#how-it-works", "How it works"],
  ["/#earnings", "Earnings plan"],
  ["/#rewards", "Rewards"],
  ["/#faq", "FAQ"],
];

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  await connection(); // always render at request time (never touch the DB during build)
  const problem = await setupProblem();
  if (problem) return <SetupNotice message={problem} />;
  const [u, s] = await Promise.all([currentUser(), getSettings()]);
  const dash = u ? (u.role === "admin" ? "/admin" : "/dashboard") : null;
  const wa = String(s.support_whatsapp).replace(/\D/g, "");

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-bg/75 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-5">
          <Link href="/" aria-label="Home" className="flex min-w-0 shrink items-center gap-2.5">
            <LogoMark size={34} />
            <span className="truncate text-[15px] font-bold tracking-[-0.02em] sm:text-[17px]">{s.site_name}</span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="rounded-lg px-3.5 py-2 text-[14px] font-medium text-fg/75 transition hover:text-fg">
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {dash ? (
              <Link href={dash} className="btn btn-acc h-9 px-3.5 text-[13px] sm:h-10 sm:px-4 sm:text-[14px]">
                {u!.role === "admin" ? "Admin panel" : "My dashboard"}
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost hidden sm:inline-flex">
                  Log in
                </Link>
                <Link href="/register" className="btn btn-acc h-9 px-3.5 text-[13px] sm:h-10 sm:px-4 sm:text-[14px]">
                  Join now
                </Link>
              </>
            )}
            <details className="group relative lg:hidden">
              <summary className="grid h-9 w-9 cursor-pointer sm:h-10 sm:w-10 list-none place-items-center rounded-[10px] border border-line text-mute [&::-webkit-details-marker]:hidden">
                <Menu size={18} />
              </summary>
              <div className="absolute right-0 top-12 w-56 rounded-xl border border-line bg-panel p-2 shadow-2xl shadow-black/50">
                {NAV.map(([href, label]) => (
                  <Link key={href} href={href} className="block rounded-lg px-3 py-2.5 text-[14px] text-fg/85 hover:bg-white/5">
                    {label}
                  </Link>
                ))}
                {!dash && (
                  <Link href="/login" className="mt-1 block rounded-lg border-t border-line px-3 py-2.5 text-[14px] text-fg/85 hover:bg-white/5">
                    Log in
                  </Link>
                )}
              </div>
            </details>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-side">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            <Logo name={s.site_name} />
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-mute">{s.site_tagline}</p>
            <Link href="/register" className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-acc hover:underline">
              Start your business <ArrowRight size={15} />
            </Link>
          </div>
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-fg/90">Shop</div>
            <ul className="mt-4 space-y-2.5 text-[14px] text-mute">
              <li><Link className="hover:text-fg" href="/#products">Wireless handsfree</Link></li>
              <li><Link className="hover:text-fg" href="/#products">Smart watches</Link></li>
              <li><Link className="hover:text-fg" href="/#products">All products</Link></li>
              <li><Link className="hover:text-fg" href="/#faq">Delivery & warranty</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-fg/90">Business</div>
            <ul className="mt-4 space-y-2.5 text-[14px] text-mute">
              <li><Link className="hover:text-fg" href="/#how-it-works">How it works</Link></li>
              <li><Link className="hover:text-fg" href="/#earnings">Earnings plan</Link></li>
              <li><Link className="hover:text-fg" href="/#rewards">Rank rewards</Link></li>
              <li><Link className="hover:text-fg" href="/login">Member login</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-fg/90">Contact</div>
            <ul className="mt-4 space-y-3 text-[14px] text-mute">
              <li className="flex items-start gap-2.5">
                <Phone size={16} className="mt-0.5 shrink-0 text-acc" /> {s.support_phone}
              </li>
              {wa && (
                <li>
                  <a className="flex items-start gap-2.5 hover:text-fg" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                    <MessageCircle size={16} className="mt-0.5 shrink-0 text-acc" /> WhatsApp {s.support_whatsapp}
                  </a>
                </li>
              )}
              <li className="flex items-start gap-2.5">
                <Mail size={16} className="mt-0.5 shrink-0 text-acc" /> {s.support_email}
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin size={16} className="mt-0.5 shrink-0 text-acc" /> <span className="whitespace-pre-line">{s.office_address}</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-line">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-5 text-[13px] text-mute md:flex-row">
            <span>
              © {new Date().getFullYear()} {s.site_name}. All rights reserved.
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {["JazzCash", "EasyPaisa", "Bank transfer", "Cash on delivery"].map((m) => (
                <span key={m} className="rounded-md border border-line bg-panel px-2.5 py-1 text-[12px] font-medium text-fg/80">
                  {m}
                </span>
              ))}
            </div>
            <Link href="/terms" className="hover:text-fg">
              Terms & privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
