import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money, dt } from "@/lib/fmt";
import { Card, PageHead, Flash, Table, Badge, Empty } from "@/components/ui";
import { rewardDeliveredAction } from "@/app/actions/admin";

export default async function Rewards({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const s = await getSettings();
  const rows = await q(
    `SELECT a.*, u.code, u.name, u.phone, u.city FROM rank_achievements a JOIN users u ON u.id = a.user_id
     ORDER BY (a.status = 'gift_pending') DESC, a.id DESC LIMIT 300`,
  );
  return (
    <>
      <PageHead title="Rank Rewards" sub="Members choose gift or cash. Cash is credited automatically; gifts appear here for delivery." />
      <Flash sp={sp} />
      <Card>
        {rows.length ? (
          <Table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Rank</th>
                <th>Gift</th>
                <th>Cash option</th>
                <th>Status</th>
                <th>Achieved</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/admin/members/${a.code}`} className="font-semibold hover:text-acc">
                      {a.name}
                    </Link>
                    <div className="text-xs text-mute">
                      {a.code} · {a.phone} · {a.city}
                    </div>
                  </td>
                  <td>
                    {a.rank_level}. {a.rank_name}
                  </td>
                  <td>{a.reward_item}</td>
                  <td>{money(a.reward_cash, s.currency)}</td>
                  <td>
                    <Badge>{a.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap text-mute">{dt(a.created_at)}</td>
                  <td>
                    {a.status === "gift_pending" && (
                      <form action={rewardDeliveredAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <button className="btn btn-ok btn-sm">Mark delivered</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No rank achievements yet.</Empty>
        )}
      </Card>
    </>
  );
}
