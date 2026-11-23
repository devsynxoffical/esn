import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { dt } from "@/lib/fmt";
import { Card, PageHead, Flash, Table, Badge } from "@/components/ui";
import { createAdminAction, adminPasswordAction, removeAdminAction } from "@/app/actions/admin";

export default async function Admins({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const me = await requireAdmin();
  const admins = await q("SELECT id, code, name, phone, status, created_at FROM users WHERE role = 'admin' ORDER BY id");
  return (
    <>
      <PageHead title="Admins & Password" />
      <Flash sp={sp} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Change my password">
          <form action={adminPasswordAction} className="space-y-3">
            <input className="inp" type="password" name="current" placeholder="Current password" required autoComplete="current-password" />
            <input className="inp" type="password" name="password" placeholder="New password (min 10)" required autoComplete="new-password" />
            <button className="btn btn-acc">Change password</button>
          </form>
        </Card>
        <Card title="Add admin">
          <form action={createAdminAction} className="space-y-3">
            <input className="inp" name="name" placeholder="Name" required />
            <input className="inp" name="phone" placeholder="Mobile (login)" required inputMode="tel" />
            <input className="inp" name="password" type="text" placeholder="Password (min 8)" required />
            <button className="btn btn-acc">Create admin</button>
          </form>
        </Card>
      </div>
      <Card title="Admins" className="mt-4">
        <Table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Mobile (login)</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id}>
                <td className="font-mono">{a.code}</td>
                <td>{a.name}</td>
                <td>{a.phone}</td>
                <td>
                  <Badge>{a.status}</Badge>
                </td>
                <td className="text-mute">{dt(a.created_at)}</td>
                <td>
                  {a.id !== me.id && a.status !== "blocked" && (
                    <form action={removeAdminAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="btn btn-bad btn-sm">Remove access</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
