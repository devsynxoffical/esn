import Link from "next/link";
import { connection } from "next/server";
import { setupProblem } from "@/lib/bootstrap";
import SetupNotice from "@/components/SetupNotice";
import Shell, { type NavGroup } from "@/components/Shell";
import { requireMember } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { one } from "@/lib/db";
import { money } from "@/lib/fmt";
import { distributorWhere, managerWhere } from "@/lib/ops";
import { maybeRunClosings } from "@/lib/closing-lazy";
import { logoutAction } from "@/app/actions/public";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  await connection(); // always render at request time (never touch the DB during build)
  const problem = await setupProblem();
  if (problem) return <SetupNotice message={problem} />;
  const me = await requireMember();
  await maybeRunClosings();
  const s = await getSettings();
  const flags = await one(
    `SELECT ${distributorWhere} AS dist, (${managerWhere}) AS mgr,
       (SELECT count(*)::int FROM rank_achievements WHERE user_id = u.id AND status = 'choose') AS rewards,
       (SELECT count(*)::int FROM users x WHERE x.sponsor_id = u.id AND x.status = 'inactive') AS waiting,
       (SELECT count(*)::int FROM announcements WHERE active AND created_at > now() - interval '7 days') AS news
     FROM users u LEFT JOIN plans p ON p.id = u.plan_id WHERE u.id = $1`,
    [me.id],
  );
  const active = me.status === "active";
  const rank = active
    ? await one<{ name: string }>("SELECT name FROM ranks WHERE level <= $1 AND active ORDER BY level DESC LIMIT 1", [me.rank_level])
    : null;

  const groups: NavGroup[] = [
    {
      title: "Main",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
        ...(!active ? [{ href: "/dashboard/activate", label: "Activate ID", icon: "activate", badge: 1 }] : []),
        { href: "/dashboard/profile", label: "My Profile", icon: "user" },
      ],
    },
    {
      title: "Network",
      items: [
        { href: "/dashboard/tree", label: "Binary Tree", icon: "tree" },
        { href: "/dashboard/team", label: "Direct Referrals", icon: "team", badge: flags?.waiting },
        { href: "/dashboard/ranks", label: "Rank Rewards", icon: "rank", badge: flags?.rewards },
      ],
    },
    {
      title: "Wallet",
      items: [
        { href: "/dashboard/wallet", label: "Wallet & Earnings", icon: "wallet" },
        { href: "/dashboard/withdraw", label: "Withdraw", icon: "withdraw" },
        { href: "/dashboard/epins", label: "Packages & E-Pins", icon: "epin" },
        { href: "/dashboard/orders", label: "Orders & Invoices", icon: "orders" },
      ],
    },
    {
      title: "More",
      items: [
        { href: "/dashboard/training", label: "Training Center", icon: "training" },
        ...(flags?.dist ? [{ href: "/dashboard/distributor", label: "Distributor Portal", icon: "store" }] : []),
        ...(flags?.mgr ? [{ href: "/dashboard/manager", label: "Manager Portal", icon: "manager" }] : []),
      ],
    },
  ];

  return (
    <Shell
      brand={s.site_short}
      groups={groups}
      userName={me.name}
      userSub={`${me.code} · ${active ? (rank?.name ?? "Starter") : "Inactive"}`}
      logout={logoutAction}
      search={{ action: "/dashboard/tree", name: "q", placeholder: "Search team members by ID…" }}
      bell={{ href: "/dashboard#announcements", count: (flags?.news ?? 0) + (flags?.rewards ?? 0) }}
      cta={active ? { href: "/dashboard/team", label: "+ Invite Member" } : { href: "/dashboard/activate", label: "Activate ID" }}
      topExtra={
        active ? (
          <Link href="/dashboard/withdraw" className="btn btn-ghost hidden md:inline-flex">
            <span className="num">{money(me.earning_balance, s.currency)}</span>
            <span className="text-mute">·</span> Withdraw
          </Link>
        ) : null
      }
    >
      {children}
    </Shell>
  );
}
