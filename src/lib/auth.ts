import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { q, one, type Row } from "./db";

const COOKIE = "esn_session";
const DAYS = 14;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + DAYS * 86400_000);
  await q("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1,$2,$3)", [sha(token), userId, expires]);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const t = jar.get(COOKIE)?.value;
  if (t) await q("DELETE FROM sessions WHERE token_hash = $1", [sha(t)]);
  jar.delete(COOKIE);
}

/** Current user (with plan) for this request, or null. */
export const currentUser = cache(async (): Promise<Row | null> => {
  const jar = await cookies();
  const t = jar.get(COOKIE)?.value;
  if (!t) return null;
  return one(
    `SELECT u.*, p.name AS plan_name, p.code AS plan_code, p.price AS plan_price,
            p.is_distributor AS plan_is_distributor, p.is_manager AS plan_is_manager
     FROM sessions s JOIN users u ON u.id = s.user_id LEFT JOIN plans p ON p.id = u.plan_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha(t)],
  );
});

export async function requireMember(): Promise<Row> {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (u.role === "admin") redirect("/admin");
  if (u.status === "blocked") redirect("/login?err=Your+account+is+blocked.+Contact+support.");
  return u;
}

export async function requireActiveMember(): Promise<Row> {
  const u = await requireMember();
  if (u.status !== "active") redirect("/dashboard/activate?err=Activate+your+ID+first.");
  return u;
}

export async function requireAdmin(): Promise<Row> {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (u.role !== "admin") redirect("/dashboard");
  if (u.status === "blocked") redirect("/login?err=Access+removed.");
  return u;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") || h.get("x-real-ip") || "").split(",")[0].trim() || "unknown";
}

/** Max 5 failed logins per identifier per 15 minutes. */
export async function tooManyAttempts(identifier: string): Promise<boolean> {
  const r = await one<{ n: number }>(
    `SELECT count(*)::int AS n FROM login_attempts WHERE identifier = $1 AND NOT success AND created_at > now() - interval '15 minutes'`,
    [identifier.toLowerCase()],
  );
  return (r?.n ?? 0) >= 5;
}

export async function recordAttempt(identifier: string, success: boolean) {
  await q("INSERT INTO login_attempts (identifier, ip, success) VALUES ($1,$2,$3)", [
    identifier.toLowerCase(),
    await clientIp(),
    success,
  ]);
}
