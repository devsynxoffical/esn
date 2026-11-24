# Elite Sales Network (ESN)

E-commerce store + binary network platform for **elitesalesnetwork.com**.

- **Store front**: Handsfree & Watch products, product pages, Buy & Join, distributor products (Cash on Delivery).
- **Member portal**: E-Pin activation, Left/Right referral links, binary tree, earning & E-Pin wallets, E-Pins, withdrawals
  (JazzCash / EasyPaisa / Bank), rank rewards (gift or cash), training academy, orders & invoices, Distributor and Manager portals.
- **Super admin panel**: finance dashboard, master settings, plans, ranks, products, members, company top IDs, E-Pins &
  fund transfer, withdrawals (CSV), orders & dispatch (labels), invoices, daily closing, company ledger, training,
  announcements, managers payroll, admins, audit log.

**Everything is editable from the admin panel**: package price (investment), direct & indirect pair bonus, direct
referral bonus, daily capping (pairs and amount), withdrawal fee %, minimum withdrawal, payment methods, rank targets
and rewards, spillover mode, credit mode, carry-forward expiry, payout normalization, anti-fraud locks, distributor fee
and manager pool %.

## Default plan (change any of it in Admin → Plans / Ranks / Master Settings)

| Rule | Default |
|---|---|
| Plans | Networker / Sales Consultant, Distributor, Manager |
| Package price | Rs. 900 (Handsfree or Watch) |
| First pair (direct pair) | Rs. 400: needs 1 Left + 1 Right **own direct** referrals (upline spillover does not unlock it) |
| Indirect pair | Rs. 200 per 1:1 match, unlimited depth, after the first pair |
| Carry forward | Unmatched members on the power leg stay and match later (never expires by default) |
| Daily capping | 20 pairs / Rs. 4,000 per day |
| Midnight closing | 12:00 AM Asia/Karachi: pays up to the cap, flushes the rest to the company ledger |
| Withdrawal | Min Rs. 500, 5% admin fee deducted automatically, admin sees the 95% to pay |
| Spillover | Extreme Left / Right (or "balanced" level-by-level) |
| Ranks (fresh pairs) | 25, 100, 500, 2,000, 5,000, 15,000, 50,000 pairs with gift-or-cash rewards |

The engine is checked by automated tests, including the 100-member reference tree from the project document
(49 direct + 170 indirect pairs = Rs. 53,600).

## Tech

Next.js 16 (App Router, server actions) · PostgreSQL 14+ · TypeScript · Tailwind CSS 4. No other services needed.

## Run locally

```bash
npm install
cp .env.example .env.local     # set DATABASE_URL, CRON_SECRET, ADMIN_PHONE, ADMIN_PASSWORD
npm run db:setup               # creates tables + default plans/ranks/products + admin + company top ID
npm run dev                    # http://localhost:3100
npm test                       # commission engine tests (uses TEST_DATABASE_URL, default .../esn_test)
```

Login at `/login` with `ADMIN_PHONE` / `ADMIN_PASSWORD` → you land on `/admin`. **Change the admin password** in
Admin → Admins & Password.

## Deploy on Vercel

1. **Database**: in your Vercel project open **Storage → Create / Connect Database → Neon (Postgres)** and connect it
   to the project. This adds `DATABASE_URL` automatically. (Any PostgreSQL works: paste its connection string with
   `?sslmode=require` as `DATABASE_URL`.)
2. **Environment variables** (Project → Settings → Environment Variables, for Production and Preview):
   - `ADMIN_PHONE`: your admin login mobile, e.g. `03001234567`
   - `ADMIN_PASSWORD`: a strong password (8+ characters)
   - `CRON_SECRET`: a long random string (Vercel Cron sends it automatically)
3. **Redeploy** (Deployments → ⋯ → Redeploy). On the first visit the app creates all tables, the default plans, ranks,
   products, the admin login and the company top ID by itself: no commands to run.
4. **Domain**: Project → Settings → Domains → add `elitesalesnetwork.com` and set the DNS records Vercel shows. SSL is
   automatic.
5. **Midnight closing** runs from `vercel.json` (Vercel Cron, 19:00 UTC = 12:00 AM Pakistan time). If a run is
   missed, the next dashboard visit closes the day automatically.
6. **Uploads**: Vercel has no permanent disk, so file uploads (product images, PDFs, logos) are disabled there: paste
   image / PDF / YouTube links instead. For uploads, host on a VPS (below).

## Deploy on a VPS (Ubuntu) for elitesalesnetwork.com

1. Install Node 20+, PostgreSQL, Nginx, Certbot.
2. Create the database and user, clone this repo, create `.env.local`:
   ```
   DATABASE_URL=postgres://esn:STRONG_PASSWORD@localhost:5432/esn
   CRON_SECRET=a-long-random-string
   ADMIN_PHONE=03XXXXXXXXX
   ADMIN_PASSWORD=a-strong-password
   UPLOAD_DIR=/var/esn/uploads
   ```
3. `npm ci && npm run db:setup && npm run build`
4. Run with a process manager: `pm2 start "npm start -- -p 3000" --name esn`
5. Nginx reverse proxy `elitesalesnetwork.com` → `127.0.0.1:3000` (set `client_max_body_size 50m;`), then
   `certbot --nginx -d elitesalesnetwork.com -d www.elitesalesnetwork.com` for SSL.
6. **Midnight closing cron** (server time zone independent; the app uses Asia/Karachi):
   ```
   CRON_TZ=Asia/Karachi
   0 0 * * * cd /path/to/esn && npm run closing >> /var/log/esn-closing.log 2>&1
   ```
   or call `GET https://elitesalesnetwork.com/api/cron/closing` with header `Authorization: Bearer <CRON_SECRET>`.
   As a backup, any missed day is closed automatically the next time an admin or member opens their dashboard.
7. Daily database backup, e.g. `0 3 * * * pg_dump esn | gzip > /backups/esn-$(date +\%F).sql.gz` and copy off-site.

## How money flows

1. Member registers (inactive) → pays at office → admin gives a 16-digit **E-Pin** (Admin → E-Pins) or activates the
   ID with cash (Admin → Members) or transfers **funds** to an E-Pin wallet.
2. Activation places the member in the tree (spillover), creates the **invoice** and the **dispatch order**, and runs
   the commission engine for every upline.
3. Direct pair is paid instantly; indirect pairs collect during the day and are paid at the midnight closing up to the
   daily cap (extra pairs are flushed to the company ledger).
4. Member requests a withdrawal → amount is locked → admin marks **Paid** (fee goes to company ledger) or **Rejects**
   (amount refunded).

## Project layout

```
src/lib/schema.ts        database schema (applied automatically on startup)
src/lib/engine.ts        placement, pair matching, capping, closing, ranks
src/lib/ops.ts           E-Pins, wallets, withdrawals, rewards, distributor orders, manager payroll
src/lib/settings.ts      every editable system rule + defaults
src/app/(store)          public store, register, login
src/app/dashboard        member portal
src/app/admin            super admin panel
tests/engine.test.mts    commission engine tests
```

## Before launch

- Have the compensation plan reviewed for legal compliance in Pakistan (e.g. SECP / Competition Commission rules on
  direct selling) and publish your final terms on `/terms` (edit `src/app/(store)/terms/page.tsx`).
- Replace the sample training links and product images in the admin panel.
