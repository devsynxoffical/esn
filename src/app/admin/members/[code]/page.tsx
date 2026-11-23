import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { q, one, pool } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { effectiveCap, rankProgress } from "@/lib/engine";
import { money, dt, TX_LABEL } from "@/lib/fmt";
import { Card, PageHead, Flash, Table, Badge, Stat, Check, Empty } from "@/components/ui";
import {
  updateMemberAction,
  memberStatusAction,
  resetPasswordAction,
  walletAdjustAction,
  activateMemberAdminAction,
} from "@/app/actions/admin";

export default async function MemberDetail({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  await requireAdmin();
  const s = await getSettings();
  const cur = s.currency;
  const u = await one(
    `SELECT u.*, p.name AS plan, p.daily_cap_pairs, p.daily_cap_amount, sp.code AS sponsor_code, sp.name AS sponsor_name,
            par.code AS parent_code
     FROM users u LEFT JOIN plans p ON p.id = u.plan_id LEFT JOIN users sp ON sp.id = u.sponsor_id
     LEFT JOIN users par ON par.id = u.parent_id WHERE u.code = $1 AND u.role = 'member'`,
    [decodeURIComponent(code)],
  );
  if (!u) notFound();
  const [plans, txs, ranks, directs, wds] = await Promise.all([
    q("SELECT id, name, price FROM plans ORDER BY sort, id"),
    q("SELECT * FROM transactions WHERE user_id = $1 ORDER BY id DESC LIMIT 40", [u.id]),
    q("SELECT * FROM ranks WHERE active ORDER BY level"),
    q("SELECT code, name, status, position FROM users WHERE sponsor_id = $1 ORDER BY id DESC LIMIT 50", [u.id]),
    q("SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY id DESC LIMIT 10", [u.id]),
  ]);
  const cap = await effectiveCap(pool(), u);
  const rp = rankProgress(u, ranks, s);

  return (
    <>
      <PageHead
        title={`${u.name} · ${u.code}`}
        sub={
          <>
            <Badge>{u.status}</Badge> {u.plan} · Sponsor {u.sponsor_code ?? "—"} · Placed under {u.parent_code ?? "—"}{" "}
            {u.position ? `(${u.position === "L" ? "Left" : "Right"})` : ""}
          </>
        }
        actions={
          <>
            {u.status !== "inactive" && (
              <Link href={`/admin/tree?root=${u.code}`} className="btn btn-ghost">
                View tree
              </Link>
            )}
            <form action={memberStatusAction}>
              <input type="hidden" name="code" value={u.code} />
              {u.status === "blocked" ? (
                <button name="do" value="unblock" className="btn btn-ok">
                  Unblock
                </button>
              ) : (
                <button name="do" value="block" className="btn btn-bad">
                  Block
                </button>
              )}
            </form>
          </>
        }
      />
      <Flash sp={sp} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat hero label="Earning wallet" value={money(u.earning_balance, cur)} sub={`Lifetime ${money(u.total_earned, cur)}`} />
        <Stat label="E-Pin wallet" value={money(u.epin_balance, cur)} />
        <Stat label="Left / Right" value={`${u.left_count} / ${u.right_count}`} sub={`Carry ${u.left_carry} / ${u.right_carry}`} />
        <Stat label="Pairs" value={u.total_pairs} sub={u.first_pair_done ? "Direct pair done" : `Direct L${u.direct_left} R${u.direct_right}`} />
        <Stat label="Rank" value={rp.current?.name ?? "Starter"} sub={rp.next ? `${rp.have}/${rp.need} to ${rp.next.name}` : "Top"} />
        <Stat label="Daily cap" value={cap.pairs > 0 ? `${cap.pairs} pairs` : "None"} sub={cap.amount > 0 ? money(cap.amount, cur) : ""} />
      </div>

      {u.status === "inactive" && (
        <Card title="Activate this ID (cash received at office)" className="mt-4">
          <form action={activateMemberAdminAction} className="grid items-end gap-3 sm:grid-cols-4">
            <input type="hidden" name="code" value={u.code} />
            <label className="block">
              <span className="lbl">Plan</span>
              <select className="inp" name="plan_id" defaultValue={u.plan_id}>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {money(p.price, cur)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="lbl">Method</span>
              <select className="inp" name="method">
                <option value="cash">Cash received (no E-Pin)</option>
                <option value="epin">Use an E-Pin</option>
              </select>
            </label>
            <label className="block">
              <span className="lbl">E-Pin (if method = E-Pin)</span>
              <input className="inp font-mono" name="pin" />
            </label>
            <button className="btn btn-acc">Activate now</button>
          </form>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Edit member" className="lg:col-span-2">
          <form action={updateMemberAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="code" value={u.code} />
            {[
              ["name", "Name", u.name],
              ["phone", "Mobile", u.phone],
              ["cnic", "CNIC", u.cnic],
              ["email", "Email", u.email],
              ["city", "City", u.city],
              ["address", "Address", u.address],
              ["payout_method", "Payout method", u.payout_method],
              ["payout_title", "Payout account title", u.payout_title],
              ["payout_account", "Payout account / IBAN", u.payout_account],
              ["payout_bank", "Bank", u.payout_bank],
            ].map(([n, l, v]) => (
              <label key={n} className="block">
                <span className="lbl">{l}</span>
                <input className="inp" name={n} defaultValue={v ?? ""} />
              </label>
            ))}
            <label className="block">
              <span className="lbl">Plan {u.status !== "inactive" && "(locked after activation)"}</span>
              <select className="inp" name="plan_id" defaultValue={u.plan_id} disabled={u.status !== "inactive"}>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col justify-end gap-2">
              <Check name="distributor_override" label="Unlock Distributor portal" defaultChecked={u.distributor_override} />
              <Check name="manager_override" label="Unlock Manager portal" defaultChecked={u.manager_override} />
            </div>
            <button className="btn btn-acc sm:col-span-2">Save member</button>
          </form>
        </Card>
        <div className="space-y-4">
          <Card title="Fund / adjust wallet">
            <form action={walletAdjustAction} className="space-y-3">
              <input type="hidden" name="code" value={u.code} />
              <label className="block">
                <span className="lbl">Type</span>
                <select className="inp" name="kind">
                  <option value="fund">Fund transfer → E-Pin wallet (cash received)</option>
                  <option value="adjust">Manual adjustment (+/−)</option>
                </select>
              </label>
              <label className="block">
                <span className="lbl">Wallet (for adjustment)</span>
                <select className="inp" name="wallet">
                  <option value="earning">Earning wallet</option>
                  <option value="epin">E-Pin wallet</option>
                </select>
              </label>
              <label className="block">
                <span className="lbl">Amount (negative to deduct)</span>
                <input className="inp" name="amount" type="number" step="0.01" required />
              </label>
              <label className="block">
                <span className="lbl">Reason / note</span>
                <input className="inp" name="reason" />
              </label>
              <button className="btn btn-acc w-full">Apply</button>
            </form>
          </Card>
          <Card title="Reset password">
            <form action={resetPasswordAction} className="flex gap-2">
              <input type="hidden" name="code" value={u.code} />
              <input className="inp" name="password" type="text" minLength={8} placeholder="New password" required />
              <button className="btn btn-acc">Reset</button>
            </form>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Transactions">
          {txs.length ? (
            <Table>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap text-xs text-mute">{dt(t.created_at)}</td>
                    <td>
                      <div className="text-sm">{TX_LABEL[t.type] ?? t.type}</div>
                      <div className="text-xs text-mute">
                        {t.wallet} · {t.note}
                      </div>
                    </td>
                    <td className={`whitespace-nowrap text-right font-bold ${t.amount > 0 ? "text-ok" : "text-bad"}`}>
                      {money(t.amount, cur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty>No transactions.</Empty>
          )}
        </Card>
        <div className="space-y-4">
          <Card title={`Direct referrals (${directs.length})`}>
            {directs.length ? (
              <div className="flex flex-wrap gap-2">
                {directs.map((d) => (
                  <Link key={d.code} href={`/admin/members/${d.code}`} className="rounded-lg border border-line px-2 py-1 text-xs hover:border-acc">
                    {d.code} · {d.name} <Badge>{d.status}</Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty>None.</Empty>
            )}
          </Card>
          <Card title="Recent withdrawals">
            {wds.length ? (
              <Table>
                <tbody>
                  {wds.map((w) => (
                    <tr key={w.id}>
                      <td>#{w.id}</td>
                      <td>{w.method}</td>
                      <td>{money(w.amount, cur)}</td>
                      <td>
                        <Badge>{w.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <Empty>None.</Empty>
            )}
          </Card>
          <Card title="Account info">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-mute">Registered</dt>
                <dd>{dt(u.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-mute">Activated</dt>
                <dd>{dt(u.activated_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-mute">Sponsor</dt>
                <dd>{u.sponsor_name ? `${u.sponsor_name} (${u.sponsor_code})` : "—"}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
