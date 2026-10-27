# Architecture

```
src/
  types/project.ts        Plain-JSON data model (Project, Track, Clip, MediaAsset)
  model/                  Pure logic: project factory, timeline ops, clip math
  store/                  Zustand stores (project + history, auth, UI)
  media/                  Import (probe, thumbnails), blob registry, waveform worker
  engine/                 Canvas compositor, media element pool, real-time Player,
                          offline audio mix
  export/                 Renderer interface + WebCodecs and FFmpeg.wasm renderers
  persistence/            IndexedDB (idb), Supabase client, Local/Cloud repositories
  hooks/                  autosave, project loader, keyboard shortcuts, player
  components/             UI (editor layout, timeline, preview, inspector, dialogs)
  pages/                  Landing, auth, dashboard, editor routes
```

## Data flow

1. **Import** (`media/importMedia.ts`): the `File` is stored as a Blob in
   IndexedDB, an object URL is registered in `mediaRegistry`, and the file is
   probed with `<video>`/`<audio>`/`<img>` elements for duration, size,
   thumbnail. Audio is decoded with `decodeAudioData` and peaks are computed in
   a Web Worker for the timeline waveform.
2. **Edit**: every timeline mutation goes through pure functions in
   `model/timelineOps.ts` and is committed by `store/projectStore.ts`, which
   pushes an undo entry (drag gestures call `beginGesture()` once and commit
   with `history:false`).
3. **Preview** (`engine/player.ts`): one `<video>` per video clip, one
   `<audio>` per audio clip, all routed through Web Audio gain nodes for
   volume/fades. A `requestAnimationFrame` loop keeps elements in sync with the
   master clock and calls `drawFrame()`.
4. **Export** (`export/`): `ExportFrameSource` seeks each element to the exact
   source time per frame and calls the same `drawFrame()`. Frames go to
   `VideoEncoder` (H.264) + `mp4-muxer`, or to FFmpeg.wasm (`libx264`) in
   90-frame segments that are concatenated with stream copy. Audio is mixed
   with an `OfflineAudioContext` and encoded to AAC by WebCodecs when the
   platform has an encoder, otherwise by FFmpeg.wasm.
5. **Persist**: `useAutosave` writes the project JSON to IndexedDB ~1 s after
   each change and, in cloud mode, upserts it to Supabase. On load the newer of
   the local draft and the cloud copy wins, so a reload never loses work.

## Replaceable rendering

`export/renderer.ts` is the only contract the UI knows about:

```ts
interface Renderer {
  id; label; description;
  isSupported(): Promise<boolean>;
  render(project, options): Promise<RenderResult>;
}
```

A server-side renderer would upload the project JSON plus the referenced
media, stream progress back and resolve with the downloaded file, without
touching the editor.
