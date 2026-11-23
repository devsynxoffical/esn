import { timingSafeEqual } from "node:crypto";
import { one } from "@/lib/db";
import { ensureReady } from "@/lib/bootstrap";
import { generateDemo } from "@/lib/demo";

export const maxDuration = 300;

/**
 * One-time demo data trigger for operators. Disabled unless the DEMO_SECRET environment
 * variable is set; remove the variable after use. Usage: GET /api/tools/demo?key=<DEMO_SECRET>&count=100
 */
export async function GET(req: Request) {
  const secret = process.env.DEMO_SECRET;
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "";
  if (!secret || secret.length < 24 || key.length !== secret.length || !timingSafeEqual(Buffer.from(key), Buffer.from(secret))) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  await ensureReady();
  const admin = await one("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1");
  const r = await generateDemo(admin!.id, Math.min(200, Math.max(5, Number(url.searchParams.get("count")) || 100)));
  return Response.json({ ok: true, ...r });
}
