import { currentUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(req: Request) {
  const me = await currentUser();
  if (!me || me.role !== "admin") return new Response("Forbidden", { status: 403 });
  const u = new URL(req.url);
  const status = u.searchParams.get("status") || "";
  const batch = u.searchParams.get("batch") || "";
  const rows = await q(
    `SELECT e.code, p.name AS plan, p.price, e.status, e.source, e.batch, o.code AS owner, us.code AS used_by, e.used_at, e.created_at
     FROM epins e JOIN plans p ON p.id = e.plan_id LEFT JOIN users o ON o.id = e.owner_id LEFT JOIN users us ON us.id = e.used_by
     WHERE ($1 = '' OR e.status = $1) AND ($2 = '' OR e.batch = $2) ORDER BY e.id DESC LIMIT 50000`,
    [status, batch],
  );
  const csv = toCsv(rows, [
    ["code", "E-Pin"],
    ["plan", "Plan"],
    ["price", "Price"],
    ["status", "Status"],
    ["source", "Source"],
    ["batch", "Batch"],
    ["owner", "Owner"],
    ["used_by", "Used by"],
    ["used_at", "Used at"],
    ["created_at", "Created"],
  ]);
  return csvResponse(`epins-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
