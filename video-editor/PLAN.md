# Framewright – build plan

Browser-based video editor (CapCut-Web-inspired, original implementation).
Stack: React 19 + TypeScript + Vite + Tailwind, Zustand, Canvas 2D compositor,
Web Audio, Web Workers, WebCodecs (when available) + FFmpeg.wasm export,
Supabase Auth/Postgres (optional, local mode when not configured).

## Stages

| Stage | Scope | Status |
|-------|-------|--------|
| 1 | App shell, routing, dark editor layout, Zustand store, project model | done |
| 2 | Media import (video/audio/image), IndexedDB blob storage, thumbnails, waveforms (worker), media library drag source | done |
| 3 | Multi-track timeline: drag-and-drop, move across tracks, trim handles, split, duplicate, delete, snapping, zoom, undo/redo | done |
| 4 | Canvas preview of the real sequence, text/title/subtitle clips, image overlays, transforms, filters, transitions, speed, Web Audio mixing with volume + fades | done |
| 5 | MP4 export: replaceable `Renderer` interface, WebCodecs+mp4-muxer fast path, FFmpeg.wasm fallback, audio mix via OfflineAudioContext, progress + cancel | done |
| 6 | Supabase email/password auth, protected dashboard, cloud project CRUD, autosave + reload recovery, local-project mode | done |
| 7 | Unit tests (Vitest), browser E2E with real media (Playwright + ffprobe), CI, Cloudflare Pages deployment, docs | done |

## Key design decisions

- **Media stays local.** Imported files are stored as Blobs in the browser's
  IndexedDB (origin-local) so a project survives reloads. Nothing is uploaded.
- **Project = JSON.** Only metadata/settings/timeline JSON is persisted to
  Supabase (or IndexedDB in local mode). Media is referenced by id + name +
  size; missing media can be re-linked by importing the same file again.
- **One compositor for preview and export.** `engine/compositor.ts` draws a
  frame for any timeline time onto any CanvasRenderingContext2D. The preview
  player and both renderers call the same function, so what you see is what
  you export.
- **Replaceable rendering.** `export/renderer.ts` defines `Renderer`;
  `WebCodecsRenderer` and `FfmpegRenderer` implement it. A future
  `RemoteRenderer` (server-side) can be plugged in without UI changes.
