# Cueva Landing Page — Figma plugin

Draws the Cueva Homes landing page onto the Figma canvas as native auto-layout
frames and editable text layers, at both breakpoints.

Runs on **any Figma account, including Free.**

## Install (about a minute, one time)

1. Download this folder — all four files must sit together:
   `manifest.json`, `code.js`, `ui.html`, `README.md`
2. Open the Figma **desktop app** (local plugins do not import from the browser).
3. Menu → **Plugins** → **Development** → **Import plugin from manifest…**
4. Pick `manifest.json` from this folder.

It now appears under Plugins → Development → **Cueva Landing Page**.

## Run

Open a Design file, then Plugins → Development → Cueva Landing Page.

A panel opens with two toggles — **Desktop 1440** and **Mobile 390** — and one
**Build landing page** button. Both breakpoints are on by default.

The page is drawn near the centre of your current view, selected and zoomed to
fit when it finishes.

## What you get

Native Figma structure, not a flat image:

- Vertical auto-layout page frames, one per breakpoint, named
  `CUEVA — Landing page / Desktop 1440` and `… / Mobile 390`
- Ten named sections in order: `01 Hero` … `10 Footer`
- Real text layers, editable in place. The H1 is a single layer with the two
  accent phrases coloured by range, so it stays one editable headline.
- Icons and the arch pattern as real vectors, imported as SVG.
- Image and video slots as dashed placeholders, each labelled with the client's
  own note for what belongs there.

Re-runnable: it registers relaunch data, so it stays available from the
Plugins menu and from any page frame it created.

## Fonts

Wants **Newsreader** (headlines) and **Archivo** (everything else). Both are
free Google Fonts.

If either is missing, the plugin does not fail — it falls back (Newsreader →
Georgia → Inter; Archivo → Inter) and the panel tells you which substitution
happened. To get the intended type, install both fonts locally, or enable them
in Figma, before running.

## Editing the source

`code.ts` is the source of truth; `code.js` is compiled from it. To change
anything, edit the TypeScript and recompile:

```
tsc -p tsconfig.json
```

The page is a data spec — `V()` / `H()` / `T()` / `R()` / `S()` constructors
walked by one `render()` function — so layout changes are edits to the spec,
not to imperative drawing code. Design tokens live in the `C` object at the
top; the copy lives in `COPY`.
