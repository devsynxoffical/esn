import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money, dOnly } from "@/lib/fmt";
import { Card, PageHead, Flash, Table, Badge, Empty, Pager } from "@/components/ui";

const PER = 50;

export default async function Members({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  await requireAdmin();
  const s = await getSettings();
  const page = Math.max(1, Number(sp.page) || 1);
  const term = (sp.q || "").trim();
  const status = ["active", "inactive", "blocked"].includes(sp.status || "") ? sp.status! : "";
  const rows = await q(
    `SELECT u.*, p.name AS plan, sp.code AS sponsor_code FROM users u
     LEFT JOIN plans p ON p.id = u.plan_id LEFT JOIN users sp ON sp.id = u.sponsor_id
     WHERE u.role = 'member'
       AND ($1 = '' OR u.code ILIKE '%' || $1 || '%' OR u.name ILIKE '%' || $1 || '%' OR u.phone LIKE '%' || $1 || '%' OR coalesce(u.cnic,'') LIKE '%' || $1 || '%')
       AND ($2 = '' OR u.status = $2)
     ORDER BY u.id DESC LIMIT $3 OFFSET $4`,
    [term, status, PER + 1, (page - 1) * PER],
  );
  const base = `/admin/members?q=${encodeURIComponent(term)}&status=${status}`;

  return (
    <>
      <PageHead
        title="All Members"
        actions={
          <Link href="/admin/members/new" className="btn btn-acc">
            + Add member
          </Link>
        }
      />
      <Flash sp={sp} />
      <Card>
        <form className="mb-4 flex flex-wrap gap-2">
          <input className="inp max-w-xs" name="q" defaultValue={term} placeholder="ID, name, mobile or CNIC" />
          <select className="inp w-40" name="status" defaultValue={status}>
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
          </select>
          <button className="btn btn-acc">Search</button>
        </form>
        {rows.length ? (
          <Table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Plan</th>
                <th>Sponsor</th>
                <th>L / R</th>
                <th>Pairs</th>
                <th>Earning wallet</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, PER).map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link href={`/admin/members/${u.code}`} className="font-mono font-semibold text-acc">
                      {u.code}
                    </Link>
                  </td>
                  <td>
                    {u.name} {u.is_company && <Badge tone="acc">company</Badge>}
                  </td>
                  <td className="font-mono text-xs">{u.is_company ? "—" : u.phone}</td>
                  <td className="text-mute">{u.plan}</td>
                  <td className="font-mono text-xs text-mute">{u.sponsor_code ?? "—"}</td>
                  <td>
                    {u.left_count} / {u.right_count}
                  </td>
                  <td>{u.total_pairs}</td>
                  <td>{money(u.earning_balance, s.currency)}</td>
                  <td>
                    <Badge>{u.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap text-mute">{dOnly(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No members found.</Empty>
        )}
        <Pager page={page} hasMore={rows.length > PER} base={base} />
      </Card>
    </>
  );
}
