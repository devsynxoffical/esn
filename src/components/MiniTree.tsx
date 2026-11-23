import Link from "next/link";
import type { Row } from "@/lib/db";

/** Compact circular binary tree preview (4 levels), like the reference dashboard. */
export default function MiniTree({ nodes, rootId, href }: { nodes: Row[]; rootId: number; href: (code: string) => string }) {
  const by = new Map<string, Row>();
  for (const n of nodes) if (n.parent_id) by.set(`${n.parent_id}${n.position}`, n);
  const root = nodes.find((n) => n.id === rootId);
  if (!root) return null;
  const levels: { n: Row | null; side: "L" | "R" | null }[][] = [[{ n: root, side: null }]];
  for (let d = 1; d < 4; d++) {
    levels.push(
      levels[d - 1].flatMap((p) => {
        const side = (pos: "L" | "R") => (d === 1 ? pos : p.side);
        return p.n
          ? [
              { n: by.get(`${p.n.id}L`) ?? null, side: side("L") },
              { n: by.get(`${p.n.id}R`) ?? null, side: side("R") },
            ]
          : [
              { n: null, side: side("L") },
              { n: null, side: side("R") },
            ];
      }),
    );
  }
  const size = [56, 46, 42, 34];
  return (
    <div className="space-y-5 py-2">
      {levels.map((row, d) => (
        <div key={d} className="grid" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0,1fr))` }}>
          {row.map(({ n, side }, i) => (
            <div key={i} className="flex justify-center">
              {n ? (
                <Link
                  href={href(n.code)}
                  title={`${n.name} · ${n.code} · L ${n.left_count} / R ${n.right_count}`}
                  className={`grid place-items-center rounded-full text-[13px] font-semibold transition hover:scale-105 ${
                    d === 0
                      ? "grad text-white shadow-[0_8px_24px_-8px_rgba(249,115,22,0.7)]"
                      : `border-2 bg-bg ${side === "L" ? "border-acc" : "border-acc2"} ${n.status !== "active" ? "opacity-40" : ""}`
                  }`}
                  style={{ width: size[d], height: size[d] }}
                >
                  {String(n.name).trim().charAt(0).toUpperCase()}
                </Link>
              ) : (
                <span
                  className="grid place-items-center rounded-full border border-dashed border-line text-[12px] text-mute/60"
                  style={{ width: size[d], height: size[d] }}
                >
                  +
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
