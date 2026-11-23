import Link from "next/link";
import { requireActiveMember } from "@/lib/auth";
import { one } from "@/lib/db";
import { subtree, isInDownline, pathBetween, extremeNode } from "@/lib/tree";
import { Card, PageHead, Flash } from "@/components/ui";
import TreeView from "@/components/TreeView";

export default async function Tree({ searchParams }: { searchParams: Promise<{ root?: string; q?: string; err?: string }> }) {
  const sp = await searchParams;
  const me = await requireActiveMember();
  let rootId = me.id;
  let err = sp.err;
  const want = (sp.q || sp.root || "").trim().toUpperCase();
  if (want) {
    const n = await one("SELECT id FROM users WHERE upper(code) = $1", [want]);
    if (n && (await isInDownline(me.id, n.id))) rootId = n.id;
    else err = "That ID is not in your team.";
  }
  const [nodes, path, xl, xr] = await Promise.all([
    subtree(rootId, 4),
    pathBetween(me.id, rootId),
    extremeNode(rootId, "L"),
    extremeNode(rootId, "R"),
  ]);
  const root = nodes.find((n) => n.id === rootId)!;
  const href = (code: string) => `/dashboard/tree?root=${code}`;

  return (
    <>
      <PageHead
        title="Binary Tree"
        sub="Click any member to open their team. Orange border = Left leg, light orange = Right leg."
        actions={
          <form className="flex gap-2">
            <input className="inp w-40" name="q" placeholder="Search ID" defaultValue={sp.q} />
            <button className="btn btn-acc">Search</button>
          </form>
        }
      />
      <Flash sp={{ err }} />
      <div className="mb-3 flex flex-wrap items-center gap-1 text-sm">
        {path.map((p, i) => (
          <span key={p.id} className="flex items-center gap-1">
            {i > 0 && <span className="text-mute">/</span>}
            <Link href={href(p.code)} className={p.id === rootId ? "font-bold text-acc" : "text-mute hover:text-fg"}>
              {p.code}
            </Link>
          </span>
        ))}
      </div>
      <Card
        title={`${root.name} (${root.code})`}
        action={
          <span className="flex gap-3">
            {xl && <Link href={href(xl.code)}>⇤ Extreme Left</Link>}
            {xr && <Link href={href(xr.code)}>Extreme Right ⇥</Link>}
            {rootId !== me.id && <Link href="/dashboard/tree">Back to me</Link>}
          </span>
        }
      >
        <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-panel2 p-3">
            <div className="text-mute">Left team</div>
            <div className="text-lg font-bold">{root.left_count}</div>
          </div>
          <div className="rounded-lg bg-panel2 p-3">
            <div className="text-mute">Right team</div>
            <div className="text-lg font-bold">{root.right_count}</div>
          </div>
          <div className="rounded-lg bg-panel2 p-3">
            <div className="text-mute">Carry L / R</div>
            <div className="text-lg font-bold">
              {root.left_carry} / {root.right_carry}
            </div>
          </div>
          <div className="rounded-lg bg-panel2 p-3">
            <div className="text-mute">Matched pairs</div>
            <div className="text-lg font-bold">{root.total_pairs}</div>
          </div>
        </div>
        <TreeView nodes={nodes} rootId={rootId} hrefFor={href} />
      </Card>
    </>
  );
}
