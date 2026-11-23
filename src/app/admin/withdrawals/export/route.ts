import { currentUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(req: Request) {
  const me = await currentUser();
  if (!me || me.role !== "admin") return new Response("Forbidden", { status: 403 });
  const status = new URL(req.url).searchParams.get("status") || "pending";
  const rows = await q(
    `SELECT w.id, u.code, u.name, u.phone, w.method, w.account_title, w.account_number, w.bank_name,
            w.amount, w.fee, w.net, w.status, w.admin_note, w.created_at, w.processed_at
     FROM withdrawals w JOIN users u ON u.id = w.user_id WHERE ($1 = 'all' OR w.status = $1) ORDER BY w.id`,
    [status],
  );
  const csv = toCsv(rows, [
    ["id", "Request #"],
    ["code", "Member ID"],
    ["name", "Name"],
    ["phone", "Mobile"],
    ["method", "Method"],
    ["account_title", "Account title"],
    ["account_number", "Account / IBAN"],
    ["bank_name", "Bank"],
    ["amount", "Amount"],
    ["fee", "Fee"],
    ["net", "To pay"],
    ["status", "Status"],
    ["admin_note", "Note"],
    ["created_at", "Requested"],
    ["processed_at", "Processed"],
  ]);
  return csvResponse(`withdrawals-${status}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
