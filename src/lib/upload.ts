import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { fail } from "./db";

export const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "uploads");

const TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
};

/** Save an uploaded file and return its public URL (/uploads/xxx.ext), or null when no file was sent. */
export async function saveUpload(file: FormDataEntryValue | null, allow: ("image" | "pdf" | "video")[]): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  const ext = TYPES[file.type];
  const kind = file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : "video";
  if (!ext || !allow.includes(kind)) fail(`File type not allowed. Allowed: ${allow.join(", ")}.`);
  const max = kind === "video" ? 45 : kind === "pdf" ? 25 : 5;
  if (file.size > max * 1024 * 1024) fail(`File too large (max ${max} MB).`);
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

export const MIME: Record<string, string> = Object.fromEntries(Object.entries(TYPES).map(([m, e]) => [e, m]));
