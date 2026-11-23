import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money, dt } from "@/lib/fmt";
import { Card, PageHead, Table, Empty, Pager, Stat } from "@/components/ui";

const PER = 100;
const KINDS: Record<string, string> = {
  flush: "Flush-out (over daily cap)",
  withdrawal_fee: "Withdrawal fee",
  platform_fee: "Distributor platform fee",
  conversion_fee: "Earning → E-Pin fee",
  normalization: "Payout normalization",
};

export default async function Ledger({ searchParams }: { searchParams: Promise<{ kind?: string; page?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const s = await getSettings();
  const kind = sp.kind && KINDS[sp.kind] ? sp.kind : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const [sums, rows] = await Promise.all([
    q("SELECT kind, sum(amount) AS total FROM company_ledger GROUP BY kind"),
    q(
      `SELECT l.*, u.code FROM company_ledger l LEFT JOIN users u ON u.id = l.user_id
       WHERE ($1 = '' OR l.kind = $1) ORDER BY l.id DESC LIMIT $2 OFFSET $3`,
      [kind, PER + 1, (page - 1) * PER],
    ),
  ]);
  return (
    <>
      <PageHead title="Company Reserve Ledger" sub="Income the company keeps: flush-outs, fees and normalization." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Object.entries(KINDS).map(([k, l]) => (
          <a key={k} href={`/admin/ledger?kind=${k}`}>
            <Stat label={l} value={money(sums.find((x) => x.kind === k)?.total ?? 0, s.currency)} hero={kind === k} />
          </a>
        ))}
      </div>
      <Card className="mt-4" title={kind ? KINDS[kind] : "All entries"} action={kind ? <a href="/admin/ledger">Show all</a> : null}>
        {rows.length ? (
          <Table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Member</th>
                <th>Note</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, PER).map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-mute">{dt(r.created_at)}</td>
                  <td>{KINDS[r.kind] ?? r.kind}</td>
                  <td className="font-mono text-xs">{r.code ?? "—"}</td>
                  <td className="text-mute">{r.note}</td>
                  <td className="font-bold text-ok">{money(r.amount, s.currency)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No entries.</Empty>
        )}
        <Pager page={page} hasMore={rows.length > PER} base={`/admin/ledger?kind=${kind}`} />
      </Card>
    </>
  );
}
