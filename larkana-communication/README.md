# Larkana Communication: website redesign

A modern, animated redesign of [larkanacommunication.com](https://larkanacommunication.com/), a Karachi-based
mobile-accessories store (earbuds, smartwatches, chargers, cables) that also accepts **mobile top-up payments**.

It is plain HTML, CSS and JavaScript with no build step and no dependencies, so it can be uploaded to any host
(cPanel, Hostinger, Netlify, Vercel, GitHub Pages) as-is, or used as the design reference for a WordPress/WooCommerce theme.

```
larkana-communication/
├── index.html            # all page sections
├── assets/css/style.css  # design system, animations, responsive rules
└── assets/js/main.js     # products, cart, filters, forms, scroll effects
```

## Preview locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve larkana-communication
# or
python3 -m http.server -d larkana-communication 8080
```

## Sections

1. **Hero**: animated headline reveal, orbiting smartwatch visual, floating info cards, animated stat counters
2. **Marquee**: scrolling category ticker
3. **Categories**: six cards with a cursor-following spotlight; clicking one filters the shop
4. **Shop**: 12 product cards with filter tabs, 3D tilt on hover, wishlist, add-to-cart
5. **Deal of the week**: Ronin Luxe R-09 with a live countdown to Sunday midnight
6. **Mobile top-ups**: 4-step explainer plus a Jazz / Zong / Telenor / Ufone request form that opens WhatsApp
7. **Why us**: six value cards
8. **How to order**: 3-step timeline whose line fills as you scroll
9. **FAQ**: animated accordion
10. **Contact**: email, phone, location, hours with a live "Open now" badge (Pakistan time), and a message form
11. **Newsletter** and **footer**

There is also a slide-in **cart drawer**. Checkout sends the order summary to WhatsApp, and the cart is saved in the browser.
The page includes a floating WhatsApp button, back-to-top, a scroll progress bar, a preloader, and cursor glow plus magnetic buttons on desktop.
All motion is turned off for visitors with *reduce motion* enabled.

## Before going live: confirm with the merchant

The live site could not be opened from the build environment, so its content was recovered from search-engine
listings. These items need checking:

| Item | Where | Status |
|---|---|---|
| Phone / WhatsApp `+92 300 1234567` | `index.html` contact + footer, `WHATSAPP_NUMBER` in `main.js` | Copied from the current site, but it looks like a placeholder |
| Ronin R-09 ₨8,595 · Ronin Luxe R-09 ₨9,495 · Powerlink II ₨650–950 · cable ₨250–300 | `products` in `main.js` | From the current site |
| All other products and prices | `products` in `main.js` | **Samples.** Replace with the real catalogue |
| Hero stats (500+ products, 10k+ customers) | hero in `index.html` | **Placeholders.** Use real figures or remove |
| Delivery, replacement and payment-method claims | "Why us" + FAQ | Confirm the actual policies |
| Social links | footer | Currently `#`. Add the real profile URLs |
| Newsletter + contact form | `main.js` | Front-end only. The contact form opens the visitor's email app; connect the newsletter to a mailing-list provider |

To change products, edit the `products` array at the top of `assets/js/main.js`. Each item takes an illustration
(`watch`, `earbuds`, `cable`, `charger`, `powerbank`, `speaker`, `headphones`, `case`) and two gradient colours.
To use real product photos, replace the `art[...]` call in the card template with an `<img>` tag.
