# Framewright

A browser-based video editor inspired by CapCut Web, built from scratch with
React, TypeScript, Vite and Tailwind. Edit on a multi-track timeline, add
titles, subtitles, image overlays, filters and transitions, mix audio, preview
the real composition and export an H.264 MP4, all inside desktop Chrome.
**Your media never leaves your computer.**

![stack](https://img.shields.io/badge/React-19-blue) ![stack](https://img.shields.io/badge/TypeScript-strict-blue) ![stack](https://img.shields.io/badge/Vite-8-purple) ![stack](https://img.shields.io/badge/Export-WebCodecs%20%7C%20FFmpeg.wasm-green)

## Quick start

```bash
cd video-editor
npm install        # installs deps and copies the FFmpeg core into public/ffmpeg
npm run dev        # open http://localhost:5173 in Chrome
```

Without Supabase credentials the app runs in **local mode**: no account is
needed and projects are stored in the browser (IndexedDB). To enable accounts
and cloud project sync, copy `.env.example` to `.env` and fill in
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `npm test` | Vitest unit tests (timeline ops, clip math, serialisation, WAV, …) |
| `npm run test:e2e` | Playwright: builds the app, generates real media with ffmpeg, drives the editor, exports an MP4 and verifies it with ffprobe |
| `npm run test:all` | Everything above |

E2E tests need `ffmpeg`/`ffprobe` on the PATH and the Playwright Chromium
(`npx playwright install chromium`).

## Features

See [docs/STATUS.md](docs/STATUS.md) for the authoritative list of working
features, incomplete features, known limitations and the tests performed.

* Registration, login, logout, Google sign-in, password reset, protected
  dashboard (Supabase Auth) with a local-project mode when cloud is not
  configured
* Create, rename, save, reopen, delete projects; 16:9, 9:16 and 1:1 presets
* Import video, audio and image files; thumbnails and waveforms
* Multi-track timeline with drag-and-drop from the library, move between
  tracks, trim, split, duplicate, delete, ripple delete, close gaps, snapping,
  zoom, undo/redo
* Text, titles and subtitles with fonts, outline, background box, shadow and
  animations; image overlays
* Position, scale, rotation, opacity (static or keyframed), speed (0.25×–4×)
* 21 transitions (fades, crossfade, push, directional wipes, circle, clock,
  blinds, blocks, slides, zoom, spin, flip, blur, flash), 16 looks, and
  brightness/contrast/saturation/hue/blur/vignette/grain
* Motion presets: 11 in/out animations and 10 loop effects (Ken Burns, pan,
  pulse, float, swing, shake, spin, flicker)
* Audio tracks with volume, fade in/out, mute, track mute/hide/lock
* Real-time preview of the composition with synced audio
* MP4 (H.264 + AAC), WebM (VP9 + Opus) and GIF export of the whole sequence
  or a custom range, via WebCodecs or FFmpeg.wasm, with progress and cancel
* Autosave with reload recovery

## Privacy and free-tier design

* Media files are stored only in the browser's IndexedDB and referenced by
  id/name/size in the project JSON. Nothing is uploaded.
* Supabase stores project metadata and the timeline JSON only, protected by
  Row Level Security. The browser only ever holds the public anon key.
* Rendering is 100 % client-side; a backend renderer can be added behind the
  `Renderer` interface later (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).
* Limits are explicit (`src/config/limits.ts`): 500 MB per import, 10-minute
  exports, 50 projects per account, 2 MB project JSON.

## Browser support

Desktop Chrome / Edge (Chromium ≥ 110) is the supported target. The export
engine is chosen automatically: WebCodecs hardware/software H.264 where
available (Chrome on Windows/macOS), otherwise FFmpeg.wasm (`libx264`), which
is slower but works everywhere WebAssembly does.

## License

MIT
