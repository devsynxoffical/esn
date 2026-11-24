import Link from "next/link";
import type { Row } from "@/lib/db";

/** Server-rendered binary tree, 4 levels from `rootId`. Each node links to re-root the tree. */
export default function TreeView({ nodes, rootId, hrefFor }: { nodes: Row[]; rootId: number; hrefFor: (code: string) => string }) {
  const byParent = new Map<string, Row>();
  for (const n of nodes) if (n.parent_id) byParent.set(`${n.parent_id}${n.position}`, n);
  const root = nodes.find((n) => n.id === rootId);
  if (!root) return null;

  const levels: (Row | null)[][] = [[root]];
  for (let d = 1; d < 4; d++) {
    const prev = levels[d - 1];
    levels.push(prev.flatMap((p) => (p ? [byParent.get(`${p.id}L`) ?? null, byParent.get(`${p.id}R`) ?? null] : [null, null])));
  }

  return (
    <>
    <p className="mb-2 text-[12px] text-mute md:hidden">Swipe sideways to see the whole tree →</p>
    <div className="overflow-x-auto pb-2">
      <div className="min-w-[720px] space-y-6">
        {levels.map((row, d) => (
          <div key={d} className="grid" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
            {row.map((n, i) => (
              <div key={i} className="flex justify-center px-0.5">
                {n ? (
                  <Link
                    href={hrefFor(n.code)}
                    className={`group flex w-full max-w-[150px] flex-col items-center rounded-xl border p-2 text-center transition hover:border-acc ${
                      d === 0 ? "grad border-transparent text-white" : "border-line bg-panel2"
                    }`}
                    title={`${n.name} (${n.code})`}
                  >
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-full border-2 text-xs font-bold ${
                        d === 0
                          ? "border-white/80"
                          : n.position === "L"
                            ? "border-acc text-acc"
                            : "border-acc2 text-acc2"
                      } ${n.status !== "active" ? "opacity-50" : ""}`}
                    >
                      {String(n.name).slice(0, 1).toUpperCase()}
                    </span>
                    <span className="mt-1 w-full truncate text-[11px] font-bold">{n.name}</span>
                    <span className={`text-[10px] ${d === 0 ? "text-white/85" : "text-mute"}`}>{n.code}</span>
                    <span className={`text-[10px] font-semibold ${d === 0 ? "text-white" : "text-fg/80"}`}>
                      L {n.left_count} · R {n.right_count}
                    </span>
                  </Link>
                ) : (
                  <div className="grid h-[86px] w-full max-w-[150px] place-items-center rounded-xl border border-dashed border-line text-[11px] text-mute">
                    empty
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
