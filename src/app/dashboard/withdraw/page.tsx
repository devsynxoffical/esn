import { requireActiveMember } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money, dt } from "@/lib/fmt";
import { Card, PageHead, Flash, Table, Badge, Empty, Stat } from "@/components/ui";
import { withdrawAction } from "@/app/actions/member";

export default async function Withdraw({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const me = await requireActiveMember();
  const s = await getSettings();
  const cur = s.currency;
  const list = await q("SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY id DESC LIMIT 100", [me.id]);

  return (
    <>
      <PageHead title="Withdraw" sub={`Fee ${s.withdrawal_fee_percent}% · Minimum ${money(s.withdrawal_min, cur)}`} />
      <Flash sp={sp} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3">
          <Stat hero label="Available to withdraw" value={money(me.earning_balance, cur)} />
          <Stat
            label="Example"
            value={`${money(1000, cur)} → ${money(1000 - (1000 * Number(s.withdrawal_fee_percent)) / 100, cur)}`}
            sub={`${s.withdrawal_fee_percent}% admin/service fee is deducted automatically`}
          />
        </div>
        <Card title="New withdrawal request" className="lg:col-span-2">
          {!s.withdrawals_enabled ? (
            <p className="text-sm text-warn">Withdrawals are currently closed by the admin.</p>
          ) : (
            <form action={withdrawAction} className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="lbl">Amount</span>
                <input className="inp" name="amount" type="number" min={Number(s.withdrawal_min)} step="0.01" required />
              </label>
              <label className="block">
                <span className="lbl">Method</span>
                <select className="inp" name="method" defaultValue={me.payout_method ?? undefined}>
                  {s.withdrawal_methods.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="lbl">Account title (name)</span>
                <input className="inp" name="title" defaultValue={me.payout_title ?? me.name} required />
              </label>
              <label className="block">
                <span className="lbl">Account number / mobile / IBAN</span>
                <input className="inp" name="account" defaultValue={me.payout_account ?? ""} required />
              </label>
              <label className="block sm:col-span-2">
                <span className="lbl">Bank name (for bank account)</span>
                <input className="inp" name="bank" defaultValue={me.payout_bank ?? ""} />
              </label>
              <button className="btn btn-acc sm:col-span-2">Request Withdrawal</button>
            </form>
          )}
        </Card>
      </div>
      <Card title="Withdrawal history" className="mt-4">
        {list.length ? (
          <Table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Method</th>
                <th>Account</th>
                <th>Amount</th>
                <th>Fee</th>
                <th>You get</th>
                <th>Status</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {list.map((w) => (
                <tr key={w.id}>
                  <td>{w.id}</td>
                  <td className="whitespace-nowrap text-mute">{dt(w.created_at)}</td>
                  <td>{w.method}</td>
                  <td className="font-mono text-xs">{w.account_number}</td>
                  <td>{money(w.amount, cur)}</td>
                  <td className="text-bad">{money(w.fee, cur)}</td>
                  <td className="font-bold text-ok">{money(w.net, cur)}</td>
                  <td>
                    <Badge>{w.status}</Badge>
                  </td>
                  <td className="text-mute">{w.admin_note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No withdrawals yet.</Empty>
        )}
      </Card>
    </>
  );
}
