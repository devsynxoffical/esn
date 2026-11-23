"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  User,
  Network,
  Users,
  Trophy,
  Wallet,
  Ticket,
  ArrowUpRight,
  Package,
  GraduationCap,
  Store,
  Briefcase,
  BadgeCheck,
  BarChart3,
  Clock,
  BookOpen,
  UserPlus,
  GitFork,
  CreditCard,
  Truck,
  FileText,
  Gift,
  Settings,
  Layers,
  Award,
  ShoppingBag,
  Landmark,
  Megaphone,
  ShieldCheck,
  ScrollText,
  Search,
  Bell,
  Menu,
  LogOut,
  X,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "./ui";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  user: User,
  tree: Network,
  team: Users,
  rank: Trophy,
  wallet: Wallet,
  epin: Ticket,
  withdraw: ArrowUpRight,
  orders: Package,
  training: GraduationCap,
  store: Store,
  manager: Briefcase,
  activate: BadgeCheck,
  chart: BarChart3,
  clock: Clock,
  ledger: BookOpen,
  add: UserPlus,
  fork: GitFork,
  card: CreditCard,
  truck: Truck,
  invoice: FileText,
  gift: Gift,
  settings: Settings,
  layers: Layers,
  award: Award,
  bag: ShoppingBag,
  bank: Landmark,
  megaphone: Megaphone,
  shield: ShieldCheck,
  log: ScrollText,
};

export type NavItem = { href: string; label: string; icon: string; badge?: number };
export type NavGroup = { title: string; items: NavItem[] };

export default function Shell({
  brand,
  groups,
  userName,
  userSub,
  search,
  topExtra,
  cta,
  bell,
  logout,
  children,
}: {
  brand: string;
  groups: NavGroup[];
  userName: string;
  userSub: string;
  search: { action: string; name: string; placeholder: string };
  topExtra?: React.ReactNode;
  cta?: { href: string; label: string };
  bell?: { href: string; count: number };
  logout: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" || href === "/admin" ? path === href : path === href || path.startsWith(href + "/");

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <LogoMark size={34} />
          <span className="text-[17px] font-bold tracking-[-0.02em]">{brand}</span>
        </Link>
        <button aria-label="Close menu" className="text-mute lg:hidden" onClick={() => setOpen(false)}>
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((g) => (
          <div key={g.title} className="mt-4 first:mt-2">
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-mute/80">{g.title}</div>
            {g.items.map((it) => {
              const Icon = ICONS[it.icon] ?? LayoutDashboard;
              const active = isActive(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={`mb-0.5 flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition ${
                    active ? "grad text-white shadow-[0_6px_20px_-10px_rgba(249,115,22,0.8)]" : "text-fg/80 hover:bg-white/[0.04] hover:text-fg"
                  }`}
                >
                  <Icon size={16} strokeWidth={2} className={active ? "text-white" : "text-mute"} />
                  <span className="flex-1 truncate">{it.label}</span>
                  {!!it.badge && (
                    <span className="num min-w-5 rounded-full bg-bad px-1.5 text-center text-[10.5px] font-bold leading-5 text-white">
                      {it.badge > 99 ? "99+" : it.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      <form action={logout} className="border-t border-line p-3">
        <button className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium text-mute hover:bg-white/[0.04] hover:text-fg">
          <LogOut size={16} /> Log out
        </button>
      </form>
    </nav>
  );

  return (
    <div className="min-h-screen overflow-x-clip lg:pl-[240px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r border-line bg-side lg:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[264px] border-r border-line bg-side">{nav}</aside>
        </div>
      )}

      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1520px] items-center gap-3 px-4 sm:px-6">
          <button
            aria-label="Open menu"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-line text-mute lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu size={18} />
          </button>
          <form action={search.action} className="relative hidden max-w-[460px] flex-1 md:block">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
            <input name={search.name} placeholder={search.placeholder} className="inp h-10 pl-10" />
          </form>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {topExtra}
            {bell && (
              <Link
                href={bell.href}
                aria-label="Notifications"
                className="relative grid h-10 w-10 place-items-center rounded-[10px] border border-line bg-panel text-mute hover:text-fg"
              >
                <Bell size={17} />
                {bell.count > 0 && (
                  <span className="num absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-bad px-1 text-center text-[10px] font-bold leading-[18px] text-white">
                    {bell.count > 99 ? "99+" : bell.count}
                  </span>
                )}
              </Link>
            )}
            {cta && (
              <Link href={cta.href} className="btn btn-acc hidden sm:inline-flex">
                {cta.label}
              </Link>
            )}
            <div className="flex items-center gap-2.5 pl-1">
              <span className="grad grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white">
                {userName.slice(0, 1).toUpperCase()}
              </span>
              <div className="hidden leading-tight xl:block">
                <div className="max-w-[160px] truncate text-[13.5px] font-semibold">{userName}</div>
                <div className="max-w-[180px] truncate text-[11.5px] text-mute">{userSub}</div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1520px] px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
