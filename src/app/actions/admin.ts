"use server";

import { one, q, tx, fail, pool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handle, str, numv, bool } from "@/lib/action";
import { activate, audit, credit, nextMemberCode, runDueClosings } from "@/lib/engine";
import { SETTING_DEFS, DEFAULTS, saveSetting, type SettingKey } from "@/lib/settings";
import {
  generatePins,
  transferPin,
  processWithdrawal,
  settleStoreOrder,
  runManagerPayout,
} from "@/lib/ops";
import { hashPassword, verifyPassword } from "@/lib/password";
import { saveUpload } from "@/lib/upload";
import { normPhone, normCnic, isPhone } from "@/lib/validate";

const back = (fd: FormData, def: string) => {
  const b = str(fd, "_back");
  return b.startsWith("/admin") ? b : def;
};
const money2 = (n: number) => (Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN);
const posNum = (fd: FormData, k: string, label: string) => {
  const v = numv(fd, k);
  if (!Number.isFinite(v) || v < 0) fail(`${label} must be a number (0 or more).`);
  return money2(v);
};

// ---------------------------------------------------------------- settings
export async function saveSettingsAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle("/admin/settings", async () => {
    const changed: Record<string, unknown> = {};
    for (const key of Object.keys(SETTING_DEFS) as SettingKey[]) {
      const def = SETTING_DEFS[key];
      if (!fd.has(`present_${key}`)) continue;
      let v: unknown;
      if (def.type === "bool") v = bool(fd, key);
      else if (def.type === "number") {
        v = numv(fd, key);
        if (!Number.isFinite(v as number) || (v as number) < 0) fail(`${def.label}: enter a valid number.`);
      } else if (def.type === "list")
        v = str(fd, key)
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean);
      else if (def.type === "select") {
        v = str(fd, key);
        if (!def.options!.some((o) => o.value === v)) fail(`${def.label}: invalid option.`);
      } else v = str(fd, key);
      if (key === "withdrawal_methods" && !(v as string[]).length) fail("Add at least one payment method.");
      if (key === "closing_timezone") {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v as string });
        } catch {
          fail("Invalid timezone, e.g. Asia/Karachi");
        }
      }
      await saveSetting(key, v);
      changed[key] = v;
    }
    await audit(pool(), admin.id, "settings.update", changed);
    return "Settings saved. Changes apply immediately.";
  });
}

export async function resetSettingAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle("/admin/settings", async () => {
    const key = str(fd, "key") as SettingKey;
    if (!(key in DEFAULTS)) fail("Unknown setting.");
    await q("DELETE FROM settings WHERE key = $1", [key]);
    await audit(pool(), admin.id, "settings.reset", { key });
    return "Setting reset to default.";
  });
}

// ---------------------------------------------------------------- plans
export async function savePlanAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle("/admin/plans", async () => {
    const id = numv(fd, "id");
    const name = str(fd, "name");
    if (name.length < 2) fail("Plan name is required.");
    const vals = [
      name,
      str(fd, "description"),
      posNum(fd, "price", "Price"),
      posNum(fd, "direct_pair_bonus", "Direct pair bonus"),
      posNum(fd, "indirect_pair_bonus", "Indirect pair bonus"),
      posNum(fd, "direct_referral_bonus", "Direct referral bonus"),
      Math.floor(posNum(fd, "daily_cap_pairs", "Daily cap pairs")),
      posNum(fd, "daily_cap_amount", "Daily cap amount"),
      posNum(fd, "monthly_salary", "Monthly salary"),
      bool(fd, "is_distributor"),
      bool(fd, "is_manager"),
      bool(fd, "public"),
      bool(fd, "active"),
      Math.floor(numv(fd, "sort") || 0),
    ];
    if (id > 0) {
      const before = await one("SELECT * FROM plans WHERE id = $1", [id]);
      await q(
        `UPDATE plans SET name=$1, description=$2, price=$3, direct_pair_bonus=$4, indirect_pair_bonus=$5,
           direct_referral_bonus=$6, daily_cap_pairs=$7, daily_cap_amount=$8, monthly_salary=$9,
           is_distributor=$10, is_manager=$11, public=$12, active=$13, sort=$14 WHERE id=$15`,
        [...vals, id],
      );
      await audit(pool(), admin.id, "plan.update", { before, after: vals });
      return `Plan "${name}" saved.`;
    }
    const code =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || `plan-${Date.now()}`;
    await q(
      `INSERT INTO plans (name, description, price, direct_pair_bonus, indirect_pair_bonus, direct_referral_bonus,
         daily_cap_pairs, daily_cap_amount, monthly_salary, is_distributor, is_manager, public, active, sort, code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [...vals, code],
    );
    await audit(pool(), admin.id, "plan.create", { name });
    return `Plan "${name}" created.`;
  });
}

// ---------------------------------------------------------------- ranks
export async function saveRankAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle("/admin/ranks", async () => {
    const id = numv(fd, "id");
    const level = Math.floor(numv(fd, "level"));
    const name = str(fd, "name");
    const pairs = Math.floor(numv(fd, "pairs_required"));
    if (!(level > 0) || !name || !(pairs > 0)) fail("Level, name and pairs required are needed.");
    const capP = str(fd, "daily_cap_pairs") === "" ? null : Math.floor(numv(fd, "daily_cap_pairs"));
    const capA = str(fd, "daily_cap_amount") === "" ? null : posNum(fd, "daily_cap_amount", "Cap amount");
    const vals = [
      level,
      name,
      pairs,
      str(fd, "reward_item"),
      posNum(fd, "reward_cash", "Reward cash"),
      capP,
      capA,
      bool(fd, "unlocks_distributor"),
      bool(fd, "unlocks_manager"),
      bool(fd, "active"),
    ];
    if (id > 0) {
      await q(
        `UPDATE ranks SET level=$1, name=$2, pairs_required=$3, reward_item=$4, reward_cash=$5, daily_cap_pairs=$6,
           daily_cap_amount=$7, unlocks_distributor=$8, unlocks_manager=$9, active=$10 WHERE id=$11`,
        [...vals, id],
      );
    } else {
      await q(
        `INSERT INTO ranks (level, name, pairs_required, reward_item, reward_cash, daily_cap_pairs, daily_cap_amount,
           unlocks_distributor, unlocks_manager, active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        vals,
      );
    }
    await audit(pool(), admin.id, id > 0 ? "rank.update" : "rank.create", { level, name, pairs });
    return `Rank "${name}" saved.`;
  });
}

export async function deleteRankAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle("/admin/ranks", async () => {
    const r = await one("SELECT * FROM ranks WHERE id = $1", [numv(fd, "id")]);
    if (!r) fail("Rank not found.");
    const used = await one("SELECT 1 FROM rank_achievements WHERE rank_level = $1 LIMIT 1", [r!.level]);
    if (used) fail("Members already achieved this rank. Deactivate it instead of deleting.");
    await q("DELETE FROM ranks WHERE id = $1", [r!.id]);
    await audit(pool(), admin.id, "rank.delete", { name: r!.name });
    return "Rank deleted.";
  });
}

export async function rewardDeliveredAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle("/admin/rewards", async () => {
    const id = numv(fd, "id");
    await q("UPDATE rank_achievements SET status = 'gift_delivered', updated_at = now() WHERE id = $1 AND status = 'gift_pending'", [id]);
    await audit(pool(), admin.id, "reward.delivered", { id });
    return "Gift marked as delivered.";
  });
}

// ---------------------------------------------------------------- products
export async function saveProductAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle(back(fd, "/admin/products"), async () => {
    const id = numv(fd, "id");
    const name = str(fd, "name");
    if (name.length < 2) fail("Product name is required.");
    const upload = await saveUpload(fd.get("image"), ["image"]);
    const image = upload || str(fd, "image_url");
    const slug =
      str(fd, "slug") ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const vals = [
      slug,
      name,
      str(fd, "category") || "General",
      str(fd, "description"),
      str(fd, "specs"),
      posNum(fd, "price", "Price"),
      image,
      bool(fd, "is_package"),
      bool(fd, "active"),
      Math.floor(numv(fd, "sort") || 0),
    ];
    if (id > 0) {
      await q(
        `UPDATE products SET slug=$1, name=$2, category=$3, description=$4, specs=$5, price=$6, image_url=$7,
           is_package=$8, active=$9, sort=$10 WHERE id=$11`,
        [...vals, id],
      );
    } else {
      await q(
        `INSERT INTO products (slug, name, category, description, specs, price, image_url, is_package, active, sort, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'approved')`,
        vals,
      );
    }
    await audit(pool(), admin.id, id > 0 ? "product.update" : "product.create", { name });
    return `Product "${name}" saved.`;
  });
}

export async function reviewProductAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle("/admin/products?tab=vendor", async () => {
    const status = str(fd, "status") === "approved" ? "approved" : "rejected";
    await q("UPDATE products SET status = $2, admin_note = $3 WHERE id = $1 AND vendor_id IS NOT NULL", [
      numv(fd, "id"),
      status,
      str(fd, "note") || null,
    ]);
    await audit(pool(), admin.id, `product.${status}`, { id: numv(fd, "id") });
    return `Product ${status}.`;
  });
}

// ---------------------------------------------------------------- members
export async function createMemberAction(fd: FormData) {
  const admin = await requireAdmin();
  let code = "";
  await handle(
    "/admin/members/new",
    async () => {
      const name = str(fd, "name");
      const phone = normPhone(str(fd, "phone"));
      const cnic = str(fd, "cnic") ? normCnic(str(fd, "cnic")) : "";
      const password = String(fd.get("password") ?? "");
      const isCompany = bool(fd, "is_company");
      if (name.length < 2) fail("Name is required.");
      if (!isCompany && !isPhone(phone)) fail("Enter a valid mobile number.");
      if (str(fd, "cnic") && !cnic) fail("CNIC must be 13 digits.");
      if (password.length < 8) fail("Password must be at least 8 characters.");
      if (!isCompany && (await one("SELECT 1 FROM users WHERE phone = $1", [phone]))) fail("Mobile number already registered.");
      if (cnic && (await one("SELECT 1 FROM users WHERE cnic = $1", [cnic]))) fail("CNIC already registered.");
      const plan = await one("SELECT id FROM plans WHERE id = $1", [numv(fd, "plan_id")]);
      if (!plan) fail("Choose a plan.");
      const leg = str(fd, "leg") === "R" ? "R" : "L";
      const sponsorCode = str(fd, "sponsor").toUpperCase();
      const sponsor = sponsorCode ? await one("SELECT id FROM users WHERE upper(code) = $1 AND role='member'", [sponsorCode]) : null;
      if (sponsorCode && !sponsor) fail("Sponsor ID not found.");
      const parentCode = str(fd, "parent").toUpperCase();
      const activation = str(fd, "activation"); // none | cash | company

      code = await tx(async (c) => {
        const newCode = await nextMemberCode(c);
        const u = await one(
          `INSERT INTO users (code, name, phone, cnic, city, address, password_hash, sponsor_id, preferred_leg, plan_id, product_id, is_company)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
          [
            newCode, name, phone || `company-${newCode}`, cnic || null, str(fd, "city") || null, str(fd, "address") || null,
            hashPassword(password), sponsor?.id ?? null, leg, plan!.id, numv(fd, "product_id") || null, isCompany,
          ],
          c,
        );
        if (activation === "cash" || activation === "company") {
          let placement: { parentId: number | null; position: "L" | "R" | null } | undefined;
          if (parentCode === "TOP") placement = { parentId: null, position: null };
          else if (parentCode) {
            const p = await one("SELECT id FROM users WHERE upper(code) = $1", [parentCode], c);
            if (!p) fail("Placement parent ID not found.");
            placement = { parentId: p!.id, position: leg };
          }
          await activate(c, { userId: u!.id, method: activation === "company" ? "company" : "admin", actorId: admin.id, placement });
        }
        await audit(c, admin.id, "member.create", { code: newCode, activation, isCompany });
        return newCode;
      });
      return `Member ${code} created${activation !== "none" ? " and activated" : ""}.`;
    },
    () => `/admin/members/${code}`,
  );
}

export async function activateMemberAdminAction(fd: FormData) {
  const admin = await requireAdmin();
  const code = str(fd, "code");
  await handle(back(fd, `/admin/members/${code}`), async () => {
    const u = await one("SELECT id FROM users WHERE upper(code) = upper($1)", [code]);
    if (!u) fail("Member not found.");
    const planId = numv(fd, "plan_id");
    if (planId > 0) await q("UPDATE users SET plan_id = $2 WHERE id = $1 AND status = 'inactive'", [u!.id, planId]);
    const method = str(fd, "method");
    const r = await tx((c) =>
      method === "epin"
        ? activate(c, { userId: u!.id, method: "epin", epinCode: str(fd, "pin"), actorId: admin.id })
        : activate(c, { userId: u!.id, method: "admin", actorId: admin.id }),
    );
    return `${r.code} activated. Invoice ${r.invoiceNumber}.`;
  });
}

export async function updateMemberAction(fd: FormData) {
  const admin = await requireAdmin();
  const code = str(fd, "code");
  await handle(`/admin/members/${code}`, async () => {
    const u = await one("SELECT * FROM users WHERE code = $1", [code]);
    if (!u) fail("Member not found.");
    const phone = normPhone(str(fd, "phone"));
    const cnic = str(fd, "cnic") ? normCnic(str(fd, "cnic")) : null;
    if (!u!.is_company && !isPhone(phone)) fail("Enter a valid mobile number.");
    if (str(fd, "cnic") && !cnic) fail("CNIC must be 13 digits.");
    await q(
      `UPDATE users SET name=$2, phone=$3, cnic=$4, email=$5, city=$6, address=$7,
         distributor_override=$8, manager_override=$9, plan_id = CASE WHEN status='inactive' AND $10 > 0 THEN $10 ELSE plan_id END,
         payout_method=$11, payout_title=$12, payout_account=$13, payout_bank=$14
       WHERE id=$1`,
      [
        u!.id, str(fd, "name"), u!.is_company ? u!.phone : phone, cnic, str(fd, "email") || null, str(fd, "city") || null,
        str(fd, "address") || null, bool(fd, "distributor_override"), bool(fd, "manager_override"), numv(fd, "plan_id") || 0,
        str(fd, "payout_method") || null, str(fd, "payout_title") || null, str(fd, "payout_account") || null,
        str(fd, "payout_bank") || null,
      ],
    );
    await audit(pool(), admin.id, "member.update", { code });
    return "Member updated.";
  });
}

export async function memberStatusAction(fd: FormData) {
  const admin = await requireAdmin();
  const code = str(fd, "code");
  await handle(`/admin/members/${code}`, async () => {
    const u = await one("SELECT id, status, activated_at FROM users WHERE code = $1 AND role = 'member'", [code]);
    if (!u) fail("Member not found.");
    const block = str(fd, "do") === "block";
    const status = block ? "blocked" : u!.activated_at ? "active" : "inactive";
    await q("UPDATE users SET status = $2 WHERE id = $1", [u!.id, status]);
    if (block) await q("DELETE FROM sessions WHERE user_id = $1", [u!.id]);
    await audit(pool(), admin.id, block ? "member.block" : "member.unblock", { code });
    return block ? "Member blocked (pair income is flushed while blocked)." : "Member unblocked.";
  });
}

export async function resetPasswordAction(fd: FormData) {
  const admin = await requireAdmin();
  const code = str(fd, "code");
  await handle(`/admin/members/${code}`, async () => {
    const pw = String(fd.get("password") ?? "");
    if (pw.length < 8) fail("Password must be at least 8 characters.");
    const u = await one("UPDATE users SET password_hash = $2 WHERE code = $1 RETURNING id", [code, hashPassword(pw)]);
    if (!u) fail("Member not found.");
    await q("DELETE FROM sessions WHERE user_id = $1", [u!.id]);
    await audit(pool(), admin.id, "member.password_reset", { code });
    return "Password reset. Give the new password to the member.";
  });
}

export async function walletAdjustAction(fd: FormData) {
  const admin = await requireAdmin();
  const code = str(fd, "code");
  await handle(back(fd, `/admin/members/${code}`), async () => {
    const u = await one("SELECT id FROM users WHERE upper(code) = upper($1) AND role = 'member'", [code]);
    if (!u) fail("Member ID not found.");
    const wallet = str(fd, "wallet") === "epin" ? "epin" : "earning";
    const amount = money2(numv(fd, "amount"));
    const kind = str(fd, "kind"); // fund | adjust
    const reason = str(fd, "reason");
    if (!amount || !Number.isFinite(amount)) fail("Enter an amount (use minus for deduction).");
    if (kind !== "fund" && reason.length < 3) fail("Write a reason for the adjustment.");
    if (kind === "fund" && amount < 0) fail("Fund transfer must be positive.");
    await tx(async (c) => {
      await credit(
        c,
        u!.id,
        kind === "fund" ? "epin" : wallet,
        kind === "fund" ? "admin_fund" : "admin_adjust",
        amount,
        kind === "fund" ? `Fund transfer from company${reason ? ": " + reason : ""}` : `Admin: ${reason}`,
      );
      await audit(c, admin.id, kind === "fund" ? "wallet.fund" : "wallet.adjust", { code, wallet, amount, reason });
    });
    return kind === "fund" ? `Rs. ${amount} added to ${code}'s E-Pin wallet.` : "Wallet adjusted.";
  });
}

// ---------------------------------------------------------------- e-pins
export async function generatePinsAction(fd: FormData) {
  const admin = await requireAdmin();
  let batch = "";
  await handle(
    "/admin/epins",
    async () => {
      const ownerCode = str(fd, "owner");
      let ownerId: number | null = null;
      if (ownerCode) {
        const o = await one("SELECT id FROM users WHERE upper(code) = upper($1) AND role = 'member'", [ownerCode]);
        if (!o) fail("Owner ID not found.");
        ownerId = o!.id;
      }
      const r = await tx((c) =>
        generatePins(c, { planId: numv(fd, "plan_id"), count: Math.floor(numv(fd, "count")), ownerId, actorId: admin.id }),
      );
      batch = r.batch;
      return `${r.codes.length} E-Pins generated (batch ${r.batch}).`;
    },
    () => `/admin/epins?batch=${batch}`,
  );
}

export async function adminTransferPinAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle(back(fd, "/admin/epins"), async () => {
    const to = await tx((c) => transferPin(c, null, numv(fd, "id"), str(fd, "to"), admin.id));
    return `E-Pin assigned to ${to}.`;
  });
}

export async function revokePinAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle(back(fd, "/admin/epins"), async () => {
    const r = await one("UPDATE epins SET status = 'revoked' WHERE id = $1 AND status = 'unused' RETURNING code", [numv(fd, "id")]);
    if (!r) fail("Only unused E-Pins can be revoked.");
    await audit(pool(), admin.id, "epin.revoke", { pin: r!.code.slice(-4) });
    return "E-Pin revoked.";
  });
}

// ---------------------------------------------------------------- withdrawals
export async function withdrawalAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle(back(fd, "/admin/withdrawals"), async () => {
    const act = str(fd, "do") === "paid" ? "paid" : "rejected";
    await tx((c) => processWithdrawal(c, numv(fd, "id"), act, str(fd, "note"), admin.id));
    return act === "paid" ? "Marked as paid." : "Rejected and refunded to member.";
  });
}

export async function bulkPayAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle("/admin/withdrawals", async () => {
    const ids = fd.getAll("ids").map((x) => Number(x)).filter((x) => x > 0);
    if (!ids.length) fail("Select withdrawals first.");
    for (const id of ids) await tx((c) => processWithdrawal(c, id, "paid", "Bulk paid", admin.id));
    return `${ids.length} withdrawal(s) marked as paid.`;
  });
}

// ---------------------------------------------------------------- orders
export async function orderUpdateAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle(back(fd, "/admin/orders"), async () => {
    const id = numv(fd, "id");
    const status = str(fd, "status");
    if (!["pending", "dispatched", "delivered", "cancelled"].includes(status)) fail("Invalid status.");
    await tx(async (c) => {
      await q(`UPDATE orders SET status=$2, courier=$3, tracking_id=$4, updated_at=now() WHERE id=$1`, [
        id,
        status,
        str(fd, "courier") || null,
        str(fd, "tracking_id") || null,
      ], c);
      if (status === "delivered") await settleStoreOrder(c, id);
      await audit(c, admin.id, "order.update", { id, status });
    });
    return `Order #${id} updated.`;
  });
}

// ---------------------------------------------------------------- closing
export async function runClosingAction() {
  const admin = await requireAdmin();
  await handle("/admin/closings", async () => {
    const r = await runDueClosings(tx, admin.id);
    if (!r.length) return "Nothing to close. Today's pairs will close automatically at midnight.";
    return `Closed ${r.length} day(s): ${r.map((x) => `${x.day} (${x.pairsPaid} paid / ${x.pairsFlushed} flushed)`).join(", ")}.`;
  });
}

// ---------------------------------------------------------------- training & announcements
export async function saveTrainingAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle("/admin/training", async () => {
    const id = numv(fd, "id");
    const kind = str(fd, "kind") === "pdf" ? "pdf" : "video";
    const upload = await saveUpload(fd.get("file"), kind === "pdf" ? ["pdf"] : ["video"]);
    const url = upload || str(fd, "url");
    const title = str(fd, "title");
    if (!title || !url) fail("Title and a link or uploaded file are required.");
    const vals = [kind, title, str(fd, "description"), url, str(fd, "category") || "General", Math.floor(numv(fd, "sort") || 0), bool(fd, "active")];
    if (id > 0)
      await q(`UPDATE training SET kind=$1, title=$2, description=$3, url=$4, category=$5, sort=$6, active=$7 WHERE id=$8`, [...vals, id]);
    else await q(`INSERT INTO training (kind, title, description, url, category, sort, active) VALUES ($1,$2,$3,$4,$5,$6,$7)`, vals);
    await audit(pool(), admin.id, "training.save", { title });
    return "Training item saved.";
  });
}

export async function deleteTrainingAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle("/admin/training", async () => {
    await q("DELETE FROM training WHERE id = $1", [numv(fd, "id")]);
    await audit(pool(), admin.id, "training.delete", { id: numv(fd, "id") });
    return "Deleted.";
  });
}

export async function saveAnnouncementAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle("/admin/announcements", async () => {
    const id = numv(fd, "id");
    const title = str(fd, "title");
    if (!title) fail("Title is required.");
    if (id > 0) await q("UPDATE announcements SET title=$1, body=$2, active=$3 WHERE id=$4", [title, str(fd, "body"), bool(fd, "active"), id]);
    else await q("INSERT INTO announcements (title, body, active) VALUES ($1,$2,true)", [title, str(fd, "body")]);
    await audit(pool(), admin.id, "announcement.save", { title });
    return "Announcement saved.";
  });
}

export async function deleteAnnouncementAction(fd: FormData) {
  await requireAdmin();
  await handle("/admin/announcements", async () => {
    await q("DELETE FROM announcements WHERE id = $1", [numv(fd, "id")]);
    return "Deleted.";
  });
}

// ---------------------------------------------------------------- managers
export async function managerRunAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle("/admin/managers", async () => {
    const kind = str(fd, "kind") === "pool" ? "pool" : "salary";
    const r = await tx((c) => runManagerPayout(c, kind, str(fd, "month"), admin.id));
    return `${kind === "salary" ? "Salary" : "Pool share"} paid to ${r.recipients} manager(s): total ${r.total}.`;
  });
}

// ---------------------------------------------------------------- admins
export async function createAdminAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle("/admin/admins", async () => {
    const phone = normPhone(str(fd, "phone"));
    const pw = String(fd.get("password") ?? "");
    const name = str(fd, "name");
    if (!name || !isPhone(phone) || pw.length < 8) fail("Name, valid mobile and 8+ character password required.");
    if (await one("SELECT 1 FROM users WHERE phone = $1 AND role = 'admin'", [phone])) fail("An admin with this mobile exists.");
    const n = await one<{ n: number }>("SELECT count(*)::int + 1 AS n FROM users WHERE role = 'admin'");
    await q(
      `INSERT INTO users (code, name, phone, password_hash, role, status, is_company) VALUES ($1,$2,$3,$4,'admin','active',true)`,
      [`ADMIN${n!.n}`, name, phone, hashPassword(pw)],
    );
    await audit(pool(), admin.id, "admin.create", { name, phone });
    return "Admin created.";
  });
}

export async function adminPasswordAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle("/admin/admins", async () => {
    if (!verifyPassword(String(fd.get("current") ?? ""), admin.password_hash)) fail("Current password is wrong.");
    const pw = String(fd.get("password") ?? "");
    if (pw.length < 10) fail("Admin password must be at least 10 characters.");
    await q("UPDATE users SET password_hash = $2 WHERE id = $1", [admin.id, hashPassword(pw)]);
    await audit(pool(), admin.id, "admin.password", {});
    return "Password changed.";
  });
}

export async function removeAdminAction(fd: FormData) {
  const admin = await requireAdmin();
  await handle("/admin/admins", async () => {
    const id = numv(fd, "id");
    if (id === admin.id) fail("You cannot remove yourself.");
    await q("UPDATE users SET status = 'blocked' WHERE id = $1 AND role = 'admin'", [id]);
    await q("DELETE FROM sessions WHERE user_id = $1", [id]);
    await audit(pool(), admin.id, "admin.remove", { id });
    return "Admin access removed.";
  });
}
