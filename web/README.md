# Qalandari Autos & Spare Parts — Online Store

A motorcycle spare-parts storefront for **Qalandari Autos & Spare Parts**: browse parts by
category or bike model, check compatibility, add to cart, and place a cash-on-delivery order —
plus an admin dashboard for managing products, orders, customers and categories.

Built as a frontend application with a clean data layer, so a real backend (Supabase, Firebase or
a custom API) can be connected without rewriting the UI.

---

## Running it

```bash
cd web
npm install
npm run dev      # development server (http://localhost:5173)
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build (http://localhost:4173)
npm run lint     # TypeScript check only

npm run fetch-images   # download the product photos for self-hosting
npm run build:single   # one self-contained HTML file (see below)
```

Node 18+ is required.

### Deploying

`npm run build` writes a static site to `web/dist/` that any static host serves.
Clean URLs need unknown paths rewritten to `index.html`; `public/_redirects` handles
that on Netlify, and the `netlify.toml` at the repository root sets `base = "web"`
for a git-connected deploy. On a host with no rewrite support, build with
`VITE_ROUTER=hash` so routes become `/#/shop`.

### One-file preview

```bash
npm run build:single   # dist-single/qalandari-autos.html
```

Bundles the whole storefront — JavaScript, CSS and every product illustration as a
data URI — into a single HTML file that opens straight from disk. Useful for sending
someone a preview; it uses the hash router and is not what you deploy.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 (design tokens in `src/index.css`) |
| Routing | React Router (route-level code splitting) |
| Icons | lucide-react |
| State | React context (`src/store`), persisted to `localStorage` |

---

## Business configuration — edit these first

Everything the business owns lives in **one file**: [`src/config/site.ts`](src/config/site.ts).

```ts
export const WHATSAPP_NUMBER = '923000000000'; // digits only, international format
```

That file also holds the phone number, email, shop address, business hours, map location, social
links, delivery fee, free-delivery threshold and the low-stock threshold. Every value marked
`// PLACEHOLDER` must be replaced with the real business detail before launch — nothing else in the
codebase hardcodes contact information.

Other editable content:

| What | Where |
|---|---|
| Products (54 seeded) | `src/data/products.ts` |
| Categories | `src/data/categories.ts` |
| Motorcycle models | `src/data/bikes.ts` |
| Policy pages | `src/data/policies.ts` |
| Customer feedback (placeholder) | `src/data/testimonials.ts` |
| Demo orders for the dashboard | `src/data/demoOrders.ts` |

## Pages

**Storefront** — Home, Shop (`/shop`), Product detail (`/shop/:slug`), Categories, Category
(`/category/:slug`), Parts by bike (`/bike/:slug`), Cart, Checkout, Order confirmation
(`/order-confirmation/:orderNumber`), Track Order, About, Contact, and four policy pages.

**Admin** (`/admin`) — sign-in, Dashboard, Products (list, add, edit, delete, stock and featured
toggles), Orders (filter, open, change status), Customers (derived from order history), Categories.

## How it works

- **Catalogue** (`src/store/CatalogContext.tsx`) — seeded from `src/data`, persisted to
  `localStorage`; admin edits go through `createProduct` / `updateProduct` / `deleteProduct`.
- **Cart** (`src/store/CartContext.tsx`) — persists across refreshes, recalculates totals and the
  delivery fee from `siteConfig`.
- **Orders** (`src/store/OrdersContext.tsx`) — seeded with clearly marked demo orders; `placeOrder`
  generates the next `QAS-1000x` number and recalculates the totals rather than trusting the cart.
- **Search & filters** (`src/lib/catalog.ts`) — one scoring function drives header suggestions and
  the shop page. It matches product name, SKU, category, description and compatible bikes, so
  "CD 70", "brake shoe" and "QAS-BRK-001" all work. Shop filters live in the URL, so any filtered
  result set can be shared or bookmarked.
- **WhatsApp** (`src/lib/whatsapp.ts`) — every WhatsApp button is built from `WHATSAPP_NUMBER`.
  Product buttons prefill: *"Hello Qalandari Autos & Spare Parts, I am interested in [product].
  Price: PKR [price]. Is this product available?"*
- **SEO** (`src/lib/seo.ts`) — per-page title, meta description, canonical URL, Open Graph tags and
  JSON-LD (`Product` on product pages, `Store` / `LocalBusiness` on home and contact). Admin and
  cart pages are marked `noindex`.

## Product images

The catalogue uses royalty-free photographs from [Pexels](https://www.pexels.com/license/),
whose licence allows free commercial use with no attribution required. Every photo is
listed in [`src/data/photos.ts`](src/data/photos.ts) with the page it came from, and is
served from the Pexels CDN with sizing parameters.

Two things follow from that:

- **Self-host before launch.** `npm run fetch-images` downloads every photo into
  `public/products/photos/`; then set `SELF_HOSTED = true` in `src/data/photos.ts` and the
  shop serves its own images instead of depending on a third-party CDN.
- **Nothing renders broken.** Each product, category and bike also carries a local SVG
  illustration in `fallbackImage`. The `ProductImage` component shows the photograph and
  falls back to the illustration if it cannot be fetched — offline, CDN blocked, or a bad
  URL — so an image slot is never empty.

Free stock photography covers some parts exactly (spark plugs, filters, chain and sprocket,
battery, brake disc, fork, mirror, headlight, speedometer) and others only at category level
(a workshop bench or wiring loom standing in for a CDI unit or rectifier). Replacing any of
them with a real product photograph is a one-line change: set the product's `photo` to a new
entry in `photos.ts`, or paste a URL into the Photo URL field in the admin product form.

## Admin access

Admin authentication is a **prototype**. Credentials come from build-time environment variables:

```bash
cp .env.example .env.local
# VITE_ADMIN_EMAIL=...
# VITE_ADMIN_PASSWORD=...
```

With no values set, a demo sign-in is active (`admin@qalandariautos.pk` / `qalandari-demo`) and the
dashboard shows a banner saying so. A browser bundle cannot keep a secret — before this store
handles live orders, replace the check in `src/store/AdminAuthContext.tsx` with a real server-side
session. The rest of the admin UI reads only from that context, so nothing else has to change.

## Connecting a backend

The data layer is deliberately isolated. To move to Supabase/PostgreSQL:

1. Create the tables `products`, `categories`, `product_compatibility`, `customers`, `orders`,
   `order_items`, `admin_users` — the TypeScript types in `src/types/index.ts` mirror them.
2. Replace the seed + `localStorage` bodies of the three context providers with API calls, keeping
   their exported interfaces.
3. Move order-total calculation server-side: **never trust prices sent from the browser** — the
   server should look up each product ID, validate the quantity against stock, and compute the total.
4. Swap `AdminAuthContext` for Supabase Auth and put row-level security on the admin tables.
5. Keep secrets in environment variables; none are needed by the frontend today.

Order notifications (WhatsApp / email / SMS) are not wired up. `placeOrder` is the single point
where an order is created, so a notification call belongs there once a backend exists.

## Accessibility & performance notes

- Semantic landmarks, skip-to-content link, labelled form fields with inline error messages tied via
  `aria-describedby`, visible focus rings, keyboard-navigable search suggestions, Escape-to-close on
  the dialog, mobile menu and filter sheet.
- Stock status never relies on colour alone — each state has an icon and a written label.
- `prefers-reduced-motion` is respected.
- Routes are code-split, images lazy-load with explicit dimensions, and skeleton loaders stand in
  for product grids, product detail, tables and dashboard stats.
