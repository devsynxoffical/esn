import Link from "next/link";
import Shell, { type NavGroup } from "@/components/Shell";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { one } from "@/lib/db";
import { maybeRunClosings } from "@/lib/closing-lazy";
import { logoutAction } from "@/app/actions/public";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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
        { href: "/admin", label: "Finance Dashboard" },
        { href: "/admin/closings", label: "Daily Closing" },
        { href: "/admin/ledger", label: "Company Ledger" },
      ],
    },
    {
      title: "Members",
      items: [
        { href: "/admin/members", label: "All Members", badge: c?.inactive },
        { href: "/admin/members/new", label: "Add Member / Top IDs" },
        { href: "/admin/tree", label: "Tree Viewer" },
      ],
    },
    {
      title: "Finance",
      items: [
        { href: "/admin/epins", label: "E-Pins & Funds" },
        { href: "/admin/withdrawals", label: "Withdrawals", badge: c?.wd },
        { href: "/admin/orders", label: "Orders & Dispatch", badge: c?.orders },
        { href: "/admin/invoices", label: "Invoices" },
        { href: "/admin/rewards", label: "Rank Rewards", badge: c?.gifts },
      ],
    },
    {
      title: "Plan Setup",
      items: [
        { href: "/admin/settings", label: "Master Settings" },
        { href: "/admin/plans", label: "Plans & Commissions" },
        { href: "/admin/ranks", label: "Ranks & Rewards" },
        { href: "/admin/products", label: "Products & Store", badge: c?.vendor },
        { href: "/admin/managers", label: "Managers Payroll" },
      ],
    },
    {
      title: "Content & System",
      items: [
        { href: "/admin/training", label: "Training Academy" },
        { href: "/admin/announcements", label: "Announcements" },
        { href: "/admin/admins", label: "Admins & Password" },
        { href: "/admin/audit", label: "Audit Log" },
      ],
    },
  ];

  return (
    <Shell
      brand={`${s.site_short} Admin`}
      short={s.site_short}
      groups={groups}
      userName={admin.name}
      userSub="Super Admin"
      logout={logoutAction}
      topRight={
        <>
          <Link href="/admin/epins" className="btn btn-acc">
            + E-Pins
          </Link>
          <Link href="/" className="btn btn-ghost hidden sm:inline-flex">
            View store
          </Link>
        </>
      }
    >
      {children}
    </Shell>
  );
}
