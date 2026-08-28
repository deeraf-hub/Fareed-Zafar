# Swabi Jewellers

A premium jewellery e-commerce storefront — React + TypeScript + Tailwind CSS.
Ivory, champagne and charcoal design language, full shopping flow (browse →
cart → checkout), account/orders/wishlist, search, and 31 demo products
across 8 categories.

> Address: KS 7144, Last Mason Road, Bhutta Village, Karachi West, Keamari
> Town, Karachi, Pakistan · Phone: 0333-2363722

## Stack

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** for styling, with a custom ivory/champagne/charcoal theme
  (`tailwind.config.ts`)
- **React Router v6** for routing
- React Context + `localStorage` for cart, wishlist and demo authentication
  (no backend required to try every flow end-to-end)

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check + production build
npm run preview   # preview the production build
npm run typecheck # type-check only
npm run lint       # eslint
```

## Project structure

```
src/
  config/site.ts        Brand name, contact details, announcement bar text,
                         delivery threshold, policy copy — edit this file to
                         re-brand the whole site.
  types/                 Shared TypeScript types (Product, Order, Address, …)
  data/                  Demo catalog: products, categories, testimonials,
                         Instagram gallery, policy/FAQ copy. Structured so it
                         can be swapped for real API calls without touching
                         any component.
  lib/                   Small utilities: currency formatting, localStorage
                         helpers, scroll-reveal hook, SEO hook, and the
                         placeholder-art system (see below).
  context/               CartContext, WishlistContext, AuthContext.
  components/
    layout/               Announcement bar, navbar, mobile menu, search
                         overlay, footer.
    ui/                   Shared building blocks: ProductCard, ProductGrid,
                         Rating, Price, QuickViewModal, icons, etc.
    home/                 Homepage sections (hero, categories, bridal, best
                         sellers, testimonials, newsletter, …).
    shop/                 Shop page filter sidebar + sort/price/material
                         filter types.
  pages/                  One file per route, plus pages/account/* for the
                         account area (login, register, dashboard, orders,
                         addresses, profile).
```

## Image / photography strategy

Every hero, model, lifestyle and product image is real, licensed
photography — 29 free-tier Adobe Stock photos, resized/compressed for web
(`src/assets/photography/*.jpg`, ~4MB total) and registered with their
license credit in `src/assets/photography/photos.ts`. Product photos are
assigned per category so no two products in the same category share an
image (see `categoryPhotoPool` in `src/data/products.ts`).

Everywhere in the app that shows a photo uses the `<Photo photoKey="..." />`
component (`src/components/ui/Photo.tsx`), which reads from that one
registry. To replace any image, swap the file in
`src/assets/photography/`, update its import in `photos.ts`, and every
place it's used updates automatically — no other code changes needed.

A standalone SVG placeholder-art system also ships alongside this
(`src/lib/placeholderArt.tsx`, `<PlaceholderArt scene="..." />`) — unused by
default, but available as a zero-dependency, no-license-risk fallback for
any future image slot before real photography is ready for it. Its own
`PLACEHOLDER_PROMPTS` map doubles as a shoot/generation brief.

The header/footer logo (`src/components/ui/Logo.tsx`) is a hand-drawn SVG
recreation of the brand mark, since no source logo file was available to
this build session — swap it for the real artwork by replacing `LogoMark`'s
contents with an `<img>`.

## Editable business content

Everything a store owner would want to change lives in one of these files —
no component ever hardcodes brand copy, pricing, or policy text:

- `src/config/site.ts` — brand name, tagline, announcement bar, contact
  details, free-delivery threshold, delivery/returns/care policy text.
- `src/data/products.ts` — the 31 demo products. Replace with a real
  inventory feed by swapping this file for an API call; every component
  imports `products` from here.
- `src/data/categories.ts`, `src/data/testimonials.ts`,
  `src/data/instagram.ts`, `src/data/policies.ts` — same pattern.

## Demo-only pieces (clearly structured for a real backend later)

- **Authentication** (`src/context/AuthContext.tsx`) stores accounts in
  `localStorage` so registration/login/orders/addresses are fully
  interactive without a server. Swap for real session/JWT auth against an
  API — every component only calls `useAuth()`.
- **Checkout** collects Cash on Delivery / Bank Transfer / Easypaisa /
  JazzCash / Card as payment options; only Cash on Delivery is "real" here.
  The others show a clear "gateway integration coming soon" note rather than
  collecting real payment details, and the payment method list
  (`src/pages/Checkout.tsx`) is structured so a real gateway can be dropped
  in per method.
- **Cart & Wishlist** persist to `localStorage` per browser.

## Notes

- No WhatsApp floating button is included, per the brief — a WhatsApp
  contact link appears as plain text in the footer only.
- Pricing is illustrative demo data in PKR, clearly marked as such in the
  footer.
