/**
 * Lazy singleton around @ffmpeg/ffmpeg. The ~32 MB single-threaded core is
 * served from this app's own origin (public/ffmpeg) so no CDN or
 * cross-origin isolation headers are required.
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;
let logSink: ((line: string) => void) | null = null;
let progressSink: ((ratio: number) => void) | null = null;

const base = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/ffmpeg`;

export function ffmpegAssetUrls(): { coreURL: string; wasmURL: string } {
  const origin = typeof location !== 'undefined' ? location.origin : '';
  return { coreURL: `${origin}${base}/ffmpeg-core.js`, wasmURL: `${origin}${base}/ffmpeg-core.wasm` };
}

export function setFfmpegSinks(log: ((line: string) => void) | null, progress: ((ratio: number) => void) | null): void {
  logSink = log;
  progressSink = progress;
}

export async function getFfmpeg(onLoadProgress?: (message: string) => void): Promise<FFmpeg> {
  if (instance) return instance;
  if (!loading) {
    loading = (async () => {
      onLoadProgress?.('Loading FFmpeg engine…');
      const ff = new FFmpeg();
      ff.on('log', ({ message }) => logSink?.(message));
      ff.on('progress', ({ progress }) => progressSink?.(progress));
      const ok = await ff.load(ffmpegAssetUrls());
      if (!ok) throw new Error('FFmpeg failed to load');
      instance = ff;
      return ff;
    })().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

/** Hard-stop the worker (used on cancel). The next call re-loads the core. */
export function terminateFfmpeg(): void {
  try {
    instance?.terminate();
  } catch {
    /* ignore */
  }
  instance = null;
  loading = null;
}

export async function safeDelete(ff: FFmpeg, path: string): Promise<void> {
  try {
    await ff.deleteFile(path);
  } catch {
    /* already gone */
  }
}

/** Stream-copy the video and encode the WAV mixdown into the container's native audio codec. */
export async function muxAudioInto(
  ff: FFmpeg,
  videoName: string,
  audioName: string,
  outName: string,
  format: 'mp4' | 'webm',
): Promise<Uint8Array> {
  const audioArgs = format === 'webm' ? ['-c:a', 'libopus', '-b:a', '128k'] : ['-c:a', 'aac', '-b:a', '192k'];
  const containerArgs = format === 'mp4' ? ['-movflags', '+faststart'] : [];
  const code = await ff.exec([
    '-y',
    '-i', videoName,
    '-i', audioName,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'copy',
    ...audioArgs,
    '-shortest',
    ...containerArgs,
    outName,
  ]);
  if (code !== 0) throw new Error(`FFmpeg mux failed (exit ${code})`);
  const data = await ff.readFile(outName);
  return data as Uint8Array;
}
