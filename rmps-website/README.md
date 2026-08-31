# RMPS Website

A static, self-contained marketing site for RMPS (Retail Merchants Payment
Services) — a FinTech / merchant aggregator / digital payment accelerator.

## Structure

```
rmps-website/
  index.html            Homepage — all sections in one page
  assets/css/style.css   Design tokens, layout, animations
  assets/js/main.js      Nav, scroll reveals, interactive payment demo,
                          animated dashboard counters/chart
```

Sections on the homepage: hero, trust/ecosystem strip, payment gateway with
an interactive checkout demo, solutions grid, JazzCash & Easypaisa
integration, a 4-step "how it works" timeline, a merchant dashboard mockup,
industries served, a "why RMPS" panel, and a final call-to-action.

No build step or external JS framework — the markup is section-by-section
and copy/paste friendly, so it can be rebuilt as Elementor sections
(hero, trust strip, gateway, solutions, wallets, timeline, dashboard,
industries, why, CTA, footer) without restructuring the content.

## Running locally

Any static file server works, e.g.:

```bash
npx serve rmps-website
# or
python3 -m http.server --directory rmps-website 8080
```

Then open the printed URL in a browser.

## Notes

- JazzCash, Easypaisa, Visa, Mastercard, UnionPay and PayPak are presented
  as supported payment methods within the RMPS gateway, not as RMPS-owned
  products (see the footer disclaimer in `index.html`). Real API behavior,
  onboarding and settlement details should follow each provider's own
  agreements/documentation.
- Placeholder contact details (`hello@rmps.com.pk`, a WhatsApp number) are
  used in the CTA and footer — swap these for RMPS's real contact channels
  before publishing.
- Fonts (Inter, Space Grotesk) load from Google Fonts; everything else is
  self-contained (no other external assets or CDNs).
