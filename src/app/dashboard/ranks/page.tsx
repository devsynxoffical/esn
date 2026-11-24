import { requireActiveMember } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { rankProgress } from "@/lib/engine";
import { money, num, dt } from "@/lib/fmt";
import { Card, PageHead, Flash, Badge, Progress } from "@/components/ui";
import { chooseRewardAction } from "@/app/actions/member";

export default async function Ranks({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const me = await requireActiveMember();
  const s = await getSettings();
  const cur = s.currency;
  const [ranks, achs] = await Promise.all([
    q("SELECT * FROM ranks WHERE active ORDER BY level"),
    q("SELECT * FROM rank_achievements WHERE user_id = $1 ORDER BY rank_level", [me.id]),
  ]);
  const rp = rankProgress(me, ranks, s);
  const achBy = new Map(achs.map((a) => [a.rank_level, a]));

  return (
    <>
      <PageHead
        title="Rank Rewards"
        sub={
          s.rank_mode === "fresh"
            ? "Fresh pairs: each next rank counts new pairs after your previous rank."
            : "Ranks count your total matched pairs."
        }
      />
      <Flash sp={sp} />
      {rp.next && (
        <Card title={`Progress to ${rp.next.name}`} className="mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-mute">Pairs</span>
            <b>
              {num(rp.have)} / {num(rp.need)}
            </b>
          </div>
          <Progress pct={rp.pct} className="mt-2" />
        </Card>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ranks.map((r) => {
          const a = achBy.get(r.level);
          return (
            <div
              key={r.id}
              className={`rounded-xl border p-4 ${a ? "border-acc bg-acc/10" : r.level === rp.next?.level ? "border-warn/60 bg-panel" : "border-line bg-panel"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-mute">Rank {r.level}</span>
                {a ? <Badge>{a.status}</Badge> : r.level === rp.next?.level ? <Badge tone="warn">Next</Badge> : null}
              </div>
              <div className="mt-1 text-lg font-semibold">{r.name}</div>
              <div className="text-sm text-acc">
                {num(r.pairs_required)} : {num(r.pairs_required)} pairs
              </div>
              <div className="mt-2 text-sm">
                🎁 {r.reward_item || "Cash reward"}
                {r.reward_cash > 0 && <span className="text-mute"> or {money(r.reward_cash, cur)}</span>}
              </div>
              {r.daily_cap_pairs != null && (
                <div className="mt-1 text-xs text-mute">Daily cap becomes {r.daily_cap_pairs} pairs</div>
              )}
              {a?.status === "choose" && (
                <form action={chooseRewardAction} className="mt-3 flex gap-2">
                  <input type="hidden" name="id" value={a.id} />
                  {a.reward_item && (
                    <button name="choice" value="gift" className="btn btn-acc btn-sm flex-1">
                      Take gift
                    </button>
                  )}
                  {a.reward_cash > 0 && (
                    <button name="choice" value="cash" className="btn btn-ghost btn-sm flex-1">
                      Take {money(a.reward_cash, cur)}
                    </button>
                  )}
                </form>
              )}
              {a && <div className="mt-2 text-[11px] text-mute">Achieved {dt(a.created_at)}</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}
