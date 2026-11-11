# Zine — Salon Management

Offline-first salon management PWA for **Zine Beauty Parlour**. Everything — customers,
billing, appointments, bridal bookings, stock, payroll, reports — runs against IndexedDB on
one trusted device, with encrypted Google Drive / file backups for recovery.

> **The most important product risk is local data loss.** Backup, restore and data integrity
> are core features, not extras. Do not rely on this build until a restore has been tested on
> a separate browser profile.

---

## Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| UI | React 18 + Vite + Tailwind CSS |
| Icons | Lucide React |
| Routing | React Router 6 |
| State | Zustand (session, toasts) |
| Forms | React Hook Form + Zod (available) |
| Local database | IndexedDB via Dexie 4 |
| Charts | Recharts |
| PDF receipts | jsPDF |
| PWA | vite-plugin-pwa (Workbox) |
| Encryption | Web Crypto — PBKDF2 + AES-GCM |
| Tests | Vitest (unit + IndexedDB integration), Playwright (E2E) |
| Hosting | Cloudflare Pages |
| CI/CD | GitHub Actions |

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + production build
npm run preview      # serve dist
npm test             # unit + integration tests (fake-indexeddb)
npm run test:e2e     # Playwright smoke journeys (needs a prior build)
```

First run opens **Setup**: create the salon profile, owner credentials and (optionally) a
demo dataset so the dashboard is populated immediately.

Generate the PWA icons (already committed) with:

```bash
node scripts/generate-icons.mjs
```

---

## Architecture

```text
src/
├── app/                  routes, providers, navigation, boot guard
├── components/           design system (buttons, fields, tables, modals, toasts)
├── modules/              one folder per business domain
│   ├── auth/             setup, login, lock screen
│   ├── dashboard/        owner KPIs, period filter, comparisons, service/employee insights
│   ├── billing/          new bill, bills, payments, refunds, receipts
│   ├── calendar/         day/week/month/list, appointments, bridal, blocks
│   └── customers/ services/ offers/ inventory/ employees/ payroll/ finance/ settings/
├── db/
│   ├── database.ts       Dexie schema (27 stores)
│   ├── schema.ts         index definitions
│   ├── demoSeed.ts       optional sample salon data
│   └── repositories/     all reads/writes + atomic transactions
├── services/
│   ├── auth/             PBKDF2 password hashing, login
│   ├── backup/           snapshot, encryption, validation, restore
│   ├── google-drive/     GIS OAuth + app-data folder upload/download
│   ├── receipts/         jsPDF receipts + WhatsApp click-to-chat
│   └── exports/          CSV / JSON
├── hooks/ stores/ utils/ types/
└── styles/
```

**Rules enforced in code**

- Money is **integer paise** everywhere (`₹1,500 = 150000`). Conversion happens only at input
  and display boundaries.
- Bill creation writes bill + items + payments + stock movements + customer stats in **one Dexie
  transaction**. Any failure rolls everything back.
- Bills are never deleted. Cancellation preserves payments, reverses stock via ledger rows and
  requires a reason; refunds are separate transactions.
- Historical bills snapshot names and prices — editing a service or offer never changes old bills.
- Finalised payroll is immutable; later corrections must be adjustments.
- Stock is derived from an append-only movement ledger (`reconcileProductStock` repairs the cache).
- Sales, collections and refunds are reported separately (an advance is not extra revenue).

---

## Data & backups

- **Backup package**: `zine-backup-YYYY-MM-DD-HHmmss.zinebackup` — a JSON envelope with
  PBKDF2-SHA256 metadata (210,000 iterations, random 16-byte salt), AES-GCM-256 ciphertext and
  a fresh 12-byte IV.
- The passphrase is never persisted. Wrong passphrases and tampered files fail the GCM tag check.
- Restore validates the envelope, schema version, required tables and owner account, downloads a
  **safety backup** of the current data, then replaces every store in one transaction.
- Google Drive is optional and uses the `drive.appdata` scope (Zine's private folder). Tokens live
  in memory only; unattended backups after the browser closes are not possible.
- Persistent storage is requested via the Storage API; Settings → Business shows whether it was
  granted.

---

## Roles

- **Owner** — everything, including refunds, payroll, reports, settings and backups.
- **Employee** — billing, customers and appointments by default (the owner dashboard is owner-only).
  Navigation, routes and
  service-price editing are gated by the permissions the owner grants in Settings → Security;
  reports, payroll, refunds and settings stay owner-only until explicitly permitted.

Authentication is local (PBKDF2 in IndexedDB), not server-enforced. Use a trusted primary device;
add a backend in V2 if remote access or multi-device sync is required.

---

## Testing

- `tests/unit` — billing maths, split payments, status/balance, conflicts & leave, payroll,
  inventory ledger, offers.
- `tests/integration` — real Dexie + fake IndexedDB: atomic bill creation, split payments,
  cancellation & stock reversal, refunds, auth hashing/login, payroll lifecycle and encrypted
  backup → decrypt → restore.
- `tests/e2e` — Playwright, run against the production build:
  - `smoke.spec.ts` — first-run setup → seeded dashboard → add customer → bill + receipt PDF →
    encrypted backup download → session survives reload; sign-out and wrong-password rejection.
  - `routes.spec.ts` — visits every signed-in route (all 26 screens) plus the 404 page and asserts
    no uncaught runtime errors, then exercises week/month/list calendar views, payroll generation
    and report filters.
  - `permissions.spec.ts` — creates an employee login, verifies default restrictions (including
    no dashboard) and that a granted permission unlocks the matching navigation and route.
  - `dashboard.spec.ts` — verifies owner analytics: monthly default, daily/hourly switch, custom
    range, service/employee insight panels and period comparison.
  - `restore.spec.ts` — takes an encrypted backup on one browser profile and restores it (settings,
    customers and owner credentials included) onto a brand-new profile.

```bash
npm test
npm run build && npx playwright install chromium && npm run test:e2e
```

CI runs both layers: `.github/workflows/test.yml` executes lint → typecheck → unit/integration →
build, then a separate Playwright job against the built app and uploads traces on failure.

---

## Deployment

- Source: private GitHub repository (`main` production, `develop` integration, `feature/*`).
- CI (`.github/workflows/test.yml`): install → lint → typecheck → tests → build on every PR.
- **GitHub Pages** (`.github/workflows/deploy-pages.yml`): builds with the correct `VITE_BASE`
  sub-path, writes `dist/404.html` as the SPA fallback and deploys through GitHub Actions.
  Set **Settings → Pages → Source** to **GitHub Actions**.
- **Cloudflare Pages** (`.github/workflows/deploy.yml`) remains available and is the recommended
  host for a commercial deployment. Disable one of the two workflows so they do not both publish.
  Set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets and add the SPA fallback
  (`/* → /index.html`).

Build for a project sub-path locally with:

```bash
VITE_BASE=/zine/ npm run build   # https://<owner>.github.io/zine/
```

`BASE_URL` drives both the asset base and `BrowserRouter` basename, so refresh/deep links work.
For Google Drive, create a **Web application** OAuth client and add
`https://<owner>.github.io` (origin only, no path) plus `http://localhost:5173` as authorised
JavaScript origins. The app requests only `drive.appdata`.

**Before any schema migration**: take a backup, validate it, run the migration, verify record
counts. A frontend deploy never migrates IndexedDB automatically.

---

## V1 scope

Included: username/password auth, owner/employee roles, customers, services, billing with split
payments, PDF receipts, WhatsApp click-to-chat, calendar with conflict detection, bridal bookings,
salon/employee blocks, offers & combos, inventory ledger with low-stock alerts, employee leave,
payroll with commission & advances, income/expenses, reports with CSV export, offline PWA,
encrypted Google Drive backups and restore.

Not included: multi-device live sync, cloud database/API, WhatsApp Business API, customer booking
portal, attendance/biometrics, payment gateway, GST filing, multiple branches.

