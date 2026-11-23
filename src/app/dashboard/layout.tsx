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
       (SELECT count(*)::int FROM rank_achievements WHERE user_id = u.id AND status = 'choose') AS rewards
     FROM users u LEFT JOIN plans p ON p.id = u.plan_id WHERE u.id = $1`,
    [me.id],
  );
  const active = me.status === "active";

  const groups: NavGroup[] = [
    {
      title: "Main",
      items: [
        { href: "/dashboard", label: "Dashboard" },
        ...(!active ? [{ href: "/dashboard/activate", label: "Activate ID", badge: 1 }] : []),
        { href: "/dashboard/profile", label: "My Profile" },
      ],
    },
    {
      title: "Network",
      items: [
        { href: "/dashboard/tree", label: "Binary Tree" },
        { href: "/dashboard/team", label: "My Team & Referrals" },
        { href: "/dashboard/ranks", label: "Rank Rewards", badge: flags?.rewards || 0 },
      ],
    },
    {
      title: "Wallet",
      items: [
        { href: "/dashboard/wallet", label: "Wallets & Income" },
        { href: "/dashboard/epins", label: "E-Pins" },
        { href: "/dashboard/withdraw", label: "Withdraw" },
        { href: "/dashboard/orders", label: "Orders & Invoices" },
      ],
    },
    {
      title: "More",
      items: [
        { href: "/dashboard/training", label: "Training Academy" },
        ...(flags?.dist ? [{ href: "/dashboard/distributor", label: "Distributor Portal" }] : []),
        ...(flags?.mgr ? [{ href: "/dashboard/manager", label: "Manager Portal" }] : []),
      ],
    },
  ];

  return (
    <Shell
      brand={s.site_name}
      short={s.site_short}
      groups={groups}
      userName={me.name}
      userSub={`${me.code} · ${active ? me.plan_name ?? "Member" : "Inactive"}`}
      logout={logoutAction}
      topRight={
        active ? (
          <Link href="/dashboard/withdraw" className="btn btn-ghost hidden sm:inline-flex">
            {money(me.earning_balance, s.currency)} · Withdraw
          </Link>
        ) : (
          <Link href="/dashboard/activate" className="btn btn-acc">
            Activate ID
          </Link>
        )
      }
    >
      {children}
    </Shell>
  );
}
