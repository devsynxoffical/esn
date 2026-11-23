import { requireAdmin } from "@/lib/auth";
import { q, type Row } from "@/lib/db";
import { Card, PageHead, Flash, Check, Badge, Table, Empty } from "@/components/ui";
import { saveTrainingAction, deleteTrainingAction } from "@/app/actions/admin";

function TrainingForm({ t }: { t?: Row }) {
  return (
    <form action={saveTrainingAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="id" value={t?.id ?? 0} />
      <label className="block">
        <span className="lbl">Type</span>
        <select className="inp" name="kind" defaultValue={t?.kind ?? "video"}>
          <option value="video">Video (YouTube / Vimeo / MP4)</option>
          <option value="pdf">PDF guide</option>
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="lbl">Title</span>
        <input className="inp" name="title" defaultValue={t?.title ?? ""} required />
      </label>
      <label className="block">
        <span className="lbl">Category</span>
        <input className="inp" name="category" defaultValue={t?.category ?? "Social Media"} />
      </label>
      <label className="block sm:col-span-2">
        <span className="lbl">Link (YouTube/Vimeo/PDF URL)</span>
        <input className="inp" name="url" defaultValue={t?.url ?? ""} placeholder="https://youtube.com/watch?v=..." />
      </label>
      <label className="block">
        <span className="lbl">…or upload file (PDF 25MB / MP4 45MB)</span>
        <input className="inp" type="file" name="file" accept="application/pdf,video/mp4" />
      </label>
      <label className="block">
        <span className="lbl">Order</span>
        <input className="inp" name="sort" type="number" defaultValue={t?.sort ?? 0} />
      </label>
      <label className="block sm:col-span-3">
        <span className="lbl">Description</span>
        <input className="inp" name="description" defaultValue={t?.description ?? ""} />
      </label>
      <div className="flex items-end justify-between gap-3">
        <Check name="active" label="Visible" defaultChecked={t ? t.active : true} />
        <button className="btn btn-acc">{t ? "Save" : "Add"}</button>
      </div>
    </form>
  );
}

export default async function Training({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; edit?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const items = await q("SELECT * FROM training ORDER BY category, sort, id");
  const editing = items.find((i) => String(i.id) === sp.edit);
  return (
    <>
      <PageHead title="Training & Marketing Academy" sub="Upload PDFs and add YouTube / Vimeo / MP4 training videos for members." />
      <Flash sp={sp} />
      <Card title={editing ? `Edit: ${editing.title}` : "Add training item"}>
        <TrainingForm key={editing?.id ?? "new"} t={editing} />
      </Card>
      <Card title="All items" className="mt-4">
        {items.length ? (
          <Table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Title</th>
                <th>Category</th>
                <th>Link</th>
                <th>Visible</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id}>
                  <td className="uppercase">{t.kind}</td>
                  <td className="font-semibold">{t.title}</td>
                  <td>{t.category}</td>
                  <td className="max-w-[240px] truncate text-xs">
                    <a href={t.url} target="_blank" rel="noreferrer" className="text-acc">
                      {t.url}
                    </a>
                  </td>
                  <td>{t.active ? <Badge tone="ok">yes</Badge> : <Badge tone="bad">no</Badge>}</td>
                  <td className="flex gap-2">
                    <a href={`/admin/training?edit=${t.id}`} className="btn btn-ghost btn-sm">
                      Edit
                    </a>
                    <form action={deleteTrainingAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="btn btn-bad btn-sm">Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No training items.</Empty>
        )}
      </Card>
    </>
  );
}
