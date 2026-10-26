// Copies the single-threaded FFmpeg.wasm core into public/ffmpeg so the app can
// load it from its own origin (no CDN dependency, works offline and on any
// static host). Runs on `npm install` (prepare) and is idempotent.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm');
const dest = join(root, 'public', 'ffmpeg');

if (!existsSync(src)) {
  console.warn('[copy-ffmpeg-core] @ffmpeg/core not installed yet, skipping');
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
for (const file of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
  copyFileSync(join(src, file), join(dest, file));
}
console.log('[copy-ffmpeg-core] copied ffmpeg core to public/ffmpeg');
