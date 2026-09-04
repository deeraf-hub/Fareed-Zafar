# CUEVA — Shopify Lead-Generation Funnel Design

Design deliverable for **cueva.ca** — a factory-built backyard-suite builder in
Nanaimo, Vancouver Island, BC. Built from the client's *Master Funnel Register*
copy document.

**Live design canvas:** https://claude.ai/code/artifact/7f14cab1-37a4-49e0-ae9e-1f6df0f348bb

---

## What's here

| File | What it is |
| --- | --- |
| `Main.dc.html` | Desktop artboard, 1440px — the full funnel, all sections |
| `Mobile.dc.html` | Mobile artboard, 390px — same funnel, responsive |
| `Styleguide.dc.html` | Design system — colour, type, components, layout, funnel order |
| `canvas.json` | Canvas layout: artboard positions and the brief note |
| `cueva-funnel-design.html` | The assembled, publishable canvas (generated) |
| `funnel-copy-extracted.txt` | Copy extracted verbatim from the source PDF |

`cueva-funnel-design.html` is generated from the other files — edit the
artboards, then re-seed it. Never hand-edit it.

---

## Funnel order

| # | Section | Job | Ground |
| --- | --- | --- | --- |
| 01 | Hero — offer, video, CTA | State the offer | Ink |
| 02 | Trust strip — 4 certifications | Earn permission | Sand |
| 03 | The BC numbers problem | Name the pain | Bone |
| 04 | Why on-site building fails | Blame the method | Sand |
| 05 | We build indoors — the shift | Offer the fix | Forest |
| 06 | Meet Cueva Homes | Establish authority | Bone |
| 07 | Why Cueva wins — 4 cards | Answer objections | Sand |
| 08 | Nanaimo show home | Remove the risk | Bone |
| 09 | Booking form — 7 fields | Capture the lead | Forest |
| 10 | Footer | Legal and contact | Ink |

One primary action, repeated three times — hero, show home, booking form.
No top-navigation links: nothing leaks a click out of the funnel.

---

## Design tokens

Corner radius is **0** everywhere. Square, architectural, no rounded cards.

| Token | Hex | Use |
| --- | --- | --- |
| Ink | `#1C201D` | Headlines, header bar, footer |
| Forest | `#243029` | Dark feature bands (The Shift, Booking) |
| Ember | `#C0552B` | **Accent** — every call to action |
| Ember Light | `#E08355` | Eyebrows and accent text on dark grounds |
| Bone | `#FBF9F5` | Default page background |
| Sand | `#F1ECE3` | Alternating sections, trust strip |
| Line | `#E0D9CC` | Card borders, dividers |
| Trust Green | `#3E6B4F` | Certification and privacy icons only |
| Body Text | `#4A4F49` | Paragraph copy on light grounds |
| Muted | `#6E736C` | Field hints, captions, legal |
| Body on Dark | `#C3CAC1` | Paragraph copy on Forest / Ink |
| Warning | `#B24A2A` | Pain-point cross icons |

**Type:** Archivo (display, 600/700, tracking −0.022em) + IBM Plex Sans
(body, 400/500/600). Both are on Google Fonts, so both are available in
Figma and in Shopify without licensing.

**Layout:** Desktop frame 1440, side padding 150, content 1140, section
padding 112–118. Mobile frame 390, side padding 22, section padding 56.

**Accessibility:** all body and caption text clears 4.5:1 against its ground,
and every tap target on the mobile board is at least 44px tall. Artboard
heights were measured by rendering each board in Chromium rather than
estimated, so nothing is clipped.

---

## Assumptions to confirm

1. **Colours are a placeholder token set.** The brand guidelines in the
   client's media folder were not reachable from the build environment.
   The palette is grounded in the category and the brand name, and it is
   tokenised — swapping to the real brand colours means replacing the 12
   hexes above, nothing else.

2. **Every dashed block is an empty asset slot.** No stock imagery was
   substituted. Each slot carries the client's own note describing what
   belongs there, so whoever drops in the real files knows exactly what
   each one wants.

3. **Certification logos are placeholder icons.** CSA A277, the fixed-price
   guarantee, 2-5-10 warranty and BC-weather badges are drawn as line icons
   pending the real logo files.

---

## Three copy decisions

The source copy needed a call on three points. Nothing was reworded — these
are the only changes, and each is reversible:

1. **Form numbering.** The source list ran `1, 2, 2, 3, 3, 4, 5, 6` with
   item 5 blank. Renumbered **1–7**. No field added, removed or reworded.
2. **Truncated sentence.** Page 6 of the source ends mid-word:
   *"…on your phone or computer inst"*. Set as **"instead."**
3. **Lost emoji.** The privacy line's leading emoji did not survive the PDF
   export (it reads as `??`). Drawn as a **lock icon**.

Two smaller things left exactly as written, because changing them would
change the client's copy — worth raising with them:

- *"We take care of every single step for you. From getting city permits to
  installing the home,"* ends on a comma.
- *"So you never have to deal with noisy workers or builder stress"* has no
  full stop.

---

## Getting this into Figma

The canvas above is the reviewable design. To pull it into Figma as native,
editable layers, use the **html.to.design** plugin (Figma Community) — paste
the artifact URL, and it rebuilds the page as real frames with auto-layout,
text layers and colour styles. From there it is an ordinary Figma file:
regroup, componentise, publish styles.

## Building it in Shopify

The funnel is one page with no top navigation. The booking form is seven
fields, two of them dropdowns and one a date picker — a Shopify form app or an
embedded booking widget covers it. The two video slots are 30-second silent
autoplay loops with a text badge overlaid; the badge is markup over the video,
not burnt into the file, so the copy stays editable.
