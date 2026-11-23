/** Midnight closing. Schedule daily at 00:00 PKT, e.g. crontab: 0 0 * * * cd /app && npm run closing */
import { pool, tx } from "../src/lib/db";
import { runDueClosings } from "../src/lib/engine";

runDueClosings(tx)
  .then(async (r) => {
    console.log(JSON.stringify(r, null, 2));
    await pool().end();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
