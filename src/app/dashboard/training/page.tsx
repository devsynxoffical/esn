import { requireMember } from "@/lib/auth";
import { q } from "@/lib/db";
import { Card, PageHead, Empty } from "@/components/ui";

function embed(url: string): { kind: "iframe" | "video" | "link"; src: string } {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { kind: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };
  if (/\.mp4($|\?)/i.test(url)) return { kind: "video", src: url };
  return { kind: "link", src: url };
}

export default async function Training() {
  const me = await requireMember();
  const items = await q("SELECT * FROM training WHERE active ORDER BY category, sort, id");
  const locked = me.status !== "active";
  const videos = items.filter((i) => i.kind === "video");
  const pdfs = items.filter((i) => i.kind === "pdf");

  return (
    <>
      <PageHead title="Training & Marketing Academy" sub="Social media guides, scripts and step-by-step videos." />
      {locked ? (
        <Card>
          <p className="text-sm text-mute">Activate your ID to unlock the full training academy.</p>
        </Card>
      ) : (
        <>
          <Card title="PDF guides & scripts">
            {pdfs.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pdfs.map((p) => (
                  <a
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex gap-3 rounded-xl border border-line bg-panel2 p-3 hover:border-acc"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-bad/15 text-xs font-black text-bad">PDF</span>
                    <span>
                      <span className="block text-sm font-bold">{p.title}</span>
                      <span className="block text-xs text-mute">{p.category}</span>
                      {p.description && <span className="mt-1 block text-xs text-mute">{p.description}</span>}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <Empty>No PDFs yet.</Empty>
            )}
          </Card>
          <Card title="Training videos" className="mt-4">
            {videos.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {videos.map((v) => {
                  const e = embed(v.url);
                  return (
                    <div key={v.id} className="overflow-hidden rounded-xl border border-line bg-panel2">
                      {e.kind === "iframe" ? (
                        <iframe
                          src={e.src}
                          title={v.title}
                          className="aspect-video w-full"
                          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          loading="lazy"
                        />
                      ) : e.kind === "video" ? (
                        <video src={e.src} controls className="aspect-video w-full bg-black" preload="metadata" />
                      ) : (
                        <a href={e.src} target="_blank" rel="noreferrer" className="grid aspect-video place-items-center text-acc">
                          Open video ↗
                        </a>
                      )}
                      <div className="p-3">
                        <div className="text-sm font-bold">{v.title}</div>
                        <div className="text-xs text-mute">{v.category}</div>
                        {v.description && <p className="mt-1 text-xs text-mute">{v.description}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty>No videos yet.</Empty>
            )}
          </Card>
        </>
      )}
    </>
  );
}
