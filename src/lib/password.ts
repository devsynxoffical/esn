import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const N = 16384;

export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64, { N });
  return ["scrypt", N, salt.toString("base64"), hash.toString("base64")].join("$");
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [alg, n, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const got = scryptSync(pw, Buffer.from(salt, "base64"), expected.length, { N: Number(n) });
  return timingSafeEqual(expected, got);
}
