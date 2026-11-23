import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Logo } from "@/components/ui";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [u, s] = await Promise.all([currentUser(), getSettings()]);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="Home">
            <Logo short={s.site_short} name={s.site_name} />
          </Link>
          <nav className="flex items-center gap-1 text-sm font-semibold sm:gap-2">
            <Link href="/#shop" className="hidden rounded-lg px-3 py-2 hover:bg-panel sm:block">
              Shop
            </Link>
            <Link href="/#business" className="hidden rounded-lg px-3 py-2 hover:bg-panel sm:block">
              Business
            </Link>
            {u ? (
              <Link href={u.role === "admin" ? "/admin" : "/dashboard"} className="btn btn-acc">
                {u.role === "admin" ? "Admin Panel" : "My Dashboard"}
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost">
                  Login
                </Link>
                <Link href="/register" className="btn btn-acc">
                  Join Now
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line bg-side">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm sm:grid-cols-3">
          <div>
            <Logo short={s.site_short} name={s.site_name} />
            <p className="mt-3 text-mute">{s.site_tagline}</p>
          </div>
          <div>
            <div className="mb-2 font-bold">Contact</div>
            <p className="text-mute">Phone: {s.support_phone}</p>
            <p className="text-mute">WhatsApp: {s.support_whatsapp}</p>
            <p className="text-mute">Email: {s.support_email}</p>
          </div>
          <div>
            <div className="mb-2 font-bold">Office</div>
            <p className="whitespace-pre-line text-mute">{s.office_address}</p>
            <div className="mt-3 flex gap-3">
              <Link href="/terms" className="text-acc">
                Terms & Policy
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-line py-4 text-center text-xs text-mute">
          © {new Date().getFullYear()} {s.site_name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
