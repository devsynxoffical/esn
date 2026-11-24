import { requireActiveMember } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money, dOnly } from "@/lib/fmt";
import { Card, PageHead, Flash, Table, Badge, Empty } from "@/components/ui";
import { activateMemberAction } from "@/app/actions/member";

export default async function Team({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const me = await requireActiveMember();
  const s = await getSettings();
  const refs = await q(
    `SELECT u.code, u.name, u.phone, u.status, u.preferred_leg, u.position, u.created_at, u.activated_at,
            p.name AS plan, p.price, par.code AS parent_code
     FROM users u LEFT JOIN plans p ON p.id = u.plan_id LEFT JOIN users par ON par.id = u.parent_id
     WHERE u.sponsor_id = $1 ORDER BY u.id DESC`,
    [me.id],
  );
  const pending = refs.filter((r) => r.status === "inactive");

  return (
    <>
      <PageHead title="My Team & Referrals" sub={`${refs.length} direct referrals · ${pending.length} waiting for activation`} />
      <Flash sp={sp} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Activate a member" className="lg:col-span-1">
          <form action={activateMemberAction} className="space-y-3">
            <label className="block">
              <span className="lbl">Member ID to activate</span>
              <input className="inp uppercase" name="code" placeholder="ESN10023" required list="pending-ids" />
              <datalist id="pending-ids">
                {pending.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="lbl">Pay with</span>
              <select className="inp" name="method" defaultValue="wallet">
                <option value="wallet">My E-Pin wallet ({money(me.epin_balance, s.currency)})</option>
                <option value="epin">An E-Pin code</option>
              </select>
            </label>
            <label className="block">
              <span className="lbl">E-Pin code (only if paying with E-Pin)</span>
              <input className="inp font-mono" name="pin" inputMode="numeric" placeholder="16 digits" />
            </label>
            <button className="btn btn-acc w-full">Activate</button>
            <p className="text-[11px] text-mute">Activation from E-Pin wallet deducts the member&apos;s plan price.</p>
          </form>
        </Card>
        <Card title="Direct referrals" className="lg:col-span-2">
          {refs.length ? (
            <Table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Plan</th>
                  <th>Side</th>
                  <th>Placed under</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {refs.map((r) => (
                  <tr key={r.code}>
                    <td className="font-mono">{r.code}</td>
                    <td>{r.name}</td>
                    <td className="text-mute">{r.plan}</td>
                    <td>{(r.position ?? r.preferred_leg) === "R" ? "Right" : "Left"}</td>
                    <td className="font-mono text-mute">{r.parent_code ?? "Not placed yet"}</td>
                    <td>
                      <Badge>{r.status}</Badge>
                    </td>
                    <td className="whitespace-nowrap text-mute">{dOnly(r.activated_at ?? r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty>No referrals yet. Share your Left and Right links from the dashboard.</Empty>
          )}
        </Card>
      </div>
    </>
  );
}
