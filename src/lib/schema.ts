// Database schema (idempotent). Applied automatically on startup and by `npm run db:migrate`.
export const SCHEMA_SQL = `
-- ESN (Elite Sales Network) database schema. Idempotent: safe to run many times.

CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The 3 plan models (Networker / Distributor / Manager). Every money value is editable.
CREATE TABLE IF NOT EXISTS plans (
  id                    SERIAL PRIMARY KEY,
  code                  TEXT UNIQUE NOT NULL,
  name                  TEXT NOT NULL,
  description           TEXT NOT NULL DEFAULT '',
  price                 NUMERIC(14,2) NOT NULL DEFAULT 0,
  direct_pair_bonus     NUMERIC(14,2) NOT NULL DEFAULT 0,
  indirect_pair_bonus   NUMERIC(14,2) NOT NULL DEFAULT 0,
  direct_referral_bonus NUMERIC(14,2) NOT NULL DEFAULT 0,
  daily_cap_pairs       INT NOT NULL DEFAULT 0,          -- 0 = no pair cap
  daily_cap_amount      NUMERIC(14,2) NOT NULL DEFAULT 0, -- 0 = no amount cap
  monthly_salary        NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_distributor        BOOLEAN NOT NULL DEFAULT false,
  is_manager            BOOLEAN NOT NULL DEFAULT false,
  public                BOOLEAN NOT NULL DEFAULT true,   -- selectable at registration
  active                BOOLEAN NOT NULL DEFAULT true,
  sort                  INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ranks (
  id               SERIAL PRIMARY KEY,
  level            INT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  pairs_required   INT NOT NULL,
  reward_item      TEXT NOT NULL DEFAULT '',
  reward_cash      NUMERIC(14,2) NOT NULL DEFAULT 0,
  daily_cap_pairs  INT,              -- optional override of plan daily cap once this rank is reached
  daily_cap_amount NUMERIC(14,2),    -- optional override
  unlocks_distributor BOOLEAN NOT NULL DEFAULT false,
  unlocks_manager     BOOLEAN NOT NULL DEFAULT false,
  active           BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS users (
  id                SERIAL PRIMARY KEY,
  code              TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  phone             TEXT NOT NULL,
  email             TEXT,
  cnic              TEXT,
  city              TEXT,
  address           TEXT,
  password_hash     TEXT NOT NULL,
  role              TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
  status            TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive','active','blocked')),
  is_company        BOOLEAN NOT NULL DEFAULT false,
  plan_id           INT REFERENCES plans(id),
  product_id        INT,
  sponsor_id        INT REFERENCES users(id),
  preferred_leg     CHAR(1) CHECK (preferred_leg IN ('L','R')),
  parent_id         INT REFERENCES users(id),
  position          CHAR(1) CHECK (position IN ('L','R')),
  depth             INT,
  activated_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- binary counters (active members only)
  left_count        INT NOT NULL DEFAULT 0,
  right_count       INT NOT NULL DEFAULT 0,
  left_carry        INT NOT NULL DEFAULT 0,
  right_carry       INT NOT NULL DEFAULT 0,
  carry_updated_at  TIMESTAMPTZ,
  direct_left       INT NOT NULL DEFAULT 0,
  direct_right      INT NOT NULL DEFAULT 0,
  first_pair_done   BOOLEAN NOT NULL DEFAULT false,
  total_pairs       INT NOT NULL DEFAULT 0,
  rank_level        INT NOT NULL DEFAULT 0,
  rank_base_pairs   INT NOT NULL DEFAULT 0,
  -- wallets
  earning_balance   NUMERIC(14,2) NOT NULL DEFAULT 0,
  epin_balance      NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_earned      NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- payout account (saved for withdrawals)
  payout_method     TEXT,
  payout_title      TEXT,
  payout_account    TEXT,
  payout_bank       TEXT,
  -- portals
  distributor_override BOOLEAN NOT NULL DEFAULT false,
  manager_override     BOOLEAN NOT NULL DEFAULT false,
  brand_name        TEXT,
  brand_logo_url    TEXT,
  brand_description TEXT,
  CONSTRAINT users_slot_unique UNIQUE (parent_id, position)
);
CREATE INDEX IF NOT EXISTS users_sponsor_idx ON users(sponsor_id);
CREATE INDEX IF NOT EXISTS users_parent_idx ON users(parent_id);
CREATE INDEX IF NOT EXISTS users_phone_idx ON users(phone);
CREATE INDEX IF NOT EXISTS users_cnic_idx ON users(cnic);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id          BIGSERIAL PRIMARY KEY,
  identifier  TEXT NOT NULL,
  ip          TEXT,
  success     BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_idx ON login_attempts(identifier, created_at);

CREATE TABLE IF NOT EXISTS products (
  id           SERIAL PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'General',
  description  TEXT NOT NULL DEFAULT '',
  specs        TEXT NOT NULL DEFAULT '',      -- one spec per line
  price        NUMERIC(14,2) NOT NULL DEFAULT 0,
  image_url    TEXT NOT NULL DEFAULT '',
  is_package   BOOLEAN NOT NULL DEFAULT false, -- selectable as the joining product
  vendor_id    INT REFERENCES users(id),       -- distributor products
  status       TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  admin_note   TEXT,
  active       BOOLEAN NOT NULL DEFAULT true,
  sort         INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS epins (
  id          SERIAL PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,
  plan_id     INT NOT NULL REFERENCES plans(id),
  status      TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused','used','revoked')),
  source      TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin','wallet')),
  batch       TEXT,
  owner_id    INT REFERENCES users(id),
  created_by  INT REFERENCES users(id),
  used_by     INT REFERENCES users(id),
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS epins_owner_idx ON epins(owner_id, status);

CREATE TABLE IF NOT EXISTS activations (
  id           SERIAL PRIMARY KEY,
  user_id      INT UNIQUE NOT NULL REFERENCES users(id),
  plan_id      INT NOT NULL REFERENCES plans(id),
  method       TEXT NOT NULL CHECK (method IN ('epin','wallet','admin','company')),
  epin_id      INT REFERENCES epins(id),
  activated_by INT REFERENCES users(id),
  amount       NUMERIC(14,2) NOT NULL,
  cash_in      BOOLEAN NOT NULL DEFAULT true, -- true when this activation represents new cash to the company
  day          DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id            SERIAL PRIMARY KEY,
  number        TEXT UNIQUE NOT NULL,
  user_id       INT NOT NULL REFERENCES users(id),
  activation_id INT REFERENCES activations(id),
  order_id      INT,
  product_name  TEXT NOT NULL,
  plan_name     TEXT NOT NULL,
  amount        NUMERIC(14,2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id             SERIAL PRIMARY KEY,
  kind           TEXT NOT NULL CHECK (kind IN ('package','store')),
  user_id        INT REFERENCES users(id),
  product_id     INT REFERENCES products(id),
  product_name   TEXT NOT NULL,
  vendor_id      INT REFERENCES users(id),
  qty            INT NOT NULL DEFAULT 1,
  amount         NUMERIC(14,2) NOT NULL DEFAULT 0,
  customer_name  TEXT,
  phone          TEXT,
  address        TEXT,
  city           TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','dispatched','delivered','cancelled')),
  courier        TEXT,
  tracking_id    TEXT,
  vendor_profit  NUMERIC(14,2) NOT NULL DEFAULT 0,
  platform_fee   NUMERIC(14,2) NOT NULL DEFAULT 0,
  settled        BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wallet ledger: every balance change is one row.
CREATE TABLE IF NOT EXISTS transactions (
  id            BIGSERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id),
  wallet        TEXT NOT NULL CHECK (wallet IN ('earning','epin')),
  type          TEXT NOT NULL,
  amount        NUMERIC(14,2) NOT NULL,
  balance_after NUMERIC(14,2) NOT NULL,
  note          TEXT,
  ref_type      TEXT,
  ref_id        BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS transactions_user_idx ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_type_idx ON transactions(type);

CREATE TABLE IF NOT EXISTS pairs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id),
  day         DATE NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('direct','indirect')),
  amount      NUMERIC(14,2) NOT NULL,     -- value at creation
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status      TEXT NOT NULL CHECK (status IN ('pending','paid','flushed')),
  closing_id  INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pairs_user_day_idx ON pairs(user_id, day);
CREATE INDEX IF NOT EXISTS pairs_status_idx ON pairs(status, day);

CREATE TABLE IF NOT EXISTS closings (
  id                   SERIAL PRIMARY KEY,
  day                  DATE UNIQUE NOT NULL,
  users_paid           INT NOT NULL DEFAULT 0,
  pairs_paid           INT NOT NULL DEFAULT 0,
  pairs_flushed        INT NOT NULL DEFAULT 0,
  amount_paid          NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_flushed       NUMERIC(14,2) NOT NULL DEFAULT 0,
  normalization_factor NUMERIC(8,6) NOT NULL DEFAULT 1,
  carry_expired        INT NOT NULL DEFAULT 0,
  run_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Company-side ledger: flush-out profit, withdrawal fees, platform fees, expired carry.
CREATE TABLE IF NOT EXISTS company_ledger (
  id          BIGSERIAL PRIMARY KEY,
  kind        TEXT NOT NULL,
  amount      NUMERIC(14,2) NOT NULL,
  user_id     INT REFERENCES users(id),
  note        TEXT,
  ref_id      BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS company_ledger_kind_idx ON company_ledger(kind);

CREATE TABLE IF NOT EXISTS withdrawals (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(id),
  amount          NUMERIC(14,2) NOT NULL,
  fee_percent     NUMERIC(6,2) NOT NULL,
  fee             NUMERIC(14,2) NOT NULL,
  net             NUMERIC(14,2) NOT NULL,
  method          TEXT NOT NULL,
  account_title   TEXT NOT NULL,
  account_number  TEXT NOT NULL,
  bank_name       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected')),
  admin_note      TEXT,
  processed_by    INT REFERENCES users(id),
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS withdrawals_status_idx ON withdrawals(status);
CREATE INDEX IF NOT EXISTS withdrawals_account_idx ON withdrawals(account_number);

CREATE TABLE IF NOT EXISTS rank_achievements (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id),
  rank_level  INT NOT NULL,
  rank_name   TEXT NOT NULL,
  reward_item TEXT NOT NULL DEFAULT '',
  reward_cash NUMERIC(14,2) NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'choose' CHECK (status IN ('choose','cash_paid','gift_pending','gift_delivered')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, rank_level)
);

CREATE TABLE IF NOT EXISTS training (
  id          SERIAL PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('pdf','video')),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url         TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'General',
  sort        INT NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS manager_runs (
  id          SERIAL PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('salary','pool')),
  month       TEXT NOT NULL,
  recipients  INT NOT NULL,
  total       NUMERIC(14,2) NOT NULL,
  created_by  INT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kind, month)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    INT REFERENCES users(id),
  action      TEXT NOT NULL,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS member_code_seq START 10001;
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;
`;
