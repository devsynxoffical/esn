"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type NavGroup = { title: string; items: { href: string; label: string; badge?: number }[] };

export default function Shell({
  brand,
  short,
  groups,
  userName,
  userSub,
  topRight,
  logout,
  children,
}: {
  brand: string;
  short: string;
  groups: NavGroup[];
  userName: string;
  userSub: string;
  topRight?: React.ReactNode;
  logout: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" || href === "/admin" ? path === href : path === href || path.startsWith(href + "/");

  const nav = (
    <nav className="flex h-full flex-col overflow-y-auto px-3 pb-6">
      <Link href="/" className="flex items-center gap-2.5 px-2 py-5" onClick={() => setOpen(false)}>
        <span className="grad grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[11px] font-black tracking-tight text-white">{short.slice(0, 3)}</span>
        <span className="text-base font-extrabold">{brand}</span>
      </Link>
      {groups.map((g) => (
        <div key={g.title} className="mb-3">
          <div className="px-2 pb-1.5 pt-2 text-[10.5px] font-bold uppercase tracking-wider text-mute">{g.title}</div>
          {g.items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setOpen(false)}
              className={`mb-0.5 flex items-center justify-between rounded-lg px-3 py-2 text-[13.5px] font-medium transition ${
                isActive(it.href) ? "grad text-white" : "text-fg/85 hover:bg-panel2"
              }`}
            >
              {it.label}
              {!!it.badge && (
                <span className="rounded-full bg-bad px-1.5 text-[10px] font-bold leading-4 text-white">{it.badge}</span>
              )}
            </Link>
          ))}
        </div>
      ))}
      <form action={logout} className="mt-auto px-2 pt-4">
        <button className="btn btn-ghost w-full">Log out</button>
      </form>
    </nav>
  );

  return (
    <div className="min-h-screen overflow-x-clip lg:pl-[232px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] border-r border-line bg-side lg:block">{nav}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] border-r border-line bg-side">{nav}</aside>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur sm:px-6">
        <button
          aria-label="Open menu"
          className="grid h-9 w-9 place-items-center rounded-lg border border-line lg:hidden"
          onClick={() => setOpen(true)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <div className="flex flex-1 items-center justify-end gap-3">
          {topRight}
          <div className="flex items-center gap-2.5">
            <span className="grad grid h-9 w-9 place-items-center rounded-full text-xs font-black text-white">
              {userName.slice(0, 1).toUpperCase()}
            </span>
            <div className="hidden leading-tight sm:block">
              <div className="text-sm font-bold">{userName}</div>
              <div className="text-[11px] text-mute">{userSub}</div>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto min-w-0 max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6">{children}</main>
    </div>
  );
}
