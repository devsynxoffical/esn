import { requireActiveMember } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money, dt, TX_LABEL } from "@/lib/fmt";
import { Card, PageHead, Flash, Table, Stat, Empty, Pager, Badge } from "@/components/ui";
import { convertAction } from "@/app/actions/member";

const PER = 30;

export default async function Wallet({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; w?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const me = await requireActiveMember();
  const s = await getSettings();
  const cur = s.currency;
  const page = Math.max(1, Number(sp.page) || 1);
  const wallet = sp.w === "epin" ? "epin" : sp.w === "pairs" ? "pairs" : "earning";

  const txs =
    wallet === "pairs"
      ? []
      : await q("SELECT * FROM transactions WHERE user_id = $1 AND wallet = $2 ORDER BY id DESC LIMIT $3 OFFSET $4", [
          me.id,
          wallet,
          PER + 1,
          (page - 1) * PER,
        ]);
  const pairs =
    wallet === "pairs"
      ? await q(
          `SELECT day, kind, status, count(*)::int AS n, sum(amount) AS gross, sum(paid_amount) AS paid
           FROM pairs WHERE user_id = $1 GROUP BY day, kind, status ORDER BY day DESC, kind LIMIT $2 OFFSET $3`,
          [me.id, PER + 1, (page - 1) * PER],
        )
      : [];
  const rows = wallet === "pairs" ? pairs : txs;

  return (
    <>
      <PageHead title="Wallets & Income" />
      <Flash sp={sp} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat hero label="Earning wallet (withdrawable)" value={money(me.earning_balance, cur)} sub="Direct, pair & rank income" />
        <Stat label="E-Pin wallet" value={money(me.epin_balance, cur)} sub="Use to create E-Pins or activate IDs" />
        <Stat label="Lifetime earnings" value={money(me.total_earned, cur)} />
      </div>

      {s.allow_earning_to_epin && (
        <Card title="Move earnings to E-Pin wallet" className="mt-4">
          <form action={convertAction} className="flex flex-wrap items-end gap-3">
            <label className="block min-w-[180px] flex-1">
              <span className="lbl">Amount</span>
              <input className="inp" name="amount" type="number" min={1} step="0.01" required />
            </label>
            <button className="btn btn-acc">Move to E-Pin wallet</button>
            {Number(s.earning_to_epin_fee_percent) > 0 && (
              <span className="text-xs text-mute">Fee {s.earning_to_epin_fee_percent}%</span>
            )}
          </form>
        </Card>
      )}

      <Card
        className="mt-4"
        title={
          <span className="flex gap-1">
            {[
              ["earning", "Earning wallet"],
              ["epin", "E-Pin wallet"],
              ["pairs", "Pair history"],
            ].map(([k, l]) => (
              <a key={k} href={`/dashboard/wallet?w=${k}`} className={`btn btn-sm ${wallet === k ? "btn-acc" : "btn-ghost"}`}>
                {l}
              </a>
            ))}
          </span>
        }
      >
        {rows.length === 0 ? (
          <Empty>Nothing here yet.</Empty>
        ) : wallet === "pairs" ? (
          <Table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Pairs</th>
                <th>Status</th>
                <th>Value</th>
                <th>Paid</th>
              </tr>
            </thead>
            <tbody>
              {pairs.slice(0, PER).map((p, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap">{p.day}</td>
                  <td className="capitalize">{p.kind}</td>
                  <td>{p.n}</td>
                  <td>
                    <Badge>{p.status}</Badge>
                  </td>
                  <td>{money(p.gross, cur)}</td>
                  <td className="font-bold text-ok">{money(p.paid, cur)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Detail</th>
                <th>Amount</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {txs.slice(0, PER).map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap text-mute">{dt(t.created_at)}</td>
                  <td className="whitespace-nowrap">{TX_LABEL[t.type] ?? t.type}</td>
                  <td className="text-mute">{t.note}</td>
                  <td className={`whitespace-nowrap font-bold ${t.amount > 0 ? "text-ok" : "text-bad"}`}>
                    {t.amount > 0 ? "+" : ""}
                    {money(t.amount, cur)}
                  </td>
                  <td className="whitespace-nowrap">{money(t.balance_after, cur)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pager page={page} hasMore={rows.length > PER} base={`/dashboard/wallet?w=${wallet}`} />
      </Card>
    </>
  );
}
