import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { dt } from "@/lib/fmt";
import { Card, PageHead, Flash, Check, Empty } from "@/components/ui";
import { saveAnnouncementAction, deleteAnnouncementAction } from "@/app/actions/admin";

export default async function Announcements({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const rows = await q("SELECT * FROM announcements ORDER BY id DESC");
  return (
    <>
      <PageHead title="Announcements" sub="Shown on every member's dashboard." />
      <Flash sp={sp} />
      <Card title="New announcement">
        <form action={saveAnnouncementAction} className="space-y-3">
          <input className="inp" name="title" placeholder="Title" required />
          <textarea className="inp" name="body" rows={3} placeholder="Message" />
          <button className="btn btn-acc">Publish</button>
        </form>
      </Card>
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map((a) => (
            <Card key={a.id} title={dt(a.created_at)}>
              <form action={saveAnnouncementAction} className="space-y-3">
                <input type="hidden" name="id" value={a.id} />
                <input className="inp" name="title" defaultValue={a.title} required />
                <textarea className="inp" name="body" rows={2} defaultValue={a.body} />
                <div className="flex items-center justify-between">
                  <Check name="active" label="Visible" defaultChecked={a.active} />
                  <div className="flex gap-2">
                    <button className="btn btn-acc btn-sm">Save</button>
                    <button formAction={deleteAnnouncementAction} className="btn btn-bad btn-sm">
                      Delete
                    </button>
                  </div>
                </div>
              </form>
            </Card>
          ))
        ) : (
          <Empty>No announcements.</Empty>
        )}
      </div>
    </>
  );
}
