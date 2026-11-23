import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { one, pool } from "@/lib/db";
import { getRoot } from "@/lib/engine";
import { subtree, extremeNode } from "@/lib/tree";
import { Card, PageHead, Flash, Empty } from "@/components/ui";
import TreeView from "@/components/TreeView";

export default async function AdminTree({ searchParams }: { searchParams: Promise<{ root?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  let err: string | undefined;
  let node = sp.root ? await one("SELECT * FROM users WHERE upper(code) = upper($1) AND status <> 'inactive'", [sp.root.trim()]) : null;
  if (sp.root && !node) err = "ID not found or not placed in the tree yet.";
  if (!node) node = await getRoot(pool());
  if (!node)
    return (
      <Card>
        <Empty>No tree yet. Create the company top ID from Add Member.</Empty>
      </Card>
    );
  const [nodes, xl, xr, parent] = await Promise.all([
    subtree(node.id, 4),
    extremeNode(node.id, "L"),
    extremeNode(node.id, "R"),
    node.parent_id ? one("SELECT code FROM users WHERE id = $1", [node.parent_id]) : null,
  ]);
  const href = (c: string) => `/admin/tree?root=${c}`;
  return (
    <>
      <PageHead
        title="Tree Viewer"
        actions={
          <form className="flex gap-2">
            <input className="inp w-44" name="root" placeholder="Member ID" defaultValue={sp.root} />
            <button className="btn btn-acc">Open</button>
          </form>
        }
      />
      <Flash sp={{ err }} />
      <Card
        title={`${node.name} (${node.code}) · L ${node.left_count} / R ${node.right_count}`}
        action={
          <span className="flex gap-3">
            {parent && <Link href={href(parent.code)}>↑ Parent</Link>}
            {xl && <Link href={href(xl.code)}>⇤ Extreme Left</Link>}
            {xr && <Link href={href(xr.code)}>Extreme Right ⇥</Link>}
            <Link href={`/admin/members/${node.code}`}>Member page</Link>
          </span>
        }
      >
        <TreeView nodes={nodes} rootId={node.id} hrefFor={href} />
      </Card>
    </>
  );
}
