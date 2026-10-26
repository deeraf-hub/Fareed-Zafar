# Status: working features, gaps, limitations, tests

_Last updated: 2026-10-26 (v0.1.0)._

## Working features

**Accounts & projects**
- Registration, login, logout with Supabase Auth (email + password); protected
  `/projects` and `/editor/:id` routes redirect to `/login` when signed out.
- Local-project mode when `VITE_SUPABASE_*` are not set: no account, projects
  stored in IndexedDB, banner explains the mode.
- Create (name + 16:9 / 9:16 / 1:1), rename, reopen, delete projects from the
  dashboard; rename also from the editor title and inspector.
- Autosave ~1.2 s after every change (IndexedDB first, then Supabase in cloud
  mode); flush on tab hide/unload; reload recovery prefers the newest unsaved
  local draft and pushes it back to the cloud.
- Only project JSON is stored remotely; media blobs stay in the browser.

**Media**
- Import video, audio and image files via button, drag-and-drop onto the
  library, or drag-and-drop straight onto a timeline track.
- Metadata probing (duration, dimensions), JPEG thumbnails, audio waveforms
  computed in a Web Worker; files persisted as Blobs in IndexedDB so projects
  survive reloads; "Missing" badge + relink for files absent on another device.
- Import limits enforced (500 MB per file, 100 assets, 400 clips).

**Timeline**
- Unlimited video and audio tracks (add/remove, mute, hide, lock, rename).
- Drag clips to move in time and across compatible tracks; multi-select move
  (Shift-click); trim either edge with handles; split at playhead (all or
  selected clips); duplicate; delete; overlap-free placement with nearest-free-
  spot resolution; snapping to clip edges/playhead (toggle); zoom (slider,
  Ctrl+wheel, +/-), fit-to-sequence; ruler scrubbing; auto-scroll on playback.
- Undo/redo (60 steps) covering every timeline operation; drag gestures are
  one step.
- Keyboard shortcuts (Space, S, Del, Ctrl+D, Ctrl+Z/Y, arrows, Home/End, N, ?).

**Compositing**
- Text clips with Title / Subtitle / Text presets: font family, size, colour,
  bold, italic, alignment, background box + opacity, outline, drop shadow,
  wrap width, animations (fade, slide-up, pop, typewriter).
- Image overlays and picture-in-picture video on upper tracks.
- Per-clip position, scale, rotation, opacity (sliders + drag in the preview).
- Speed 0.25×–4× for video and audio clips (adjusts clip length, trims kept).
- Brightness, contrast, saturation plus looks (vivid, warm, cool, vintage,
  black & white, sepia, invert).
- Transitions: fade, crossfade (with the adjacent previous clip), wipe, slide,
  zoom; in and out with adjustable duration.
- Project background colour, frame rate 24–60.

**Audio**
- Video audio and audio-only clips mixed through Web Audio with per-clip
  volume (0–200 %), fade in/out, clip mute and track mute.
- Preview keeps media elements in sync with a master clock (drift correction).
- Export mix rendered with an OfflineAudioContext (same gains/fades).

**Preview & export**
- Canvas preview renders the actual composition (same `drawFrame` as export).
- MP4 (H.264 + AAC) export at 1080p/720p/480p with progress, phase, frame
  counter and cancellation; download + inline playback of the result.
- Two interchangeable engines behind one `Renderer` interface:
  WebCodecs + mp4-muxer (fast, Chrome with H.264 encoder) and FFmpeg.wasm
  (`libx264`, segment-based, bounded memory). Automatic selection.
- Audio encoded to AAC by WebCodecs when available, otherwise FFmpeg.wasm.

**UI**
- Dark, desktop-first layout: library | preview | inspector over a resizable
  timeline; toasts; shortcuts dialog.

## Incomplete / not yet implemented

- Keyframe animation of transforms/opacity (only presets and transitions).
- Ripple delete / ripple trim and track-wide "close gaps" UI (the pure
  `closeGaps` helper exists, no button yet).
- Video crop, masks, chroma key, blend modes, audio EQ/ducking.
- Export of a sub-range (always the full sequence) and export presets other
  than H.264/AAC MP4 (e.g. WebM, GIF).
- Cloud media storage, sharing/collaboration, server-side rendering (the
  `Renderer` interface is ready for it; no backend is shipped).
- Password reset and OAuth providers (email/password only).
- Mobile/touch layout.

## Known limitations

- Target is desktop Chrome/Edge. Firefox lacks `ctx.filter` on some builds
  and has no WebCodecs H.264 encoder; Safari is untested.
- Import relies on the browser's decoders: Chrome plays H.264/AAC MP4, WebM,
  MP3, WAV, OGG, PNG/JPEG/WebP/GIF. HEVC/ProRes/MKV-with-exotic-codecs will
  not import (clear error shown). Open-source Chromium builds cannot decode
  H.264/AAC at all.
- Export speed: WebCodecs ≈ real-time or faster at 1080p on modern hardware;
  FFmpeg.wasm (single-threaded) is roughly 5–20× slower than real-time at
  1080p and 2–4× at 480p. Exports are capped at 10 minutes.
- Frame accuracy during export depends on `HTMLVideoElement` seeking; very
  long-GOP sources can take longer per frame.
- Variable-frame-rate sources are resampled to the project frame rate.
- The preview mixes audio through `MediaElementAudioSourceNode`, so clip audio
  for the same element cannot be routed twice; pitch is preserved on speed
  changes (browser default) which may sound processed at extreme speeds.
- Project JSON is limited to 2 MB (≈ hundreds of clips with thumbnails). Very
  large libraries should remove unused assets.
- IndexedDB storage is per browser profile; clearing site data deletes the
  cached media (projects remain in the cloud in cloud mode).
- Supabase free tier pauses inactive projects after a week; the app keeps
  working locally and syncs when it is back.

## Tests performed

**Automated (run on every push by `.github/workflows/video-editor-ci.yml`)**

| Layer | Tool | What is covered | Result |
|---|---|---|---|
| Static | `tsc -b` (strict), ESLint (TS + react-hooks) | whole codebase | pass |
| Unit | Vitest, 39 tests in 7 files | collision/placement, move (single + multi), trim start/end (source limits, speed, neighbours), split (trim/speed continuity), duplicate/delete/close gaps, snapping, project factory, project normalisation and round-trip, clip source time, gains/fades/mutes, transition windows, crossfade adjacency, track ordering, WAV encoding, interleave, filter strings, export dimensions, renderer registry, time formatting | pass |
| E2E | Playwright + Chromium, real media generated with ffmpeg (VP9/Opus WebM, VP8 WebM, WAV, PNG) | dashboard create/rename/reopen/delete; library import; drag-and-drop to tracks; add/move/trim/split/duplicate/speed/filter/transition/text; preview playback; autosave + reload; MP4 export verified with ffprobe | dashboard spec pass; full scenario run in progress (see PR for final result) |

**Manual checks in this environment**

- `npm run build` produces `dist/` (≈ 456 kB JS gzip 143 kB, FFmpeg core
  served from `/ffmpeg`).
- Exported MP4 verified with `ffprobe`: `h264` video stream at the requested
  resolution, `aac` audio stream, duration within 0.6 s of the sequence.

**Not tested here (needs a real desktop Chrome)**: the WebCodecs H.264 fast
path and AAC via `AudioEncoder` (the test Chromium has no H.264 encoder, so the
suite exercises the FFmpeg.wasm engine and automatic fallback); Supabase
cloud mode end-to-end against a live project (the repository/auth code is
unit-level only).
