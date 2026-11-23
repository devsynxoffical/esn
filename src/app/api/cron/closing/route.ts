import { tx } from "@/lib/db";
import { runDueClosings } from "@/lib/engine";

/**
 * Midnight closing endpoint for an external scheduler (cron-job.org, server crontab, Vercel Cron).
 * Call daily at 00:00 Asia/Karachi with header:  Authorization: Bearer <CRON_SECRET>
 */
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  const results = await runDueClosings(tx);
  return Response.json({ ok: true, closed: results });
}

export const GET = run;
export const POST = run;
