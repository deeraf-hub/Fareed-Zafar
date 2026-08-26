# Swabi Jewellers — Luxury Imitation Jewellery Storefront

A complete, production-shaped e-commerce front end for **Swabi Jewellers**, Karachi — built with
React, TypeScript, Tailwind CSS and Vite.

It is not a static landing page: the shop, filters, search, cart, wishlist, checkout and customer
account all work end to end against a demo catalogue, and every piece of business data lives in
plain data modules that a backend or admin dashboard can replace.

```
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

---

## The brand

| | |
|---|---|
| Business | Swabi Jewellers — imitation / artificial jewellery |
| Address | KS 7144, Last Mason Road, Bhutta Village, Karachi West, Keamari Town |
| Phone | 0333-2363722 |
| Price band | Rs. 500 – Rs. 7,000 |
| Catalogue | 38 demo products across 8 categories and 8 collections |

All pieces are described as imitation jewellery — gold-, silver- and rhodium-plated brass and alloy,
set with American diamond (AD) stones, zircon, kundan-style stones, meenakari enamel and shell
pearls. No copy anywhere on the site claims solid gold, real diamonds or precious stones.

Everything an owner is likely to edit lives in one place:

- `src/config/site.ts` — announcement bar, phone, address, email, social handles, delivery
  thresholds, return window, payment methods
- `src/config/navigation.ts` — header and footer menus
- `src/data/products.ts` — the catalogue
- `src/data/categories.ts` — the eight categories
- `src/data/editorial.ts` — homepage copy, model-led sections, About page, FAQs
- `src/data/reviews.ts` — testimonials and product reviews
- `src/data/policies.ts` — delivery, returns, care, privacy, terms

No component hard-codes a price, a phone number or a piece of marketing copy.

---

## Pages

| Route | What it does |
|---|---|
| `/` | Hero, trust bar, categories, new arrivals, editorial split, model stories, bridal feature, best sellers, testimonials, social grid, newsletter |
| `/shop`, `/shop/:category` | Sidebar filters (category, price, material, collection, availability, rating), five sort orders, Load More; all state lives in the URL |
| `/product/:slug` | Gallery with hover-zoom and lightbox, full specification, quantity, add to cart, buy now, wishlist, accordions, reviews, related pieces |
| `/new-arrivals`, `/collections`, `/collections/:slug`, `/bridal` | Curated listings |
| `/cart`, `/checkout`, `/order/:orderId` | Bag with quantity + discount codes, validated checkout, order confirmation |
| `/wishlist`, `/account` | Saved pieces; login / register / password reset, order history with tracking steps, profile, address book |
| `/about`, `/contact`, `/faqs` | Brand and support pages |
| `/delivery`, `/returns`, `/jewellery-care`, `/privacy`, `/terms` | Customer-care and legal templates |

Demo discount codes: `SWABI10` (10% over Rs. 3,000) and `BRIDAL5` (5% over Rs. 6,000).

---

## Photography — how to drop in real images

The demo ships without photography. Every image is an `ImageAsset`:

```ts
{
  id: 'hero-main',
  src: '',                    // ← put the real photograph here
  alt: 'Model wearing a gold-plated necklace…',
  motif: 'model-portrait',
  tone: 'sand',
  prompt: 'Full-bleed luxury jewellery campaign photograph: elegant South Asian female model…',
}
```

While `src` is empty, `src/lib/imagery.ts` renders a brand-coloured SVG in its place — ivory grounds,
champagne line art, an editorial figure study for the model sections — so the site reads as a luxury
brand rather than a wall of grey boxes. Set `src` to a URL or an imported file and the real
photograph is used with no other change.

`prompt` is the brief for that exact shot: hand it to a photographer, or to an image generator. Every
asset has its own prompt — no image is reused across sections.

---

## Architecture

```
src/
  config/     site + navigation settings (the "admin" surface today)
  data/       products, categories, editorial copy, reviews, policies
  types/      the domain model shared by data and UI
  lib/        price formatting, search, localStorage, placeholder imagery
  context/    cart, wishlist, account, toasts (localStorage-backed)
  components/ layout · ui · product · shop · home
  pages/      one file per route, lazily loaded
```

**Admin-ready.** The data modules mirror what an API would return, so each one can be swapped for a
fetch without touching a component: products → `GET /api/products`, orders →
`POST /api/orders`, reviews → `GET /api/reviews?productId=…`, accounts → a real auth service. The
`Order`, `Customer`, `Address` and `Product` types in `src/types` are already the shapes an admin
dashboard would manage (products, categories, orders, customers, inventory, discounts, banners,
reviews, featured flags).

**Payments.** `siteConfig.paymentMethods` drives the checkout — Cash on Delivery, Bank Transfer,
Easypaisa and JazzCash are enabled, card payment is present but disabled. Each has a stable `id`, so
a gateway integration hooks in behind it. Placing an order in the demo records it locally and shows
the confirmation; no payment is taken.

**Performance.** Routes are code-split, images are lazy with async decode and a shimmer placeholder,
the hero serves a portrait crop to phones through `<picture>`, and React is split into its own chunk.
The initial homepage payload is roughly 34 kB gzipped of app code.

**SEO.** Per-page titles, meta descriptions, canonical URLs and Open Graph tags via `<Seo />`, plus
JSON-LD for the store (`JewelryStore`), products (`Product` with price and rating), listings
(`ItemList`) and the FAQ page. Clean URLs throughout: `/shop/necklaces`,
`/product/royal-pearl-necklace`, `/collections/bridal-couture`.

**Accessibility.** Semantic landmarks, a skip link, visible focus rings, labelled controls, ARIA on
dialogs and toggles, and a `prefers-reduced-motion` override that disables every animation.

---

## Hosting

### GitHub Pages (set up in this repo)

`.github/workflows/deploy-swabi-jewellers.yml` builds this directory on every push to the
storefront branch and force-pushes the static output to the **`gh-pages`** branch. The build runs
with `BASE_PATH=/Fareed-Zafar/` so assets resolve under the repository subpath, and `index.html` is
copied to `404.html` so client-side routes survive a hard refresh (Pages has no rewrite rules).

One manual step is needed once, because a workflow token is not allowed to create a Pages site:

> **Settings → Pages → Source: "Deploy from a branch" → Branch: `gh-pages`, folder `/ (root)` → Save**

The site then goes live at **https://deeraf-hub.github.io/Fareed-Zafar/** and updates itself on
every later push.

### Netlify

`netlify.toml` already declares the build (`npm run build`) and publish directory (`dist`). In
Netlify, "Add new site → Import an existing project", pick this repository, and set the base
directory to `swabi-jewellers`. Leave `BASE_PATH` unset so the site builds for the domain root;
`public/_redirects` supplies the SPA fallback.

### Anywhere else

`npm run build` emits a static `dist/`. Any host works as long as unknown paths are rewritten to
`index.html`.

## Verified

- Production build and TypeScript pass with no errors.
- Browser run of the built site: add to cart, wishlist, instant search, price filtering, sorting,
  Load More, quick view, discount codes, checkout validation, order placement, order history and
  every route — all pass, with no console errors.
