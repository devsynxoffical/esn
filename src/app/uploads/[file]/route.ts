import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { UPLOAD_DIR, MIME } from "@/lib/upload";

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!/^[a-z0-9-]+\.(png|jpg|webp|gif|pdf|mp4)$/i.test(file)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(join(UPLOAD_DIR, file));
    const ext = file.split(".").pop()!.toLowerCase();
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
