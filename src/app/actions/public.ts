"use server";

import { redirect } from "next/navigation";
import { one, fail, tx, pool } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySession, tooManyAttempts, recordAttempt } from "@/lib/auth";
import { nextMemberCode, getRoot, audit } from "@/lib/engine";
import { handle, str, numv } from "@/lib/action";
import { normPhone, normCnic, isPhone } from "@/lib/validate";

export async function registerAction(fd: FormData) {
  const back = `/register?ref=${encodeURIComponent(str(fd, "ref"))}&leg=${str(fd, "leg") === "R" ? "R" : "L"}`;
  await handle(
    back,
    async () => {
      const s = await getSettings();
      if (!s.allow_registration) fail("Registration is closed. Please contact the office.");
      const name = str(fd, "name");
      const phone = normPhone(str(fd, "phone"));
      const email = str(fd, "email") || null;
      const cnicRaw = str(fd, "cnic");
      const cnic = cnicRaw ? normCnic(cnicRaw) : "";
      const city = str(fd, "city");
      const address = str(fd, "address");
      const password = String(fd.get("password") ?? "");
      const confirm = String(fd.get("confirm") ?? "");
      const leg = str(fd, "leg") === "R" ? "R" : "L";
      const planId = numv(fd, "plan_id");
      const productId = numv(fd, "product_id");
      let ref = str(fd, "ref").toUpperCase();

      if (name.length < 3) fail("Enter your full name.");
      if (!isPhone(phone)) fail("Enter a valid mobile number like 03001234567.");
      if (s.require_cnic && !cnic) fail("Enter a valid 13-digit CNIC.");
      if (cnicRaw && !cnic) fail("CNIC must be 13 digits.");
      if (password.length < 8) fail("Password must be at least 8 characters.");
      if (password !== confirm) fail("Passwords do not match.");
      if (s.unique_phone && (await one("SELECT 1 FROM users WHERE phone = $1", [phone])))
        fail("This mobile number is already registered.");
      if (s.unique_cnic && cnic && (await one("SELECT 1 FROM users WHERE cnic = $1", [cnic])))
        fail("This CNIC is already registered. One CNIC = one account.");

      if (!ref) ref = String(s.default_sponsor_code || "").toUpperCase();
      let sponsorId: number | null = null;
      if (ref) {
        const sp = await one("SELECT id FROM users WHERE upper(code) = $1 AND role = 'member' AND status <> 'blocked'", [ref]);
        if (!sp) fail("Sponsor ID not found. Check your referral link.");
        sponsorId = sp!.id;
      } else if (s.require_sponsor) {
        fail("A sponsor ID is required to register.");
      } else {
        sponsorId = (await getRoot(pool()))?.id ?? null;
      }

      const plan = await one("SELECT id FROM plans WHERE id = $1 AND active AND public", [planId]);
      if (!plan) fail("Choose a plan.");
      const product = await one("SELECT id FROM products WHERE id = $1 AND is_package AND active", [productId]);
      if (!product) fail("Choose your product (Handsfree or Watch).");

      const u = await tx(async (c) => {
        const code = await nextMemberCode(c);
        const row = await one(
          `INSERT INTO users (code, name, phone, email, cnic, city, address, password_hash, sponsor_id, preferred_leg, plan_id, product_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id, code`,
          [
            code, name, phone, email, cnic || null, city || null, address || null, hashPassword(password),
            sponsorId, leg, plan!.id, product!.id,
          ],
          c,
        );
        await audit(c, row!.id, "member.register", { code: row!.code, sponsorId, leg });
        return row!;
      });
      await createSession(u.id);
      return `Welcome! Your ID is ${u.code}. Pay at the office and enter your E-Pin to activate.`;
    },
    "/dashboard/activate",
  );
}

export async function loginAction(fd: FormData) {
  const id = str(fd, "id");
  const password = String(fd.get("password") ?? "");
  let dest = "/dashboard";
  await handle(
    "/login",
    async () => {
      if (!id || !password) fail("Enter your ID / mobile number and password.");
      if (await tooManyAttempts(id)) fail("Too many failed attempts. Try again in 15 minutes.");
      const phone = normPhone(id);
      const u = await one(
        `SELECT id, role, status, password_hash FROM users
         WHERE upper(code) = upper($1) OR (phone = $2 AND $2 <> '')
         ORDER BY (role = 'admin') DESC, id LIMIT 1`,
        [id, isPhone(phone) ? phone : ""],
      );
      if (!u || !verifyPassword(password, u.password_hash)) {
        await recordAttempt(id, false);
        fail("Wrong ID / mobile number or password.");
      }
      if (u!.status === "blocked") fail("Your account is blocked. Contact support.");
      await recordAttempt(id, true);
      await createSession(u!.id);
      dest = u!.role === "admin" ? "/admin" : "/dashboard";
      return "Welcome back!";
    },
    () => dest,
  );
}

export async function logoutAction() {
  await destroySession();
  redirect("/login?ok=Logged+out.");
}

export async function placeOrderAction(fd: FormData) {
  const slug = str(fd, "slug");
  await handle(`/product/${slug}`, async () => {
    const p = await one(
      "SELECT * FROM products WHERE slug = $1 AND active AND status = 'approved' AND NOT is_package",
      [slug],
    );
    if (!p) fail("Product not available.");
    const qty = Math.max(1, Math.min(20, Math.floor(numv(fd, "qty") || 1)));
    const name = str(fd, "name");
    const phone = normPhone(str(fd, "phone"));
    const city = str(fd, "city");
    const address = str(fd, "address");
    if (name.length < 3 || !isPhone(phone) || address.length < 5 || !city)
      fail("Enter name, a valid mobile number, city and full address.");
    const o = await one(
      `INSERT INTO orders (kind, product_id, product_name, vendor_id, qty, amount, customer_name, phone, address, city)
       VALUES ('store',$1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [p!.id, p!.name, p!.vendor_id, qty, p!.price * qty, name, phone, address, city],
    );
    return `Order #${o!.id} placed! Cash on delivery — our team will call you to confirm.`;
  });
}
