# Brandsloop — Inventory Management

Inventory, purchasing, sales and reporting for a clothing and fashion retail
business. Stock is tracked per **variant** (size / colour / style) and per
**location**, and every quantity change is recorded as a traceable stock
movement.

```
React + TypeScript + Tailwind (client)  ─→  Express + TypeScript (API)  ─→  PostgreSQL (Prisma)
```

---

## Run it locally

### Option A — Docker (nothing else to install)

```bash
cd brandsloop
docker compose up --build
```

Open **http://localhost:4000**. Postgres, migrations and the app all come up
together. Seed the demo catalogue once the containers are running:

```bash
docker compose exec app npx tsx server/prisma/seed.ts
```

### Option B — Node + your own Postgres

Requires Node 20+ and PostgreSQL 14+.

```bash
cd brandsloop
createdb brandsloop            # or use an existing database
./setup.sh                     # installs, migrates, seeds, writes server/.env
npm run dev                    # API on :4000, UI on :5173
```

Open **http://localhost:5173**.

For a production-style single server (API serves the built UI):

```bash
npm run build && npm start     # http://localhost:4000
```

### Signing in

`setup.sh` runs the seed, which prints the admin credentials once:

```
──────────────────────────────────────────────
  Brandsloop admin account created
  Email:    admin@brandsloop.pk
  Password: <generated, or your SEED_ADMIN_PASSWORD>
──────────────────────────────────────────────
```

No production password is hard-coded anywhere. Set `SEED_ADMIN_PASSWORD` in
`server/.env` to choose your own; leave it blank and a strong random one is
generated and printed a single time.

The demo data also creates a manager and a staff account so the roles can be
tried out — the seed prints those too.

---

## What it does

**Catalogue** — Products with variants for size, colour, style, material and
fit. Each variant carries its own SKU, barcode, cost price, selling price,
minimum stock and reorder level. SKUs generate automatically in retail form
(`TSH-BLK-M-001`, `JNS-BLU-32-001`, `CAP-BLK-001`) from a configurable format,
or you can type your own. Barcodes are generated as valid EAN-13 codes.

**Inventory** — Stock per variant per location, with available, reserved and
damaged quantities, live stock status (in stock / low / out / overstock), and
filtering by location, category, supplier, size, colour and status.

**Stock movements** — Purchases, sales, customer and supplier returns,
adjustments, transfers, damage, loss, opening stock and stock counts. Every one
records the previous quantity, the new quantity, the reference document, the
user and the time.

**Purchasing** — Purchase orders with partial receiving. Receiving adds stock
and updates the variant's cost price. Cancelling reverses whatever was received
rather than deleting the document.

**Selling** — Sales deduct stock the moment they complete, and cannot exceed
what is available. The cost price is frozen onto each line at the time of sale,
so a later price change never rewrites historical profit.

**Returns** — Customer returns come back into stock when resellable; damaged
ones are recorded as damaged and deliberately kept out of sellable inventory.
Supplier returns take stock out.

**Stock counts** — Print a count sheet, enter physical quantities, review the
differences, then finalise. Nothing moves until you finalise, and finalising
writes one movement per difference.

**Transfers** — Move stock between locations. Each transfer writes a pair of
movements: out of the source and into the destination.

**Reports** — Inventory valuation, stock movements, purchases, sales, profit
and margin, low stock, out of stock, damaged stock, suppliers, categories and
product performance. Every report exports to CSV honouring the filters on
screen.

**Dashboard** — Stock units, inventory value, low/out of stock counts, today's
sales and purchases, estimated profit, sales and purchase trends, top sellers,
inventory by category, restocking list and recent activity, over a selectable
date range.

**Operations** — Global search (⌘K / Ctrl-K) across products, SKUs, barcodes,
suppliers, customers and document numbers; a barcode scan/lookup page; low-stock
notifications; and an audit log of every significant action.

---

## Roles

Permissions are enforced on the **server**, on every request. The interface
hides what a role cannot use, but that is a convenience, not the control.

| | Admin | Manager | Staff |
|---|---|---|---|
| Dashboard, products, inventory, search | ✅ | ✅ | ✅ |
| Record sales, receive stock, returns | ✅ | ✅ | ✅ |
| Create / edit products, categories, suppliers | ✅ | ✅ | — |
| Delete products, adjust stock, transfers | ✅ | ✅ | — |
| Cancel sales and purchases | ✅ | ✅ | — |
| Profit and other financial reports | ✅ | ✅ | — |
| Manage users, settings, audit log | ✅ | — | — |

Deactivating a user revokes access immediately — sessions are checked against
the live account on every request, not just at sign-in.

---

## Inventory rules

These are enforced in the database layer, not just the UI:

1. Stock can never go negative through a sale, transfer or supplier return.
2. No quantity changes without a matching `StockMovement` row.
3. Receiving a purchase increases stock; completing a sale decreases it.
4. Resellable customer returns increase stock; damaged ones do not.
5. Supplier returns decrease stock.
6. Transfers decrease the source and increase the destination.
7. Adjustments require a reason.
8. Sales, purchases and stock counts are cancelled or reversed, never deleted,
   so financial history stays auditable.
9. SKUs are unique across products and variants; barcodes are unique where set.
10. Concurrent sales of the same variant are serialised with a row lock, so two
    simultaneous checkouts cannot both pass the stock check.

---

## Project layout

```
brandsloop/
├── server/
│   ├── prisma/
│   │   ├── schema.prisma        all models, indexes and relations
│   │   ├── seed.ts              admin account, locations, categories, brands
│   │   └── seed-demo.ts         demo catalogue built through the real stock engine
│   ├── src/
│   │   ├── app.ts               Express app, also serves the built client
│   │   ├── auth/                password hashing, session tokens
│   │   ├── middleware/          authentication, permissions, error mapping
│   │   ├── lib/                 validation, money maths, CSV, permissions matrix
│   │   ├── services/            stock engine, SKU/barcode, audit, notifications
│   │   └── routes/              one module per resource
│   └── tests/                   Vitest suites against a real Postgres database
└── client/
    └── src/
        ├── components/ui/       button, card, dialog, table, toast, …
        ├── components/layout/   sidebar, topbar, global search, notifications
        ├── components/shared/   page header, stat card, badges, search box
        ├── features/            variant picker used by every stock form
        ├── hooks/               auth, settings, URL-backed table state
        └── pages/               one file per screen
```

Business logic lives in `server/src/services`, not in components. The client
only renders and validates for feedback; the API re-validates everything.

---

## Tests

```bash
npm test
```

51 tests run against a scratch database (`TEST_DATABASE_URL`), covering the
stock engine, SKU generation and duplicate prevention, purchase receiving and
partial receipts, sale stock deduction and insufficient-stock rejection,
customer and damaged returns, supplier returns, transfers, adjustments, stock
counts, inventory valuation, profit calculation, CSV export and role
permissions.

---

## Configuration

Copy `server/.env.example` to `server/.env` (or let `setup.sh` do it).

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `TEST_DATABASE_URL` | Scratch database used by `npm test` — wiped between runs |
| `JWT_SECRET` | Signs session cookies. Must be a long random value; production refuses to boot with a default or short one |
| `SESSION_HOURS` | Session lifetime |
| `PORT`, `CORS_ORIGINS`, `COOKIE_SECURE` | Server and browser settings |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | First-run admin account |
| `SEED_DEMO_DATA` | Set to `false` to seed only the admin account and reference data |

Secrets stay server-side. Nothing in the client bundle touches the database.

---

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | API with reload on :4000, Vite UI on :5173 |
| `npm run build` | Type-check and build both the server and the client |
| `npm start` | Run the built server, serving the built UI on :4000 |
| `npm test` | Run the test suite |
| `npm run typecheck` | Type-check server and client |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:seed` | Seed the admin account and demo data |
| `npm run db:reset` | Drop, re-migrate and re-seed |
