import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { dt } from "@/lib/fmt";
import { Card, PageHead, Table, Empty, Pager } from "@/components/ui";

const PER = 100;

export default async function Audit({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const page = Math.max(1, Number(sp.page) || 1);
  const term = (sp.q || "").trim();
  const rows = await q(
    `SELECT a.*, u.code, u.name FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
     WHERE ($1 = '' OR a.action ILIKE '%' || $1 || '%' OR a.details::text ILIKE '%' || $1 || '%' OR u.code ILIKE $1)
     ORDER BY a.id DESC LIMIT $2 OFFSET $3`,
    [term, PER + 1, (page - 1) * PER],
  );
  return (
    <>
      <PageHead title="Audit Log" sub="Every admin change, activation and money action is recorded." />
      <Card>
        <form className="mb-4 flex gap-2">
          <input className="inp max-w-xs" name="q" defaultValue={term} placeholder="Action, member ID, detail…" />
          <button className="btn btn-acc">Search</button>
        </form>
        {rows.length ? (
          <Table>
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, PER).map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-mute">{dt(r.created_at)}</td>
                  <td className="whitespace-nowrap">{r.name ? `${r.name} (${r.code})` : "System"}</td>
                  <td className="font-mono text-xs">{r.action}</td>
                  <td className="max-w-[480px] break-all font-mono text-[11px] text-mute">{JSON.stringify(r.details)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No entries.</Empty>
        )}
        <Pager page={page} hasMore={rows.length > PER} base={`/admin/audit?q=${encodeURIComponent(term)}`} />
      </Card>
    </>
  );
}
