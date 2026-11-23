import Link from "next/link";
import { connection } from "next/server";
import { setupProblem } from "@/lib/bootstrap";
import SetupNotice from "@/components/SetupNotice";
import Shell, { type NavGroup } from "@/components/Shell";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { one } from "@/lib/db";
import { maybeRunClosings } from "@/lib/closing-lazy";
import { logoutAction } from "@/app/actions/public";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await connection(); // always render at request time (never touch the DB during build)
  const problem = await setupProblem();
  if (problem) return <SetupNotice message={problem} />;
  const admin = await requireAdmin();
  await maybeRunClosings();
  const s = await getSettings();
  const c = await one(`SELECT
     (SELECT count(*)::int FROM withdrawals WHERE status = 'pending') AS wd,
     (SELECT count(*)::int FROM orders WHERE status = 'pending') AS orders,
     (SELECT count(*)::int FROM products WHERE status = 'pending' AND active) AS vendor,
     (SELECT count(*)::int FROM rank_achievements WHERE status = 'gift_pending') AS gifts,
     (SELECT count(*)::int FROM users WHERE status = 'inactive' AND role = 'member') AS inactive`);

  const groups: NavGroup[] = [
    {
      title: "Overview",
      items: [
        { href: "/admin", label: "Dashboard", icon: "dashboard" },
        { href: "/admin/closings", label: "Daily Closing", icon: "clock" },
        { href: "/admin/ledger", label: "Company Ledger", icon: "ledger" },
      ],
    },
    {
      title: "Members",
      items: [
        { href: "/admin/members", label: "All Members", icon: "team", badge: c?.inactive },
        { href: "/admin/members/new", label: "Add Member / Top IDs", icon: "add" },
        { href: "/admin/tree", label: "Tree Manager", icon: "tree" },
      ],
    },
    {
      title: "Finance",
      items: [
        { href: "/admin/withdrawals", label: "Payout Requests", icon: "withdraw", badge: c?.wd },
        { href: "/admin/epins", label: "E-Pins & Funds", icon: "epin" },
        { href: "/admin/orders", label: "Orders & Dispatch", icon: "truck", badge: c?.orders },
        { href: "/admin/invoices", label: "Invoices", icon: "invoice" },
        { href: "/admin/rewards", label: "Rank Rewards", icon: "gift", badge: c?.gifts },
      ],
    },
    {
      title: "Plan",
      items: [
        { href: "/admin/plans", label: "Plans & Commission", icon: "layers" },
        { href: "/admin/ranks", label: "Rank Rules", icon: "award" },
        { href: "/admin/products", label: "Products & Store", icon: "bag", badge: c?.vendor },
        { href: "/admin/managers", label: "Managers Payroll", icon: "bank" },
      ],
    },
    {
      title: "System",
      items: [
        { href: "/admin/settings", label: "Master Settings", icon: "settings" },
        { href: "/admin/training", label: "Training Center", icon: "training" },
        { href: "/admin/announcements", label: "Announcements", icon: "megaphone" },
        { href: "/admin/admins", label: "Admins & Password", icon: "shield" },
        { href: "/admin/audit", label: "Audit Logs", icon: "log" },
        { href: "/admin/tools", label: "Testing Tools", icon: "chart" },
      ],
    },
  ];
  const alerts = (c?.wd ?? 0) + (c?.orders ?? 0) + (c?.vendor ?? 0) + (c?.gifts ?? 0);

  return (
    <Shell
      brand={`${s.site_short} Admin`}
      groups={groups}
      userName={admin.name}
      userSub="Full access"
      logout={logoutAction}
      search={{ action: "/admin/members", name: "q", placeholder: "Search members, IDs, mobile, CNIC…" }}
      bell={{ href: "/admin/withdrawals", count: alerts }}
      cta={{ href: "/admin/epins", label: "+ Create E-Pin" }}
      topExtra={
        <Link href="/" className="btn btn-ghost hidden md:inline-flex">
          View store
        </Link>
      }
    >
      {children}
    </Shell>
  );
}
