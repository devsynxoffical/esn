import { pool, tx } from "../src/lib/db";
import { seedDefaults } from "../src/lib/seed";

async function main() {
  const adminPhone = process.env.ADMIN_PHONE || "03000000000";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe@123";
  await tx((c) => seedDefaults(c, { adminPhone, adminPassword, withCompanyRoot: true }));
  console.log(`Seed done. Admin login phone: ${adminPhone}. Change the admin password after first login.`);
  await pool().end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
