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

Built from the supplied brand guidelines. Corner radius is **0** everywhere.

| Token | Hex | Use |
| --- | --- | --- |
| Deep | `#16211D` | Footer only — the darkest note |
| Slate | `#25322E` | **Primary.** Header, hero, the two dark feature bands |
| Slate Raised | `#2E3D38` | Arc-pattern stroke on Slate. Tone-on-tone, never text |
| Meadow | `#BCD6A4` | **The only accent.** Buttons on dark, eyebrows, key figures |
| Sage | `#DCE5DC` | Alternating sections, trust strip, pull quotes |
| Paper | `#F2F5F0` | Default page ground, and text on Slate |
| Line | `#C9D4C8` | Hairlines on Paper (`#C2CEC1` on Sage) |
| Line Dark | `#3B4A44` | Hairlines on Slate |
| Ink | `#1B2A24` | Headlines and labels on light grounds |
| Body | `#46554E` | Paragraph copy on light — 7.0:1 on Paper |
| Muted | `#5C6B63` | Hints, captions, legal — 4.9:1 on Paper |
| Body on Dark | `#C2CFC5` | Paragraph copy on Slate — 8.3:1 |

**Type:** Newsreader (display serif, weight 400, headlines and pull quotes only)
+ Archivo (text sans, 400/500/600, everything else). Both are on Google Fonts,
so both are available in Figma and in Shopify without licensing.

**The arch.** Six nested arcs, stroked in Slate Raised at 15–18px, anchored
past the frame edge so the arch is always cropped rather than centred and
complete. This is the signature device from the supplied guidelines; here it
also reads as an arch — a *cueva*, a shelter.

**Layout:** Desktop frame 1440, side padding 100, content 1240, section
padding 112–118. Mobile frame 390, side padding 22, section padding 56.
Backgrounds run Paper → Sage → Slate, never two alike adjacent. Section 06
runs edge to edge with zero gutters.

**Accessibility:** all body and caption text clears 4.5:1 against its ground,
and every tap target on the mobile board is at least 44px tall. Artboard
heights were measured by rendering each board in Chromium rather than
estimated, so nothing is clipped.

## Assumptions to confirm

1. **The palette follows the supplied brand guidelines**, not a guess:
   deep green-slate ground, pale sage secondary, one meadow accent, and the
   tone-on-tone arc line work. The competitor sites named in the brief were
   not reachable from the build environment (network egress is blocked), so
   layout reference came from the guidelines themselves.

2. **Every dashed block is an empty asset slot.** No stock imagery was
   substituted. Each slot carries the client's own note describing what
   belongs there, so whoever drops in the real files knows exactly what
   each one wants.

3. **Certification logos are placeholder icons.** CSA A277, the fixed-price
   guarantee, 2-5-10 warranty and BC-weather badges are drawn as line icons
   pending the real logo files.

4. **The nested-arc glyph beside the wordmark is a stand-in, not a proposed
   identity.** Drop the real Cueva logo into that slot in the header and
   footer; the arc pattern stands on its own either way.

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
