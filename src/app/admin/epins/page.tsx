import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money, dt, pinFmt } from "@/lib/fmt";
import { Card, PageHead, Flash, Table, Badge, Empty, Pager, Stat } from "@/components/ui";
import CopyButton from "@/components/CopyButton";
import { generatePinsAction, adminTransferPinAction, revokePinAction, walletAdjustAction } from "@/app/actions/admin";

const PER = 100;

export default async function Epins({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; status?: string; batch?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  await requireAdmin();
  const s = await getSettings();
  const page = Math.max(1, Number(sp.page) || 1);
  const status = ["unused", "used", "revoked"].includes(sp.status || "") ? sp.status! : "";
  const batch = (sp.batch || "").trim();
  const term = (sp.q || "").trim().replace(/-/g, "");
  const [plans, counts, pins] = await Promise.all([
    q("SELECT id, name, price FROM plans WHERE active ORDER BY sort, id"),
    one(`SELECT count(*)::int AS total, count(*) FILTER (WHERE status='unused')::int AS unused,
           count(*) FILTER (WHERE status='used')::int AS used, count(*) FILTER (WHERE status='revoked')::int AS revoked FROM epins`),
    q(
      `SELECT e.*, p.name AS plan, o.code AS owner_code, u.code AS used_code FROM epins e
       JOIN plans p ON p.id = e.plan_id LEFT JOIN users o ON o.id = e.owner_id LEFT JOIN users u ON u.id = e.used_by
       WHERE ($1 = '' OR e.status = $1) AND ($2 = '' OR e.batch = $2)
         AND ($3 = '' OR e.code LIKE '%' || $3 || '%' OR o.code ILIKE $3 OR u.code ILIKE $3)
       ORDER BY e.id DESC LIMIT $4 OFFSET $5`,
      [status, batch, term, PER + 1, (page - 1) * PER],
    ),
  ]);
  const qs = `status=${status}&batch=${encodeURIComponent(batch)}&q=${encodeURIComponent(sp.q || "")}`;

  return (
    <>
      <PageHead
        title="E-Pins & Fund Transfer"
        actions={
          <a href={`/admin/epins/export?${qs}`} className="btn btn-ghost">
            Export CSV
          </a>
        }
      />
      <Flash sp={sp} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat hero label="Generated" value={counts!.total} />
        <Stat label="Unused" value={counts!.unused} tone="ok" sub="Ready to sell" />
        <Stat label="Used" value={counts!.used} />
        <Stat label="Revoked" value={counts!.revoked} tone="bad" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Generate E-Pins (bulk)">
          <form action={generatePinsAction} className="grid gap-3 sm:grid-cols-3">
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
              <span className="lbl">Quantity</span>
              <input className="inp" name="count" type="number" min={1} max={1000} defaultValue={10} required />
            </label>
            <label className="block sm:col-span-3">
              <span className="lbl">Assign to member ID (optional — leave empty to keep in office stock)</span>
              <input className="inp uppercase" name="owner" placeholder="ESN10023" />
            </label>
            <button className="btn btn-acc sm:col-span-3">Generate 16-digit E-Pins</button>
          </form>
        </Card>
        <Card title="Fund transfer to member E-Pin wallet">
          <form action={walletAdjustAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="kind" value="fund" />
            <input type="hidden" name="_back" value="/admin/epins" />
            <label className="block">
              <span className="lbl">Member ID</span>
              <input className="inp uppercase" name="code" required placeholder="ESN10023" />
            </label>
            <label className="block">
              <span className="lbl">Amount (cash received)</span>
              <input className="inp" name="amount" type="number" min={1} step="0.01" required />
            </label>
            <label className="block sm:col-span-2">
              <span className="lbl">Note (receipt no., etc.)</span>
              <input className="inp" name="reason" />
            </label>
            <button className="btn btn-acc sm:col-span-2">Transfer fund</button>
            <p className="text-[11px] text-mute sm:col-span-2">
              The member can then activate IDs or create E-Pins from their E-Pin wallet.
            </p>
          </form>
        </Card>
      </div>

      <Card title="E-Pin records" className="mt-4">
        <form className="mb-4 flex flex-wrap gap-2">
          <input className="inp max-w-xs" name="q" defaultValue={sp.q} placeholder="E-Pin digits or member ID" />
          <input className="inp w-36" name="batch" defaultValue={batch} placeholder="Batch" />
          <select className="inp w-36" name="status" defaultValue={status}>
            <option value="">All</option>
            <option value="unused">Unused</option>
            <option value="used">Used</option>
            <option value="revoked">Revoked</option>
          </select>
          <button className="btn btn-acc">Filter</button>
          {(status || batch || sp.q) && (
            <Link href="/admin/epins" className="btn btn-ghost">
              Clear
            </Link>
          )}
        </form>
        {pins.length ? (
          <Table>
            <thead>
              <tr>
                <th>E-Pin</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Source</th>
                <th>Owner</th>
                <th>Used by</th>
                <th>Batch</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pins.slice(0, PER).map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap font-mono">{pinFmt(p.code)}</td>
                  <td>{p.plan}</td>
                  <td>
                    <Badge>{p.status}</Badge>
                  </td>
                  <td className="text-mute">{p.source}</td>
                  <td className="font-mono text-xs">{p.owner_code ?? "office"}</td>
                  <td className="font-mono text-xs">{p.used_code ?? "—"}</td>
                  <td className="text-xs text-mute">{p.batch ?? "—"}</td>
                  <td className="whitespace-nowrap text-xs text-mute">{dt(p.used_at ?? p.created_at)}</td>
                  <td>
                    {p.status === "unused" && (
                      <div className="flex flex-wrap items-center gap-1">
                        <CopyButton text={p.code} />
                        <form action={adminTransferPinAction} className="flex gap-1">
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="_back" value={`/admin/epins?${qs}`} />
                          <input className="inp w-28 py-1 text-xs uppercase" name="to" placeholder="to ID" required />
                          <button className="btn btn-ghost btn-sm">Assign</button>
                        </form>
                        <form action={revokePinAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="_back" value={`/admin/epins?${qs}`} />
                          <button className="btn btn-bad btn-sm">Revoke</button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No E-Pins found.</Empty>
        )}
        <Pager page={page} hasMore={pins.length > PER} base={`/admin/epins?${qs}`} />
      </Card>
    </>
  );
}
