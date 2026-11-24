import Link from "next/link";
import {
  ArrowUpRight,
  Ticket,
  BadgeCheck,
  Network,
  UserPlus,
  Trophy,
  GraduationCap,
  Package,
} from "lucide-react";
import { requireMember } from "@/lib/auth";
import { q, one, pool } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { effectiveCap, rankProgress, todayIn } from "@/lib/engine";
import { subtree } from "@/lib/tree";
import { money, num, TX_LABEL, dOnly } from "@/lib/fmt";
import { Card, Stat, Flash, Badge, Progress, Table, Empty, Bars, Donut, Row } from "@/components/ui";
import CopyButton from "@/components/CopyButton";
import MiniTree from "@/components/MiniTree";

const EARN = "('direct_pair','pair_bonus','direct_referral','rank_reward','salary','pool_share','vendor_sale')";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const me = await requireMember();
  const s = await getSettings();
  const cur = s.currency;
  const m = (n: number) => money(n, cur);

  if (me.status !== "active") {
    return (
      <>
        <Flash sp={sp} />
        <Card>
          <div className="mx-auto max-w-md py-10 text-center">
            <div className="grad mx-auto grid h-14 w-14 place-items-center rounded-2xl text-white">
              <BadgeCheck size={26} />
            </div>
            <h1 className="mt-5 text-[22px] font-bold">Activate your ID {me.code}</h1>
            <p className="mt-2 text-[14px] text-mute">
              Pay {m(me.plan_price)} at the office to receive your 16-digit E-Pin. Your product is dispatched and your business
              dashboard unlocks instantly.
            </p>
            <Link href="/dashboard/activate" className="btn btn-acc btn-lg mt-6">
              Enter E-Pin & Activate
            </Link>
          </div>
        </Card>
      </>
    );
  }

  const day = await todayIn(pool(), s.closing_timezone);
  const [u, ranks, today, recent, ann, sums, weekly, leaders, nodes, order, directs] = await Promise.all([
    one(
      `SELECT u.*, p.daily_cap_pairs, p.daily_cap_amount, p.price AS plan_price, p.direct_pair_bonus
       FROM users u JOIN plans p ON p.id = u.plan_id WHERE u.id = $1`,
      [me.id],
    ),
    q("SELECT * FROM ranks WHERE active ORDER BY level"),
    one<{ n: number; amt: number }>(
      `SELECT count(*)::int AS n, coalesce(sum(amount),0) AS amt FROM pairs WHERE user_id = $1 AND day = $2 AND kind = 'indirect'`,
      [me.id, day],
    ),
    q("SELECT * FROM transactions WHERE user_id = $1 ORDER BY id DESC LIMIT 6", [me.id]),
    q("SELECT * FROM announcements WHERE active ORDER BY id DESC LIMIT 4"),
    one(
      `SELECT
         coalesce(sum(amount) FILTER (WHERE type = 'pair_bonus'),0) AS pair,
         coalesce(sum(amount) FILTER (WHERE type = 'direct_pair'),0) AS direct,
         coalesce(sum(amount) FILTER (WHERE type = 'rank_reward'),0) AS rank,
         coalesce(sum(amount) FILTER (WHERE type IN ('direct_referral','salary','pool_share','vendor_sale')),0) AS other,
         coalesce(sum(amount) FILTER (WHERE type IN ${EARN} AND created_at > now() - interval '7 days'),0) AS week
       FROM transactions WHERE user_id = $1`,
      [me.id],
    ),
    q<{ label: string; value: number }>(
      `SELECT 'W' || (8 - g.i) AS label, coalesce((
          SELECT sum(t.amount) FROM transactions t WHERE t.user_id = $1 AND t.type IN ('pair_bonus','direct_pair')
            AND t.created_at >= date_trunc('week', now()) - (g.i || ' weeks')::interval
            AND t.created_at <  date_trunc('week', now()) - ((g.i - 1) || ' weeks')::interval), 0)::float AS value
       FROM generate_series(7, 0, -1) AS g(i)`,
      [me.id],
    ),
    q(
      `SELECT u.name, u.code, sum(t.amount) AS total FROM transactions t JOIN users u ON u.id = t.user_id
       WHERE t.type IN ${EARN} AND t.created_at >= date_trunc('month', now()) AND NOT u.is_company AND u.role = 'member'
       GROUP BY u.id ORDER BY total DESC LIMIT 5`,
    ),
    subtree(me.id, 4),
    one("SELECT status, tracking_id FROM orders WHERE user_id = $1 AND kind = 'package' ORDER BY id DESC LIMIT 1", [me.id]),
    one<{ n: number }>("SELECT count(*)::int AS n FROM users WHERE sponsor_id = $1 AND status = 'active'", [me.id]),
  ]);
  const cap = await effectiveCap(pool(), u!);
  const rp = rankProgress(u!, ranks, s);
  const site = `https://${s.site_domain}`;
  const links = [
    { label: "Left link", url: `${site}/register?ref=${me.code}&leg=L` },
    { label: "Right link", url: `${site}/register?ref=${me.code}&leg=R` },
  ];
  const vol = Math.max(1, u!.left_count, u!.right_count);

  const actions = [
    { href: "/dashboard/withdraw", label: "Withdraw", Icon: ArrowUpRight },
    { href: "/dashboard/epins", label: "E-Pins", Icon: Ticket },
    { href: "/dashboard/team", label: "Activate", Icon: BadgeCheck },
    { href: "/dashboard/tree", label: "My Tree", Icon: Network },
    { href: "/dashboard/team", label: "Invite", Icon: UserPlus },
    { href: "/dashboard/ranks", label: "Rewards", Icon: Trophy },
    { href: "/dashboard/training", label: "Training", Icon: GraduationCap },
    { href: "/dashboard/orders", label: "Orders", Icon: Package },
  ];

  return (
    <>
      <Flash sp={sp} />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
        <Stat hero label="Total earnings" value={m(u!.total_earned)} sub={`+${m(sums!.week)} this week`} />
        <Stat label="Wallet balance" value={m(u!.earning_balance)} sub={`${m(s.pair_credit_mode === "closing" ? today!.amt : 0)} pending`} tone="ok" />
        <Stat label="Left team" value={num(u!.left_count)} sub={`Carry fwd: ${num(u!.left_carry)}`} tone="ok" />
        <Stat label="Right team" value={num(u!.right_count)} sub={`Carry fwd: ${num(u!.right_carry)}`} tone="ok" />
        <Stat
          label="Matched pairs"
          value={num(u!.total_pairs)}
          sub={u!.first_pair_done ? `Today: ${today!.n}${cap.pairs > 0 ? ` / ${cap.pairs}` : ""}` : "First pair locked"}
          tone={u!.first_pair_done ? "ok" : "warn"}
        />
        <Stat label="Direct referrals" value={num(directs!.n)} sub={`Daily cap: ${cap.pairs > 0 ? `${cap.pairs} pairs` : "none"}`} tone="warn" />
      </div>

      {!u!.first_pair_done && (
        <div className="mt-4 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-[13.5px] text-warn">
          Unlock your first pair ({m(u!.direct_pair_bonus)}): bring 1 member from your <b>Left link</b> and 1 from your{" "}
          <b>Right link</b>. Your own directs — Left {u!.direct_left} · Right {u!.direct_right}.
        </div>
      )}

      {/* Row 2 */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card
          title="Binary tree"
          action={
            <span className="flex gap-3">
              <Link href="/dashboard/tree">Expand</Link>
              <Link href="/dashboard/team">Activate</Link>
            </span>
          }
          className="xl:col-span-5"
        >
          <MiniTree nodes={nodes} rootId={me.id} href={(c) => `/dashboard/tree?root=${c}`} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              ["Left leg volume", u!.left_count],
              ["Right leg volume", u!.right_count],
            ].map(([l, c]) => (
              <div key={l as string} className="rounded-xl border border-line bg-bg/60 p-4">
                <div className="text-[12px] text-mute">{l}</div>
                <div className="num mt-0.5 text-[19px] font-bold">{m((c as number) * u!.plan_price)}</div>
                <Progress pct={((c as number) / vol) * 100} className="mt-2.5" />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Earnings breakdown" action="All time" className="xl:col-span-4">
          <Donut
            format={m}
            data={[
              { label: "Pair bonus", value: sums!.pair },
              { label: "Direct bonus", value: sums!.direct },
              { label: "Rank reward", value: sums!.rank },
              { label: "Other income", value: sums!.other },
            ]}
          />
          <h3 className="mb-3 mt-6 text-[15px] font-semibold">Weekly pair bonus</h3>
          <Bars data={weekly} height={130} format={m} />
        </Card>

        <Card title="Quick actions" className="xl:col-span-3">
          <div className="grid grid-cols-4 gap-2">
            {actions.map(({ href, label, Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex flex-col items-center gap-2 rounded-xl border border-line bg-bg/60 px-1 py-3 text-[12px] font-medium transition hover:border-acc/60"
              >
                <span className="grad grid h-8 w-8 place-items-center rounded-lg text-white">
                  <Icon size={16} />
                </span>
                {label}
              </Link>
            ))}
          </div>
          <h3 className="mb-2.5 mt-5 text-[15px] font-semibold">Referral links</h3>
          <div className="space-y-2">
            {links.map((l) => (
              <div key={l.label} className="flex items-center gap-2 rounded-xl border border-dashed border-acc/60 bg-bg/40 py-2 pl-3 pr-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] text-mute">{l.label}</div>
                  <div className="truncate font-mono text-[12px]">{l.url.replace(/^https:\/\//, "")}</div>
                </div>
                <CopyButton text={l.url} />
              </div>
            ))}
          </div>
          <h3 className="mb-1 mt-5 text-[15px] font-semibold">Account status</h3>
          <div className="flex items-center justify-between border-b border-line py-2.5 text-[13.5px]">
            <span className="text-mute">Business ID</span>
            <Badge>active</Badge>
          </div>
          <div className="flex items-center justify-between border-b border-line py-2.5 text-[13.5px]">
            <span className="text-mute">Product delivery</span>
            <Badge>{order?.status ?? "pending"}</Badge>
          </div>
          <div className="flex items-center justify-between py-2.5 text-[13.5px]">
            <span className="text-mute">Payout account</span>
            <Badge tone={me.payout_account ? "ok" : "warn"}>{me.payout_account ? "Added" : "Not added"}</Badge>
          </div>
        </Card>
      </div>

      {/* Row 3 */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card
          title="Rank progress"
          action={<Link href="/dashboard/ranks">{rp.next ? `${rp.current?.name ?? "Starter"} → ${rp.next.name}` : "Top rank"}</Link>}
          className="xl:col-span-4"
        >
          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg border border-ok/60 px-3 py-1.5 text-[12.5px] font-medium text-ok">Starter</span>
            {ranks.map((r) => {
              const done = r.level < u!.rank_level;
              const currentR = r.level === u!.rank_level;
              return (
                <span
                  key={r.id}
                  className={`rounded-lg px-3 py-1.5 text-[12.5px] font-medium ${
                    currentR ? "grad text-white" : done ? "border border-ok/60 text-ok" : "border border-line text-mute"
                  }`}
                >
                  {r.name}
                </span>
              );
            })}
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <div className="flex justify-between text-[13.5px]">
                <span className="text-mute">Pairs needed</span>
                <span className="num font-semibold">
                  {num(rp.have)} / {num(rp.need || rp.have)}
                </span>
              </div>
              <Progress pct={rp.pct} className="mt-2" />
            </div>
            <div>
              <div className="flex justify-between text-[13.5px]">
                <span className="text-mute">Today&apos;s pairs (daily cap)</span>
                <span className="num font-semibold">
                  {today!.n} / {cap.pairs || "∞"}
                </span>
              </div>
              <Progress pct={cap.pairs ? (today!.n / cap.pairs) * 100 : 0} className="mt-2" />
            </div>
            <div>
              <div className="flex justify-between text-[13.5px]">
                <span className="text-mute">Direct actives (L / R)</span>
                <span className="num font-semibold">
                  {u!.direct_left} / {u!.direct_right}
                </span>
              </div>
              <Progress pct={u!.first_pair_done ? 100 : ((Math.min(1, u!.direct_left) + Math.min(1, u!.direct_right)) / 2) * 100} className="mt-2" />
            </div>
          </div>
          {rp.next && (
            <p className="mt-4 text-[13px] text-mute">
              Next reward: <b className="text-fg">{rp.next.reward_item}</b>
              {rp.next.reward_cash > 0 && <> or {m(rp.next.reward_cash)} cash</>}
            </p>
          )}
        </Card>

        <Card title="Recent transactions" action={<Link href="/dashboard/wallet">View all</Link>} className="xl:col-span-4">
          {recent.length ? (
            <Table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Date</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="font-medium">{TX_LABEL[t.type] ?? t.type}</div>
                      <div className="max-w-[220px] truncate text-[12px] text-mute">{t.note}</div>
                    </td>
                    <td className="whitespace-nowrap text-[12.5px] text-mute">{dOnly(t.created_at)}</td>
                    <td className={`num whitespace-nowrap text-right font-semibold ${t.amount > 0 ? "text-ok" : "text-bad"}`}>
                      {t.amount > 0 ? "+" : ""}
                      {num(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty>No transactions yet.</Empty>
          )}
        </Card>

        <div className="min-w-0 space-y-4 xl:col-span-4">
          <Card title="Leaderboard" action="This month">
            {leaders.length ? (
              leaders.map((l, i) => (
                <Row
                  key={l.code}
                  label={
                    <span>
                      <span className="mr-2 font-semibold text-acc">{i + 1}</span>
                      <span className="text-fg">{l.name}</span>
                    </span>
                  }
                  value={m(l.total)}
                />
              ))
            ) : (
              <Empty>No earnings yet this month.</Empty>
            )}
          </Card>
          <Card title={<span id="announcements">Announcements</span>} action={ann.length ? `${ann.length} new` : undefined}>
            {ann.length ? (
              ann.map((a) => (
                <div key={a.id} className="border-b border-line py-2.5 last:border-0">
                  <div className="flex items-center justify-between gap-3 text-[13.5px]">
                    <span className="font-medium">{a.title}</span>
                    <Badge tone="acc">New</Badge>
                  </div>
                  {a.body && <p className="mt-0.5 line-clamp-2 text-[12.5px] text-mute">{a.body}</p>}
                </div>
              ))
            ) : (
              <Empty>No announcements.</Empty>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
