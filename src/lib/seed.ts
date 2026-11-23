/** Default data: plans, ranks, products, training, admin + company top ID. Idempotent. */
import type { PoolClient } from "pg";
import { q, one } from "./db";
import { hashPassword } from "./password";
import { activate, nextMemberCode } from "./engine";

const base = {
  price: 900,
  direct_pair_bonus: 400,
  indirect_pair_bonus: 200,
  direct_referral_bonus: 0,
  daily_cap_pairs: 20,
  daily_cap_amount: 4000,
  monthly_salary: 0,
};

export const DEFAULT_PLANS = [
  {
    ...base,
    code: "networker",
    name: "Networker / Sales Consultant",
    sort: 1,
    is_distributor: false,
    is_manager: false,
    description: "Starter business package: 1 Handsfree or Watch + lifetime business account + training academy.",
  },
  {
    ...base,
    code: "distributor",
    name: "Distributor",
    sort: 2,
    is_distributor: true,
    is_manager: false,
    description: "Everything in Networker plus your own Brand & Product portal on the company store.",
  },
  {
    ...base,
    code: "manager",
    name: "Manager",
    sort: 3,
    is_distributor: true,
    is_manager: true,
    description: "Leadership package with fixed monthly salary and company turnover pool share.",
  },
];

export const DEFAULT_RANKS = [
  { level: 1, name: "Bronze", pairs_required: 25, reward_item: "Power Bank", reward_cash: 1000 },
  { level: 2, name: "Silver", pairs_required: 100, reward_item: "Smartwatch", reward_cash: 3000 },
  { level: 3, name: "Gold", pairs_required: 500, reward_item: "Android Mobile", reward_cash: 15000 },
  { level: 4, name: "Platinum", pairs_required: 2000, reward_item: "Laptop", reward_cash: 45000 },
  { level: 5, name: "Diamond", pairs_required: 5000, reward_item: "Honda CD 70 Bike", reward_cash: 120000 },
  { level: 6, name: "Crown", pairs_required: 15000, reward_item: "Umrah Package", reward_cash: 250000 },
  { level: 7, name: "Royal Ambassador", pairs_required: 50000, reward_item: "Alto Car (Downpayment)", reward_cash: 800000 },
];

export const DEFAULT_PRODUCTS = [
  {
    slug: "esn-pro-handsfree",
    name: "ESN Pro Wireless Handsfree",
    category: "Handsfree",
    price: 900,
    is_package: true,
    sort: 1,
    image_url: "/products/earbuds.webp",
    description: "True wireless earbuds with deep bass, clear calls and a pocket charging case.",
    specs:
      "Bluetooth 5.3\nUp to 20 hours with case\nTouch controls\nBuilt-in microphone for calls\nType-C fast charging\n7-day checking warranty",
  },
  {
    slug: "esn-smart-watch",
    name: "ESN Smart Watch Series",
    category: "Watches",
    price: 900,
    is_package: true,
    sort: 2,
    image_url: "/products/watch.webp",
    description: "Full-touch smart watch with fitness tracking, notifications and call alerts.",
    specs:
      "1.8 inch full-touch display\nHeart rate & step tracking\nWhatsApp / call notifications\nUp to 5 days battery\nSplash resistant\n7-day checking warranty",
  },
];

export const DEFAULT_TRAINING = [
  {
    kind: "video",
    title: "Welcome to ESN — How the business works",
    category: "Getting Started",
    url: "https://www.youtube.com/watch?v=REPLACE_ME",
    description: "Replace this link from Admin → Training.",
  },
  {
    kind: "pdf",
    title: "WhatsApp Status & Message Scripts",
    category: "Social Media",
    url: "https://example.com/replace-with-your-pdf.pdf",
    description: "Ready-to-send scripts. Put your own PDF link from Admin → Training.",
  },
];

export async function seedDefaults(
  c: PoolClient,
  opts: { adminPhone: string; adminPassword: string; withCompanyRoot: boolean },
) {
  for (const p of DEFAULT_PLANS) {
    await q(
      `INSERT INTO plans (code, name, description, price, direct_pair_bonus, indirect_pair_bonus, direct_referral_bonus,
         daily_cap_pairs, daily_cap_amount, monthly_salary, is_distributor, is_manager, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (code) DO NOTHING`,
      [
        p.code, p.name, p.description, p.price, p.direct_pair_bonus, p.indirect_pair_bonus, p.direct_referral_bonus,
        p.daily_cap_pairs, p.daily_cap_amount, p.monthly_salary, p.is_distributor, p.is_manager, p.sort,
      ],
      c,
    );
  }
  if (!(await one("SELECT 1 FROM ranks LIMIT 1", [], c))) {
    for (const r of DEFAULT_RANKS) {
      await q(`INSERT INTO ranks (level, name, pairs_required, reward_item, reward_cash) VALUES ($1,$2,$3,$4,$5)`, [
        r.level, r.name, r.pairs_required, r.reward_item, r.reward_cash,
      ], c);
    }
  }
  for (const p of DEFAULT_PRODUCTS) {
    await q(
      `INSERT INTO products (slug, name, category, description, specs, price, image_url, is_package, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (slug) DO NOTHING`,
      [p.slug, p.name, p.category, p.description, p.specs, p.price, p.image_url, p.is_package, p.sort],
      c,
    );
  }
  if (!(await one("SELECT 1 FROM training LIMIT 1", [], c))) {
    for (const t of DEFAULT_TRAINING) {
      await q(`INSERT INTO training (kind, title, category, url, description) VALUES ($1,$2,$3,$4,$5)`, [
        t.kind, t.title, t.category, t.url, t.description,
      ], c);
    }
    await q(`INSERT INTO announcements (title, body) VALUES ($1,$2)`, [
      "Welcome to Elite Sales Network",
      "Share your Left and Right referral links to build your team. Withdrawals are processed by the office.",
    ], c);
  }

  if (!(await one("SELECT id FROM users WHERE role = 'admin' LIMIT 1", [], c))) {
    await q(
      `INSERT INTO users (code, name, phone, password_hash, role, status, is_company)
       VALUES ('ADMIN','Super Admin',$1,$2,'admin','active',true)`,
      [opts.adminPhone, hashPassword(opts.adminPassword)],
      c,
    );
  }

  if (opts.withCompanyRoot) {
    const root = await one("SELECT id FROM users WHERE parent_id IS NULL AND role = 'member' AND status = 'active'", [], c);
    if (!root) {
      const plan = await one("SELECT id FROM plans WHERE code = 'networker'", [], c);
      const code = await nextMemberCode(c);
      const u = await one(
        `INSERT INTO users (code, name, phone, password_hash, is_company, plan_id)
         VALUES ($1,'ESN Company',$2,$3,true,$4) RETURNING id`,
        [code, "company-root", hashPassword(opts.adminPassword), plan!.id],
        c,
      );
      await activate(c, { userId: u!.id, method: "company", placement: { parentId: null, position: null } });
    }
  }
}
