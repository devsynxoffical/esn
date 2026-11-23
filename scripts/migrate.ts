import { pool } from "../src/lib/db";
import { SCHEMA_SQL } from "../src/lib/schema";

async function main() {
  await pool().query(SCHEMA_SQL);
  console.log("Schema up to date.");
  await pool().end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
