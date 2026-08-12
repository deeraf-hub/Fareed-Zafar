# ShopEase — Social Media Brand Design System

This is the shared visual language for all 30 post designs in this package. Every post file references the color tokens, type styles, and layout templates defined here, so a designer can build the entire set in Canva or Figma with one master file.

---

## 1. Color Palette

| Token | Hex | Usage |
|---|---|---|
| **Midnight Navy** | `#0A1F44` | Primary background for dark posts, headline text on light posts |
| **Growth Teal** | `#00B3A4` | Brand accent: "Ease" in wordmark, icons, underlines, chart lines |
| **Signal Amber** | `#FFB100` | CTA buttons, highlight bars, stat callouts — use sparingly (one amber element per post) |
| **Cloud White** | `#FFFFFF` | Text on dark, light post backgrounds |
| **Mist Gray** | `#F4F6FA` | Light post backgrounds, card fills |
| **Slate** | `#5A6B85` | Secondary/body text on light backgrounds |
| **Deep Gradient** | `#0A1F44 → #063B4F → #00B3A4` | Diagonal gradient mesh for hero/statement posts (135°, navy dominant, teal glow in one corner) |

**Wallet colors — payment posts only:** Easypaisa Green `#00A650` and JazzCash Red `#C41F3A` appear *only* inside wallet logo chips (white rounded-rectangle pills containing each wallet's logo). Never use them as post background or headline colors — they identify the wallets, not ShopEase.

## 2. Typography

| Style | Font | Spec |
|---|---|---|
| Headlines | **Poppins SemiBold / Bold** | Tight leading (1.1), sentence case. 64–96 pt on 1080px canvases |
| Big stats / numbers | **Poppins ExtraBold** | 160–240 pt, Growth Teal or Signal Amber |
| Body / supporting | **Inter Regular / Medium** | 30–38 pt, 1.4 leading |
| Labels / eyebrow text | **Inter SemiBold, ALL CAPS** | 24–28 pt, letter-spacing +8%, Growth Teal |
| Optional Urdu accents | **Noto Nastaliq Urdu** | For occasional Urdu taglines on Facebook posts |

## 3. Logo & Fixed Furniture

- **Wordmark:** "Shop" in Cloud White (or Midnight Navy on light backgrounds) + "Ease" in Growth Teal, Poppins SemiBold. Optional monogram: a rounded storefront awning whose right edge becomes an upward arrow, in Growth Teal.
- **Placement:** wordmark top-left or bottom-left of every post, 48 px margin.
- **URL footer:** `shopeasepay.com` in Inter Medium, bottom-right, Slate on light / 60%-white on dark.
- **Safe margins:** 64 px on all sides of a 1080px canvas. Nothing but background bleeds past them.

## 4. Visual Motifs

- **Rounded cards** (24 px radius) with soft shadows (`0 12px 40px rgba(10,31,68,0.12)`)
- **Dot-grid pattern** at 6–8% opacity in one corner of dark posts (tech texture, never behind text)
- **Upward-trending elements**: arrows, growth curves, staircase bars — the brand's visual shorthand for "growth"
- **Device frames**: flat, minimal laptop/phone outlines in white or navy, never photorealistic 3D renders
- **Photography style** (when used): real South Asian business owners and shop settings — warm, candid, natural light. Avoid generic Western stock-office imagery.

## 5. Layout Templates

Each post file references one of these eight archetypes.

- **Template A — Bold Statement:** Full-bleed Deep Gradient background. Eyebrow label top-center or top-left → oversized headline (max 3 lines) → one-line supporting text → amber CTA chip. Dot-grid in one corner.
- **Template B — Stat Spotlight:** Dark or light background. A single oversized number (Poppins ExtraBold, teal or amber) dominates the upper two-thirds; the claim and source sit beneath it in Inter; CTA chip at bottom.
- **Template C — Carousel:** Cover slide on Deep Gradient with headline + "swipe →" cue; content slides alternate Mist Gray / white with a numbered teal chip (1, 2, 3…) top-left; final slide is always a CTA slide on navy with an amber button.
- **Template D — Testimonial Card:** Mist Gray background. Giant teal quotation mark top-left (240 pt, 20% opacity). Quote in Poppins Medium (navy), 5 amber stars, then a client row: circular photo (or initials avatar in teal), name in Poppins SemiBold, role/company in Inter (Slate).
- **Template E — Checklist / Tips:** White or Mist Gray background. Headline top, then 4–6 rows: teal check-circle icon + short bold lead-in + one-line explanation. Amber highlight bar behind the single most important row.
- **Template F — Split Panel (Myth vs. Fact / Before vs. After):** Canvas split vertically. Left panel Slate-tinted with an ✕ icon and the "old way"; right panel teal-tinted with a ✓ icon and the "ShopEase way." Headline banner across the top in navy.
- **Template G — Device Mockup:** Light background with a soft teal radial glow. Laptop or phone frame holding a UI screenshot/mock; annotation callouts with thin teal leader lines; headline above or beside the device.
- **Template H — CTA Banner:** Navy background, amber accent bar down the left edge. Short urgent headline, 2–3 benefit bullets with teal checks, large amber pill button with navy text, and a "limited slots / date" strip along the bottom.

## 6. Canvas Sizes

| Placement | Size |
|---|---|
| Instagram / Facebook feed (square) | 1080 × 1080 |
| Instagram portrait & carousels | 1080 × 1350 |
| LinkedIn single image | 1200 × 1200 (or 1200 × 627 for link posts) |
| Stories / Reels cover | 1080 × 1920 |

## 7. Voice Rules (applies to every caption)

- Lead with the reader's business outcome, never with the tool ("more orders," not "we use React").
- Confident, warm, zero hype-words ("revolutionary," "game-changing" are banned).
- Partnership language: "we build with you," "your growth partner."
- One CTA per caption. End with 4–8 hashtags mixing Pakistan-market and service tags.
- Hashtag bank: `#DigitalPakistan #EcommercePakistan #PakistanBusiness #SmallBusinessPakistan #Easypaisa #JazzCash #WebDevelopment #MERNStack #SEO #ContentStrategy #OnlineStore #BusinessGrowth`
