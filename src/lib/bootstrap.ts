import { one, tx } from "./db";
import { SCHEMA_SQL } from "./schema";
import { seedDefaults } from "./seed";
import { normPhone } from "./validate";

const g = globalThis as unknown as { __esnReady?: Promise<void> };

/**
 * Makes sure the database is ready. On the very first run against an empty database it creates
 * all tables and the default plans, ranks, products, the admin login (from ADMIN_PHONE /
 * ADMIN_PASSWORD) and the company top ID. On later runs it only applies new schema changes.
 * Runs once per server instance; safe when several instances start at the same time.
 */
export function ensureReady(): Promise<void> {
  if (!g.__esnReady) {
    g.__esnReady = setup().catch((e) => {
      g.__esnReady = undefined;
      throw e;
    });
  }
  return g.__esnReady;
}

async function setup() {
  await tx(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(7700)");
    await c.query(SCHEMA_SQL);
    // one-time image upgrade for databases created before the real product photos
    await c.query(
      `UPDATE products SET image_url = CASE image_url WHEN '/products/handsfree.svg' THEN '/products/earbuds.webp'
         WHEN '/products/watch.svg' THEN '/products/watch.webp' END
       WHERE image_url IN ('/products/handsfree.svg', '/products/watch.svg')`,
    );
    // one-time cleanup of long dashes in stored text
    await c.query(`UPDATE training SET title = replace(title, ' — ', ': ') WHERE title LIKE '%—%'`);
    await c.query(
      `UPDATE settings SET value = to_jsonb(replace(value #>> '{}', ' — ', ', '))
       WHERE jsonb_typeof(value) = 'string' AND value #>> '{}' LIKE '%—%'`,
    );
    await c.query(
      `UPDATE announcements SET title = replace(replace(title, ' — ', ': '), '—', ', '),
         body = replace(replace(body, ' — ', ', '), '—', ', ')
       WHERE title LIKE '%—%' OR body LIKE '%—%'`,
    );
    await c.query(`UPDATE transactions SET note = replace(note, ' — ', ' and ') WHERE note LIKE '%—%'`);
    const admin = await one("SELECT id FROM users WHERE role = 'admin' LIMIT 1", [], c);
    if (admin) return;
    const adminPhone = process.env.ADMIN_PHONE ? normPhone(process.env.ADMIN_PHONE) : "";
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPhone || !adminPassword || adminPassword.length < 8) {
      throw new Error(
        "First-time setup: set the ADMIN_PHONE and ADMIN_PASSWORD (8+ characters) environment variables, then redeploy.",
      );
    }
    await seedDefaults(c, { adminPhone, adminPassword, withCompanyRoot: true });
  });
}

/** Returns a human-readable setup problem, or null when the database is ready. */
export async function setupProblem(): Promise<string | null> {
  try {
    await ensureReady();
    return null;
  } catch (e) {
    console.error("ESN setup failed:", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("DATABASE_URL") || msg.startsWith("First-time setup")) return msg;
    return "Could not connect to the database. Check that DATABASE_URL is correct and the database is reachable.";
  }
}
