# Status: working features, gaps, limitations, tests

_Last updated: 2026-10-26 (v0.4.0)._

## Working features

**Accounts & projects**
- Registration, login, logout with Supabase Auth (email + password), "Continue
  with Google" (OAuth, once the provider is enabled in Supabase) and password
  reset by email (`/forgot-password` → emailed link → `/reset-password`);
  protected `/projects` and `/editor/:id` routes redirect to `/login` when
  signed out.
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
  survive reloads; "Missing" badge, a relink banner, and automatic relinking:
  importing a file whose name and size match a missing asset repairs that
  asset instead of creating a new one.
- Import limits enforced (500 MB per file, 100 assets, 400 clips).

**Timeline**
- Unlimited video and audio tracks (add/remove, mute, hide, lock, rename).
- Drag clips to move in time and across compatible tracks; multi-select move
  (Shift-click); trim either edge with handles; split at playhead (all or
  selected clips); duplicate; delete; ripple delete (Shift+Del, closes the
  hole on that track); close gaps per track or for the selection; overlap-free
  placement with nearest-free-spot resolution; snapping to clip edges/playhead
  (toggle); zoom (slider, Ctrl+wheel, +/-), fit-to-sequence; ruler scrubbing;
  auto-scroll on playback.
- Undo/redo (60 steps) covering every timeline operation; drag gestures are
  one step.
- Keyboard shortcuts (Space, S, Del, Ctrl+D, Ctrl+Z/Y, arrows, Home/End, N, ?).

**Compositing**
- Text clips with Title / Subtitle / Text presets: font family, size, colour,
  bold, italic, alignment, background box + opacity, outline, drop shadow,
  wrap width, letter spacing, uppercase, vertical gradient fill, and 11
  animations (fade, slide-up, pop, bounce, zoom, spin, blur, typewriter, and
  per-letter rise, wave and glitch).
- Image overlays and picture-in-picture video on upper tracks.
- Per-clip position, scale, rotation, opacity (sliders + drag in the preview).
- Keyframes for position X/Y, scale, rotation and opacity: a diamond next to
  each property adds/removes a key at the playhead, changing a keyframed
  property at another time adds a key there, values interpolate between keys
  with a per-key easing (ease in-out, linear, ease in, ease out, bounce), keys
  show as markers on the clip, and splitting/trimming keeps the motion
  identical. The preview overlay drag writes keyframes when the clip has them.
- Crop (per-edge sliders plus 1:1, 16:9, 9:16, 4:5, 4:3 centre presets) and
  shape masks (rectangle, rounded rectangle, circle, ellipse, linear split)
  with size, feather, offset, rotation and invert, for video and image clips.
- Speed 0.25×–4× for video and audio clips (adjusts clip length, trims kept).
- Brightness, contrast, saturation, hue rotation, blur, vignette and film
  grain, plus 16 looks (vivid, warm, cool, cinematic, dramatic, faded, pastel,
  sunset, vintage, chrome, cyber, black & white, noir, sepia, invert).
- Transitions (in and out, adjustable duration), 21 types: fade, crossfade
  and push (with the adjacent previous clip), wipe right/left/up/down, circle,
  clock wipe, blinds, blocks, slide from left/right/top/bottom, zoom, spin,
  flip, blur, flash.
- Motion presets per clip, layered on transform and keyframes: 11 in/out
  animations (fade, zoom in/out, slide from four sides, spin, bounce, flip,
  drop/fall) with durations, and 10 loop effects (Ken Burns in/out, pan
  left/right, pulse, float, swing, shake, spin, flicker) with strength and
  speed.
- Project background colour, frame rate 24–60.

**Audio**
- Video audio and audio-only clips mixed through Web Audio with per-clip
  volume (0–200 %), fade in/out, clip mute and track mute.
- Audio ducking: an audio track marked "duck" is lowered automatically (by
  an adjustable amount, with a release ramp) whenever any other audible clip
  plays, in the preview and in exports.
- Preview keeps media elements in sync with a master clock (drift correction).
- Export mix rendered with an OfflineAudioContext (same gains/fades).

**Preview & export**
- Canvas preview renders the actual composition (same `drawFrame` as export).
- Export to MP4 (H.264 + AAC), WebM (VP9 + Opus) or animated GIF (15 fps, no
  audio, ≤ 30 s) at 1080p/720p/480p (short side), of the whole sequence or a
  custom start/end range (with "use playhead" buttons), with progress, phase,
  frame counter and cancellation; download + inline playback of the result.
- Two interchangeable engines behind one `Renderer` interface:
  WebCodecs + mp4-muxer / webm-muxer (fast; H.264 or VP9 via the browser's
  encoders) and FFmpeg.wasm (`libx264` / `libvpx-vp9` / `gif`, segment-based,
  bounded memory). The engine list is filtered per format; selection is
  automatic by default.
- Audio encoded to AAC/Opus by WebCodecs when available, otherwise FFmpeg.wasm.

**UI**
- Dark, desktop-first layout: library | preview | inspector over a resizable
  timeline; toasts; shortcuts dialog.

## Incomplete / not yet implemented

- Keyframes for filters, volume, crop or text style.
- Transitions that need the *next* clip's frames (e.g. push-out), 3D cube /
  page-turn transitions, and GPU shader effects (glow, chromatic aberration).
- Ripple trim (trimming does not shift later clips).
- Chroma key, blend modes, audio EQ/compression, beat detection.
- Cloud media storage, sharing/collaboration, server-side rendering (the
  `Renderer` interface is ready for it; no backend is shipped).
- OAuth providers other than Google; magic-link sign-in.
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
| Unit | Vitest, 53 tests in 9 files | collision/placement, move (single + multi), trim start/end (source limits, speed, neighbours), split (trim/speed/keyframe continuity), duplicate/delete/ripple delete/close gaps, snapping, project factory, project normalisation and round-trip, clip source time, gains/fades/mutes, transition windows, crossfade adjacency, track ordering, keyframe interpolation/edit/shift/split helpers, WAV encoding, interleave, filter strings, export dimensions and formats, renderer registry, motion presets (entrance/exit/loop maths, clamping), filter strings incl. hue/blur, ducking envelope, keyframe easing, crop rectangles, time formatting | pass |
| E2E | Playwright + Chromium, real media generated with ffmpeg (VP9/Opus WebM, VP8 WebM, WAV, PNG), 7 specs in 5 files | (1) dashboard create / rename / reopen / delete; (2) HTML5 drag-and-drop from the library onto a chosen video/audio lane at a given time, dragging a clip to another lane; (3) full edit: import 4 files, add clips at the playhead, image overlay placed on a free upper track, inspector transform edits, title text with animation, music with fade-out, filters/adjustments/transition, split at playhead, delete + undo + redo, trim with the edge handle, move with snapping, duplicate, 2× speed, play preview and verify the canvas is painted, autosave status, reload with identical timeline and media restored, 480p MP4 export (WebCodecs engine, AAC muxed by FFmpeg.wasm) downloaded and probed: `h264` 854×480 + `aac`, 10.0 s; (4) 1:1 project exported as MP4 with the FFmpeg.wasm engine forced (libx264 in WebAssembly): `h264` 480×480 + `aac`, 4.0 s; (5) ripple delete, then WebM export (`vp9` 854×480 + `opus`, 5.0 s) and a GIF of a custom 1–3 s range (`gif` 854×480, 30 frames at 15 fps); (6) keyframes: scale keys at 0 s and 2 s, eased value 0.75 at 1 s, held value before the first key, preview overlay grows with the animation, split adds boundary keys, reset clears them; (7) effects verified by reading preview pixels: black & white look neutralises colour, vignette darkens edges but not the centre, circle transition reveals only a disc early on, Ken Burns zooms past the letterbox by the last frame, slide-in motion starts off-screen, 1:1 crop letterboxes the sides, circle mask and its inverse hide the right regions, per-letter text animations render, an audio track can be set to duck | in progress at commit time; final result in the PR |

**Manual checks in this environment**

- `npm run build` produces `dist/` (≈ 456 kB JS gzip 143 kB, FFmpeg core
  served from `/ffmpeg`).
- Exported MP4 verified with `ffprobe`: `h264` video stream at the requested
  resolution, `aac` audio stream, duration within 0.6 s of the sequence.

**Observed export performance in the test Chromium (4 vCPU, software only)**

| Engine | Content | Output | Wall time |
|---|---|---|---|
| WebCodecs (H.264) + FFmpeg.wasm AAC mux | 10 s, 5 clips incl. text + image + 2× speed | MP4 854×480, 892 KB | 11.8 s |
| FFmpeg.wasm (libx264 veryfast) | 4 s, video + audio + subtitle with wipe | MP4 480×480, 110 KB | 15.2 s |
| WebCodecs (VP9) + Opus | 5 s, video + audio | WebM 854×480, 1.3 MB | 20.3 s |
| FFmpeg.wasm (palettegen GIF) | 2 s range, 15 fps | GIF 854×480, 2.0 MB | 9.8 s |

**Not tested here**: AAC via WebCodecs `AudioEncoder` (not available in this
Chromium, so the AAC mux always went through FFmpeg.wasm; on Windows/macOS
Chrome the WebCodecs path is used end-to-end); Supabase cloud mode against a
live project (the repository/auth code is exercised only by unit-level
checks and typing); Windows desktop Chrome specifically.
