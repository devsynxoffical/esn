"use server";

import { one, q, tx, fail } from "@/lib/db";
import { requireMember, requireActiveMember } from "@/lib/auth";
import { handle, str, numv } from "@/lib/action";
import { activate, audit } from "@/lib/engine";
import { getSettings } from "@/lib/settings";
import {
  earningToEpin,
  pinFromWallet,
  transferPin,
  requestWithdrawal,
  chooseReward,
  distributorWhere,
} from "@/lib/ops";
import { hashPassword, verifyPassword } from "@/lib/password";
import { saveUpload } from "@/lib/upload";

export async function activateSelfAction(fd: FormData) {
  const me = await requireMember();
  await handle(
    "/dashboard/activate",
    async () => {
      if (me.status === "active") fail("Your ID is already active.");
      const r = await tx((c) => activate(c, { userId: me.id, method: "epin", epinCode: str(fd, "pin"), actorId: me.id }));
      return `Congratulations! ${r.code} is now ACTIVE. Invoice ${r.invoiceNumber} generated and your product order is placed.`;
    },
    "/dashboard",
  );
}

export async function activateMemberAction(fd: FormData) {
  const me = await requireActiveMember();
  await handle("/dashboard/team", async () => {
    const target = await one("SELECT id, code, status FROM users WHERE upper(code) = upper($1) AND role = 'member'", [
      str(fd, "code"),
    ]);
    if (!target) fail("Member ID not found.");
    const method = str(fd, "method") === "wallet" ? "wallet" : "epin";
    const r = await tx((c) =>
      method === "wallet"
        ? activate(c, { userId: target!.id, method: "wallet", payerId: me.id, actorId: me.id })
        : activate(c, { userId: target!.id, method: "epin", epinCode: str(fd, "pin"), actorId: me.id }),
    );
    return `${r.code} activated (${r.planName}). Invoice ${r.invoiceNumber}.`;
  });
}

export async function convertAction(fd: FormData) {
  const me = await requireActiveMember();
  await handle("/dashboard/wallet", async () => {
    await tx((c) => earningToEpin(c, me.id, numv(fd, "amount")));
    return "Amount moved to your E-Pin wallet.";
  });
}

export async function buyPinsAction(fd: FormData) {
  const me = await requireActiveMember();
  await handle("/dashboard/epins", async () => {
    const codes = await tx((c) => pinFromWallet(c, me.id, numv(fd, "plan_id"), Math.floor(numv(fd, "count") || 1)));
    return `${codes.length} E-Pin(s) created. See them in the list below.`;
  });
}

export async function transferPinAction(fd: FormData) {
  const me = await requireActiveMember();
  await handle("/dashboard/epins", async () => {
    const s = await getSettings();
    if (!s.allow_member_pin_transfer) fail("E-Pin transfer is disabled by admin.");
    const to = await tx((c) => transferPin(c, me.id, numv(fd, "pin_id"), str(fd, "to"), me.id));
    return `E-Pin transferred to ${to}.`;
  });
}

export async function withdrawAction(fd: FormData) {
  const me = await requireActiveMember();
  await handle("/dashboard/withdraw", async () => {
    const r = await tx((c) =>
      requestWithdrawal(c, me.id, {
        amount: numv(fd, "amount"),
        method: str(fd, "method"),
        title: str(fd, "title"),
        account: str(fd, "account"),
        bank: str(fd, "bank"),
      }),
    );
    return `Withdrawal #${r.id} requested. Fee ${r.fee}, you will receive ${r.net}.`;
  });
}

export async function chooseRewardAction(fd: FormData) {
  const me = await requireActiveMember();
  await handle("/dashboard/ranks", async () => {
    const choice = str(fd, "choice") === "cash" ? "cash" : "gift";
    await tx((c) => chooseReward(c, me.id, numv(fd, "id"), choice));
    return choice === "cash" ? "Cash reward added to your Earning wallet." : "Gift requested. The office will contact you.";
  });
}

export async function profileAction(fd: FormData) {
  const me = await requireMember();
  await handle("/dashboard/profile", async () => {
    const name = str(fd, "name");
    if (name.length < 3) fail("Enter your full name.");
    await q("UPDATE users SET name = $2, email = $3, city = $4, address = $5 WHERE id = $1", [
      me.id,
      name,
      str(fd, "email") || null,
      str(fd, "city") || null,
      str(fd, "address") || null,
    ]);
    return "Profile updated.";
  });
}

export async function passwordAction(fd: FormData) {
  const me = await requireMember();
  await handle("/dashboard/profile", async () => {
    const cur = String(fd.get("current") ?? "");
    const pw = String(fd.get("password") ?? "");
    if (!verifyPassword(cur, me.password_hash)) fail("Current password is wrong.");
    if (pw.length < 8) fail("New password must be at least 8 characters.");
    if (pw !== String(fd.get("confirm") ?? "")) fail("Passwords do not match.");
    await q("UPDATE users SET password_hash = $2 WHERE id = $1", [me.id, hashPassword(pw)]);
    await q("DELETE FROM sessions WHERE user_id = $1 AND created_at < now() - interval '1 second'", [me.id]);
    await audit((await import("@/lib/db")).pool(), me.id, "member.password", {});
    return "Password changed.";
  });
}

async function requireDistributor() {
  const me = await requireActiveMember();
  const ok = await one(`SELECT 1 FROM users u LEFT JOIN plans p ON p.id = u.plan_id WHERE u.id = $1 AND ${distributorWhere}`, [me.id]);
  if (!ok) fail("Distributor portal is not unlocked for your ID.");
  return me;
}

export async function brandAction(fd: FormData) {
  await handle("/dashboard/distributor", async () => {
    const me = await requireDistributor();
    const name = str(fd, "brand_name");
    if (name.length < 2) fail("Enter your brand name.");
    const logo = await saveUpload(fd.get("logo"), ["image"]);
    await q(
      `UPDATE users SET brand_name = $2, brand_description = $3, brand_logo_url = coalesce($4, brand_logo_url) WHERE id = $1`,
      [me.id, name, str(fd, "brand_description"), logo],
    );
    return "Brand saved.";
  });
}

export async function vendorProductAction(fd: FormData) {
  await handle("/dashboard/distributor", async () => {
    const me = await requireDistributor();
    if (!me.brand_name) fail("Save your brand first.");
    const name = str(fd, "name");
    const price = numv(fd, "price");
    if (name.length < 3 || !(price > 0)) fail("Enter product name and price.");
    const image = (await saveUpload(fd.get("image"), ["image"])) || str(fd, "image_url");
    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50) +
      "-" +
      Date.now().toString(36);
    await q(
      `INSERT INTO products (slug, name, category, description, specs, price, image_url, vendor_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')`,
      [slug, name, str(fd, "category") || "General", str(fd, "description"), str(fd, "specs"), price, image, me.id],
    );
    return "Product submitted for admin approval.";
  });
}

export async function vendorProductDeleteAction(fd: FormData) {
  await handle("/dashboard/distributor", async () => {
    const me = await requireDistributor();
    await q("UPDATE products SET active = false WHERE id = $1 AND vendor_id = $2", [numv(fd, "id"), me.id]);
    return "Product removed from store.";
  });
}
