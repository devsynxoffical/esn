import { requireActiveMember } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money, dt, pinFmt } from "@/lib/fmt";
import { Card, PageHead, Flash, Table, Badge, Empty } from "@/components/ui";
import CopyButton from "@/components/CopyButton";
import { buyPinsAction, transferPinAction } from "@/app/actions/member";

export default async function Epins({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const me = await requireActiveMember();
  const s = await getSettings();
  const [plans, pins] = await Promise.all([
    q("SELECT id, name, price FROM plans WHERE active ORDER BY sort, id"),
    q(
      `SELECT e.*, p.name AS plan, u.code AS used_code FROM epins e JOIN plans p ON p.id = e.plan_id
       LEFT JOIN users u ON u.id = e.used_by WHERE e.owner_id = $1 ORDER BY e.status = 'unused' DESC, e.id DESC LIMIT 200`,
      [me.id],
    ),
  ]);
  const unused = pins.filter((p) => p.status === "unused");

  return (
    <>
      <PageHead title="E-Pins" sub={`E-Pin wallet: ${money(me.epin_balance, s.currency)} · ${unused.length} unused E-Pins`} />
      <Flash sp={sp} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Create E-Pins from E-Pin wallet">
          <form action={buyPinsAction} className="grid gap-3 sm:grid-cols-3">
            <label className="block sm:col-span-2">
              <span className="lbl">Plan</span>
              <select className="inp" name="plan_id">
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {money(p.price, s.currency)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="lbl">How many</span>
              <input className="inp" name="count" type="number" min={1} max={50} defaultValue={1} />
            </label>
            <button className="btn btn-acc sm:col-span-3">Create E-Pins</button>
          </form>
        </Card>
        {s.allow_member_pin_transfer && (
          <Card title="Transfer an E-Pin">
            <form action={transferPinAction} className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="lbl">E-Pin</span>
                <select className="inp" name="pin_id" required>
                  {unused.map((p) => (
                    <option key={p.id} value={p.id}>
                      ••••{p.code.slice(-4)} · {p.plan}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="lbl">To member ID</span>
                <input className="inp uppercase" name="to" required placeholder="ESN10045" />
              </label>
              <button className="btn btn-acc sm:col-span-2" disabled={!unused.length}>
                Transfer
              </button>
            </form>
          </Card>
        )}
      </div>
      <Card title="My E-Pins" className="mt-4">
        {pins.length ? (
          <Table>
            <thead>
              <tr>
                <th>E-Pin</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Used by</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pins.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap font-mono">{pinFmt(p.code)}</td>
                  <td>{p.plan}</td>
                  <td>
                    <Badge>{p.status}</Badge>
                  </td>
                  <td className="font-mono text-mute">{p.used_code ?? "—"}</td>
                  <td className="whitespace-nowrap text-mute">{dt(p.created_at)}</td>
                  <td>{p.status === "unused" && <CopyButton text={p.code} />}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No E-Pins yet.</Empty>
        )}
      </Card>
    </>
  );
}
