import "server-only";
import { one, tx } from "./db";
import { getSettings } from "./settings";
import { runDueClosings } from "./engine";

let lastCheck = 0;

/**
 * Backup for the midnight cron: when anyone opens the dashboard/admin after midnight,
 * any unclosed past day is closed automatically. Checks at most once a minute per server.
 */
export async function maybeRunClosings() {
  if (Date.now() - lastCheck < 60_000) return;
  lastCheck = Date.now();
  try {
    const s = await getSettings();
    const due = await one(
      `SELECT 1 AS due WHERE EXISTS (
         SELECT 1 FROM pairs WHERE status = 'pending' AND day < (now() AT TIME ZONE $1)::date
       ) OR NOT EXISTS (SELECT 1 FROM closings WHERE day = (now() AT TIME ZONE $1)::date - 1)`,
      [s.closing_timezone],
    );
    if (due) await runDueClosings(tx);
  } catch (e) {
    console.error("auto-closing failed", e);
  }
}
