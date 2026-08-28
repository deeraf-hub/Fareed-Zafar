# Muskan Confessionary — Bike Spare Parts Website

A modern, responsive e-commerce website for **Muskan Confessionary**, a motorbike spare parts shop at Al Hammad Plaza, Sector 5B2, North Karachi Central, Karachi.

- Animated hero, category browser, and a 41-item shop catalog (Rs 150 – Rs 4,500)
- Client-side cart (add to cart, quantity stepper, persistent via `localStorage`) with a slide-out cart drawer
- Checkout with delivery details form and **JazzCash / EasyPaisa / Cash on Delivery**
- No WhatsApp button anywhere — contact is by phone call or the on-site contact form
- Small Express backend for order handling, a contact form endpoint, and real JazzCash/EasyPaisa gateway integration

## Running it

```bash
npm install
npm start          # http://localhost:3000
# or: npm run dev   # auto-restarts on file changes
```

The site is plain HTML/CSS/JS (no build step) served by a small Express server. Open it through the server (`npm start`), not by double-clicking `index.html` — the product catalog is loaded via `fetch('data/products.json')`, which requires `http://`, not `file://`.

## Project layout

```
index.html, shop.html, checkout.html, about.html, contact.html
css/style.css        All styling — CSS variables, responsive grid, animations
js/icons.js           Inline SVG icon library (no external image requests)
js/cart.js            Cart state, persisted to localStorage
js/app.js             Header, cart drawer, product rendering, shop filters/search/sort
js/layout.js           Shared footer + icon injection
js/checkout.js         Checkout form, order summary, payment method UI, order placement
data/products.json     Product catalog (single source of truth for front and back end)
server.js               Express app: static hosting + /api/checkout, /api/contact, gateway callbacks
lib/jazzcash.js         JazzCash Hosted Checkout Page (HCP) request builder + secure hash
lib/easypaisa.js        EasyPaisa Easypay request builder + signature
```

## Payments — JazzCash & EasyPaisa

The checkout supports three methods: **JazzCash**, **EasyPaisa**, and **Cash on Delivery**.

**Out of the box (no merchant account needed):** choosing JazzCash or EasyPaisa shows the shop's mobile account number (`0312-0215642`) with the order ID as a reference — the same manual mobile-to-mobile transfer most small shops already use. This works immediately with zero configuration.

**Real gateway integration (optional, once you have a merchant account):** `lib/jazzcash.js` and `lib/easypaisa.js` implement the redirect-based Hosted Checkout Page flow for each provider — building the signed request fields and auto-submitting the customer's browser to the gateway, then verifying the signed callback. To turn this on:

1. Register as a merchant with JazzCash and/or EasyPaisa (Telenor Microfinance Bank) to get API credentials.
2. Copy `.env.example` to `.env` and fill in:
   - `JAZZCASH_MERCHANT_ID`, `JAZZCASH_PASSWORD`, `JAZZCASH_INTEGRITY_SALT`
   - `EASYPAISA_STORE_ID`, `EASYPAISA_HASH_KEY`
3. Keep `JAZZCASH_ENV=sandbox` / `EASYPAISA_ENV=sandbox` until you've tested with the provider's sandbox, then switch to `live`.

Both providers have revised field names/signature formulas across integration-guide versions over the years — before going live, double-check the field list and hash formula in `lib/jazzcash.js` / `lib/easypaisa.js` against the current guide from your relationship manager.

If credentials aren't set, the site automatically falls back to the manual transfer flow above — checkout never breaks.

## Editing shop content

- **Products**: edit `data/products.json` (id, name, category, price, icon, desc). The `icon` field picks a key from `js/icons.js`.
- **Shop details**: phone, address, and hours are repeated in the header/footer of every HTML page and in `js/layout.js` — update all of them together.
- **Delivery fee / free delivery threshold**: `DELIVERY_FEE` and `FREE_DELIVERY_THRESHOLD` at the top of `js/checkout.js` (also mirrored in `server.js`'s `/api/checkout`).

## Data storage

Orders and contact messages are appended to `data/orders.json` / `data/contacts.json` (gitignored, created automatically on first order/message). This is intentionally simple flat-file storage for a small single-shop site — swap in a real database if order volume grows.
