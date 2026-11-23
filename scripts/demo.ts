/** Generate demo data from the command line: npm run demo -- 60 */
import { pool, one } from "../src/lib/db";
import { generateDemo } from "../src/lib/demo";
import { ensureReady } from "../src/lib/bootstrap";

async function main() {
  await ensureReady();
  const admin = await one("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1");
  const r = await generateDemo(admin!.id, Number(process.argv[2] || 100));
  console.log(r);
  await pool().end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
