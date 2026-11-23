import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { effectiveCap, rankProgress, todayIn } from "@/lib/engine";
import { money, num, dt, TX_LABEL } from "@/lib/fmt";
import { Card, Stat, Flash, Badge, Progress, Table, Empty } from "@/components/ui";
import CopyButton from "@/components/CopyButton";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const me = await requireMember();
  const s = await getSettings();
  const cur = s.currency;

  if (me.status !== "active") {
    return (
      <>
        <Flash sp={sp} />
        <Card>
          <div className="py-6 text-center">
            <h1 className="text-2xl font-black">Your ID {me.code} is inactive</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-mute">
              Pay {money(me.plan_price, cur)} at the office to get your 16-digit E-Pin, then activate your ID. Your product
              will be dispatched and your business dashboard unlocks instantly.
            </p>
            <Link href="/dashboard/activate" className="btn btn-acc mt-5 px-6 py-3">
              Enter E-Pin & Activate
            </Link>
          </div>
        </Card>
      </>
    );
  }

  const day = await todayIn((await import("@/lib/db")).pool(), s.closing_timezone);
  const [u, ranks, today, recent, ann, sums] = await Promise.all([
    one(
      `SELECT u.*, p.daily_cap_pairs, p.daily_cap_amount, p.indirect_pair_bonus, p.direct_pair_bonus
       FROM users u JOIN plans p ON p.id = u.plan_id WHERE u.id = $1`,
      [me.id],
    ),
    q("SELECT * FROM ranks WHERE active ORDER BY level"),
    one<{ n: number; amt: number }>(
      `SELECT count(*)::int AS n, coalesce(sum(amount),0) AS amt FROM pairs WHERE user_id = $1 AND day = $2 AND kind = 'indirect'`,
      [me.id, day],
    ),
    q("SELECT * FROM transactions WHERE user_id = $1 ORDER BY id DESC LIMIT 8", [me.id]),
    q("SELECT * FROM announcements WHERE active ORDER BY id DESC LIMIT 4"),
    one(
      `SELECT
         coalesce(sum(amount) FILTER (WHERE type = 'direct_pair'),0) AS direct,
         coalesce(sum(amount) FILTER (WHERE type = 'pair_bonus'),0) AS pair,
         coalesce(sum(amount) FILTER (WHERE type = 'rank_reward'),0) AS rank,
         coalesce(sum(amount) FILTER (WHERE type NOT IN ('direct_pair','pair_bonus','rank_reward') AND amount > 0 AND wallet='earning' AND type NOT IN ('withdrawal_refund','admin_adjust')),0) AS other
       FROM transactions WHERE user_id = $1`,
      [me.id],
    ),
  ]);
  const cap = await effectiveCap((await import("@/lib/db")).pool(), u!);
  const rp = rankProgress(u!, ranks, s);
  const directs = await one<{ n: number }>("SELECT count(*)::int AS n FROM users WHERE sponsor_id = $1 AND status = 'active'", [me.id]);
  const site = `https://${s.site_domain}`;
  const leftLink = `${site}/register?ref=${me.code}&leg=L`;
  const rightLink = `${site}/register?ref=${me.code}&leg=R`;

  return (
    <>
      <Flash sp={sp} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat hero label="Total earnings" value={money(u!.total_earned, cur)} sub={`Rank: ${rp.current?.name ?? "Starter"}`} />
        <Stat label="Earning wallet" value={money(u!.earning_balance, cur)} sub={`E-Pin wallet ${money(u!.epin_balance, cur)}`} tone="ok" />
        <Stat label="Left team" value={num(u!.left_count)} sub={`Carry fwd: ${num(u!.left_carry)}`} />
        <Stat label="Right team" value={num(u!.right_count)} sub={`Carry fwd: ${num(u!.right_carry)}`} />
        <Stat
          label="Matched pairs"
          value={num(u!.total_pairs)}
          sub={u!.first_pair_done ? "Direct pair ✓ unlocked" : "Direct pair locked"}
          tone={u!.first_pair_done ? "ok" : "warn"}
        />
        <Stat
          label="Today's pairs"
          value={`${today!.n}${cap.pairs > 0 ? ` / ${cap.pairs}` : ""}`}
          sub={`Daily cap ${cap.amount > 0 ? money(cap.amount, cur) : cap.pairs > 0 ? `${cap.pairs} pairs` : "none"}`}
          tone="warn"
        />
      </div>

      {!u!.first_pair_done && (
        <div className="mt-4 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm">
          <b>Unlock your first pair ({money(u!.direct_pair_bonus, cur)}):</b> bring 1 member through your <b>Left link</b> and 1
          through your <b>Right link</b>.{" "}
          {s.first_pair_requires_direct && (
            <>
              Your own direct referrals: Left {u!.direct_left} · Right {u!.direct_right}.
            </>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Referral links" className="lg:col-span-2">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["Left side link", leftLink],
              ["Right side link", rightLink],
            ].map(([label, link]) => (
              <div key={label} className="rounded-lg border border-dashed border-acc/60 p-3">
                <div className="text-xs font-semibold text-mute">{label}</div>
                <div className="mt-1 break-all font-mono text-[12.5px]">{link}</div>
                <div className="mt-2 flex gap-2">
                  <CopyButton text={link} />
                  <a
                    className="btn btn-ghost btn-sm"
                    href={`https://wa.me/?text=${encodeURIComponent(`Join ${s.site_name}: ${link}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["/dashboard/withdraw", "Withdraw"],
              ["/dashboard/epins", "E-Pins"],
              ["/dashboard/team", "Activate member"],
              ["/dashboard/tree", "View tree"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="rounded-lg border border-line bg-panel2 px-3 py-3 text-center text-sm font-semibold hover:border-acc">
                {label}
              </Link>
            ))}
          </div>
        </Card>

        <Card title="Rank progress" action={rp.next ? `Next: ${rp.next.name}` : "Top rank"}>
          {rp.next ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-mute">{s.rank_mode === "fresh" ? "Fresh pairs" : "Total pairs"}</span>
                <span className="font-bold">
                  {num(rp.have)} / {num(rp.need)}
                </span>
              </div>
              <Progress pct={rp.pct} className="mt-2" />
              <p className="mt-3 text-sm text-mute">
                Reward: <b className="text-fg">{rp.next.reward_item}</b>
                {rp.next.reward_cash > 0 && <> or {money(rp.next.reward_cash, cur)} cash</>}
              </p>
            </>
          ) : (
            <p className="text-sm">You have reached the highest rank. 🎉</p>
          )}
          <div className="mt-4 text-sm text-mute">
            Direct referrals: <b className="text-fg">{directs!.n}</b>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Earnings breakdown">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-mute">Direct pair bonus</span>
              <b>{money(sums!.direct, cur)}</b>
            </li>
            <li className="flex justify-between">
              <span className="text-mute">Binary pair income</span>
              <b>{money(sums!.pair, cur)}</b>
            </li>
            <li className="flex justify-between">
              <span className="text-mute">Rank rewards</span>
              <b>{money(sums!.rank, cur)}</b>
            </li>
            <li className="flex justify-between">
              <span className="text-mute">Other income</span>
              <b>{money(sums!.other, cur)}</b>
            </li>
            <li className="flex justify-between border-t border-line pt-2">
              <span className="text-mute">Today pending (pays at midnight)</span>
              <b className="text-warn">{money(s.pair_credit_mode === "closing" ? today!.amt : 0, cur)}</b>
            </li>
          </ul>
        </Card>
        <Card title="Recent transactions" action={<Link href="/dashboard/wallet">View all</Link>} className="lg:col-span-2">
          {recent.length ? (
            <Table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Detail</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap">{TX_LABEL[t.type] ?? t.type}</td>
                    <td className="text-mute">{t.note}</td>
                    <td className={`whitespace-nowrap font-bold ${t.amount > 0 ? "text-ok" : "text-bad"}`}>
                      {t.amount > 0 ? "+" : ""}
                      {money(t.amount, cur)}
                    </td>
                    <td className="whitespace-nowrap text-mute">{dt(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty>No transactions yet.</Empty>
          )}
        </Card>
      </div>

      {ann.length > 0 && (
        <Card title="Announcements" className="mt-4">
          <ul className="divide-y divide-line">
            {ann.map((a) => (
              <li key={a.id} className="py-2.5">
                <div className="flex items-center gap-2 font-semibold">
                  {a.title} <Badge tone="acc">New</Badge>
                </div>
                <p className="mt-0.5 whitespace-pre-line text-sm text-mute">{a.body}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
