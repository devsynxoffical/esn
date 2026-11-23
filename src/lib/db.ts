import { Pool, type PoolClient, types } from "pg";

// NUMERIC -> number (rounded to 2dp in code), BIGINT -> number, DATE -> 'YYYY-MM-DD' string
types.setTypeParser(1700, (v) => parseFloat(v));
types.setTypeParser(20, (v) => parseInt(v, 10));
types.setTypeParser(1082, (v) => v);

export type Db = Pool | PoolClient;

const g = globalThis as unknown as { __esnPool?: Pool };

export function pool(): Pool {
  if (!g.__esnPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString)
      throw new Error(
        "DATABASE_URL is not set. Add a PostgreSQL connection string (e.g. from Neon) as the DATABASE_URL environment variable.",
      );
    g.__esnPool = new Pool({
      connectionString,
      max: Number(process.env.DB_POOL_MAX || 5),
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return g.__esnPool;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export async function q<T = Row>(sql: string, params: unknown[] = [], db: Db = pool()): Promise<T[]> {
  const res = await db.query(sql, params as unknown[]);
  return res.rows as T[];
}

export async function one<T = Row>(sql: string, params: unknown[] = [], db: Db = pool()): Promise<T | null> {
  const rows = await q<T>(sql, params, db);
  return rows[0] ?? null;
}

/** Run fn inside a transaction. Rolls back on error. */
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("BEGIN");
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** A user-facing error (message safe to show). */
export class UserError extends Error {}
export const fail = (msg: string): never => {
  throw new UserError(msg);
};
