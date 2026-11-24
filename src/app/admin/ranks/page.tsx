import { requireAdmin } from "@/lib/auth";
import { q, type Row } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { Card, PageHead, Flash, Check } from "@/components/ui";
import { saveRankAction, deleteRankAction } from "@/app/actions/admin";

function RankForm({ r, nextLevel }: { r?: Row; nextLevel?: number }) {
  return (
    <form action={saveRankAction} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <input type="hidden" name="id" value={r?.id ?? 0} />
      <label className="block">
        <span className="lbl">Level #</span>
        <input className="inp" name="level" type="number" min={1} defaultValue={r?.level ?? nextLevel} required />
      </label>
      <label className="block lg:col-span-2">
        <span className="lbl">Rank name</span>
        <input className="inp" name="name" defaultValue={r?.name ?? ""} required />
      </label>
      <label className="block">
        <span className="lbl">Pairs required (L:R)</span>
        <input className="inp" name="pairs_required" type="number" min={1} defaultValue={r?.pairs_required ?? ""} required />
      </label>
      <label className="block">
        <span className="lbl">Gift / reward item</span>
        <input className="inp" name="reward_item" defaultValue={r?.reward_item ?? ""} />
      </label>
      <label className="block">
        <span className="lbl">Or cash amount</span>
        <input className="inp" name="reward_cash" type="number" min={0} step="0.01" defaultValue={r?.reward_cash ?? 0} />
      </label>
      <label className="block">
        <span className="lbl">New daily cap pairs (optional)</span>
        <input className="inp" name="daily_cap_pairs" type="number" min={0} defaultValue={r?.daily_cap_pairs ?? ""} placeholder="keep plan cap" />
      </label>
      <label className="block">
        <span className="lbl">New daily cap amount (optional)</span>
        <input className="inp" name="daily_cap_amount" type="number" min={0} step="0.01" defaultValue={r?.daily_cap_amount ?? ""} placeholder="keep plan cap" />
      </label>
      <div className="flex flex-col gap-2 lg:col-span-3">
        <Check name="unlocks_distributor" label="Unlocks Distributor portal" defaultChecked={r?.unlocks_distributor} />
        <Check name="unlocks_manager" label="Unlocks Manager portal" defaultChecked={r?.unlocks_manager} />
        <Check name="active" label="Active" defaultChecked={r ? r.active : true} />
      </div>
      <button className="btn btn-acc">{r ? "Save" : "Add rank"}</button>
    </form>
  );
}

export default async function Ranks({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const s = await getSettings();
  const ranks = await q("SELECT * FROM ranks ORDER BY level");
  return (
    <>
      <PageHead
        title="Ranks & Rewards"
        sub={`Counting mode: ${s.rank_mode === "fresh" ? "FRESH pairs (each rank counts new pairs after the previous rank)" : "CUMULATIVE pairs"}. Change it in Master Settings. Members choose gift OR cash.`}
      />
      <Flash sp={sp} />
      <div className="space-y-3">
        {ranks.map((r) => (
          <Card
            key={r.id}
            title={`Rank ${r.level}: ${r.name}${r.active ? "" : " (inactive)"}`}
            action={
              <form action={deleteRankAction}>
                <input type="hidden" name="id" value={r.id} />
                <button className="text-bad">Delete</button>
              </form>
            }
          >
            <RankForm r={r} />
          </Card>
        ))}
        <Card title="Add a rank">
          <RankForm nextLevel={(ranks.at(-1)?.level ?? 0) + 1} />
        </Card>
      </div>
    </>
  );
}
