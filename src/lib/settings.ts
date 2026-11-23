import { q, type Db } from "./db";

type FieldType = "text" | "number" | "bool" | "select" | "list" | "textarea";
export type SettingDef = {
  label: string;
  group: string;
  type: FieldType;
  help?: string;
  options?: { value: string; label: string }[];
};

/**
 * Every system-wide rule lives here with its default. Admin can change all of them
 * from Admin → Settings. Per-plan money values (price, pair bonuses, caps, salary)
 * live on the plans table; rank rewards live on the ranks table.
 */
export const DEFAULTS = {
  // Company / website
  site_name: "Elite Sales Network",
  site_short: "ESN",
  site_tagline: "Original Handsfree & Smart Watches — Delivered Across Pakistan",
  site_domain: "elitesalesnetwork.com",
  currency: "Rs.",
  support_phone: "+92 300 0000000",
  support_whatsapp: "+92 300 0000000",
  support_email: "support@elitesalesnetwork.com",
  office_address: "Head Office, Pakistan",
  hero_title: "Premium Handsfree & Smart Watches",
  hero_subtitle: "Buy original gadgets at one fair price and start your own sales business with ESN.",

  // Registration & placement
  allow_registration: true,
  require_sponsor: false,
  default_sponsor_code: "",
  spillover_mode: "extreme",
  unique_cnic: true,
  unique_phone: true,
  require_cnic: true,

  // Binary engine
  first_pair_requires_direct: true,
  pair_credit_mode: "closing",
  closing_timezone: "Asia/Karachi",
  carry_forward_days: 0,
  rank_mode: "fresh",
  normalization_enabled: false,
  normalization_percent: 50,

  // Wallets & withdrawals
  withdrawals_enabled: true,
  withdrawal_fee_percent: 5,
  withdrawal_min: 500,
  withdrawal_max: 0,
  withdrawal_methods: ["JazzCash", "EasyPaisa", "Bank Account"],
  unique_payout_account: true,
  allow_earning_to_epin: true,
  earning_to_epin_fee_percent: 0,
  allow_member_pin_transfer: true,

  // Distributor & Manager
  distributor_platform_fee_percent: 15,
  manager_pool_percent: 2,
};

export type Settings = typeof DEFAULTS;
export type SettingKey = keyof Settings;

export const SETTING_DEFS: Record<SettingKey, SettingDef> = {
  site_name: { label: "Website name", group: "Company & Website", type: "text" },
  site_short: { label: "Short name / logo text", group: "Company & Website", type: "text" },
  site_tagline: { label: "Tagline", group: "Company & Website", type: "text" },
  site_domain: { label: "Domain (used in referral links)", group: "Company & Website", type: "text" },
  currency: { label: "Currency symbol", group: "Company & Website", type: "text" },
  support_phone: { label: "Support phone", group: "Company & Website", type: "text" },
  support_whatsapp: { label: "WhatsApp number", group: "Company & Website", type: "text" },
  support_email: { label: "Support email", group: "Company & Website", type: "text" },
  office_address: { label: "Office address (shown on invoices)", group: "Company & Website", type: "textarea" },
  hero_title: { label: "Store hero title", group: "Company & Website", type: "text" },
  hero_subtitle: { label: "Store hero subtitle", group: "Company & Website", type: "textarea" },

  allow_registration: { label: "Allow public registration", group: "Registration & Placement", type: "bool" },
  require_sponsor: { label: "Sponsor ID required to register", group: "Registration & Placement", type: "bool" },
  default_sponsor_code: {
    label: "Default sponsor ID (when none given)",
    group: "Registration & Placement",
    type: "text",
    help: "Leave empty to use the company top ID.",
  },
  spillover_mode: {
    label: "Auto-spillover mode",
    group: "Registration & Placement",
    type: "select",
    options: [
      { value: "extreme", label: "Extreme — last empty spot at the outer edge of the chosen leg" },
      { value: "balanced", label: "Balanced — first empty spot level by level in the chosen leg" },
    ],
  },
  unique_cnic: { label: "One CNIC = one account", group: "Registration & Placement", type: "bool" },
  unique_phone: { label: "One mobile number = one account", group: "Registration & Placement", type: "bool" },
  require_cnic: { label: "CNIC required at registration", group: "Registration & Placement", type: "bool" },

  first_pair_requires_direct: {
    label: "First pair must be 1 Left + 1 Right own direct referrals",
    group: "Binary Commission Engine",
    type: "bool",
    help: "When on, spillover from upline cannot unlock the first (direct) pair.",
  },
  pair_credit_mode: {
    label: "When indirect pair income is credited",
    group: "Binary Commission Engine",
    type: "select",
    options: [
      { value: "closing", label: "At midnight closing (cap applied, extra pairs flushed)" },
      { value: "instant", label: "Instantly (cap checked live, extra pairs flushed)" },
    ],
  },
  closing_timezone: { label: "Closing timezone (midnight cut-off)", group: "Binary Commission Engine", type: "text" },
  carry_forward_days: {
    label: "Carry forward expiry (days)",
    group: "Binary Commission Engine",
    type: "number",
    help: "0 = carry forward never expires.",
  },
  rank_mode: {
    label: "Rank pair counting",
    group: "Binary Commission Engine",
    type: "select",
    options: [
      { value: "fresh", label: "Fresh pairs — each rank counts new pairs after the previous rank" },
      { value: "cumulative", label: "Cumulative — total matched pairs since joining" },
    ],
  },
  normalization_enabled: {
    label: "Payout normalization (budget lock)",
    group: "Binary Commission Engine",
    type: "bool",
    help: "If a day's binary payout is more than X% of that day's collection, pair values are scaled down.",
  },
  normalization_percent: { label: "Normalization budget % of daily collection", group: "Binary Commission Engine", type: "number" },

  withdrawals_enabled: { label: "Withdrawals open", group: "Wallets & Withdrawals", type: "bool" },
  withdrawal_fee_percent: { label: "Withdrawal admin/service fee %", group: "Wallets & Withdrawals", type: "number" },
  withdrawal_min: { label: "Minimum withdrawal", group: "Wallets & Withdrawals", type: "number" },
  withdrawal_max: { label: "Maximum per request (0 = no limit)", group: "Wallets & Withdrawals", type: "number" },
  withdrawal_methods: {
    label: "Payment methods (one per line)",
    group: "Wallets & Withdrawals",
    type: "list",
  },
  unique_payout_account: {
    label: "Block same JazzCash/EasyPaisa/IBAN on two accounts",
    group: "Wallets & Withdrawals",
    type: "bool",
  },
  allow_earning_to_epin: { label: "Members can move Earning → E-Pin wallet", group: "Wallets & Withdrawals", type: "bool" },
  earning_to_epin_fee_percent: { label: "Earning → E-Pin conversion fee %", group: "Wallets & Withdrawals", type: "number" },
  allow_member_pin_transfer: { label: "Members can transfer E-Pins to others", group: "Wallets & Withdrawals", type: "bool" },

  distributor_platform_fee_percent: {
    label: "Distributor product platform fee %",
    group: "Distributor & Manager",
    type: "number",
    help: "Company keeps this % of each distributor product sale.",
  },
  manager_pool_percent: {
    label: "Manager turnover pool % (of monthly collection)",
    group: "Distributor & Manager",
    type: "number",
  },
};

export async function getSettings(db?: Db): Promise<Settings> {
  const rows = await q<{ key: string; value: unknown }>("SELECT key, value FROM settings", [], db);
  const out = { ...DEFAULTS } as Record<string, unknown>;
  for (const r of rows) if (r.key in DEFAULTS) out[r.key] = r.value;
  return out as Settings;
}

export async function saveSetting(key: SettingKey, value: unknown, db?: Db) {
  await q(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)],
    db,
  );
}
