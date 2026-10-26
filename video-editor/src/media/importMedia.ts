import type { MediaAsset, MediaKind } from '@/types/project';
import { LIMITS } from '@/config/limits';
import { newId } from '@/lib/id';
import { localDb } from '@/persistence/localDb';
import { mediaRegistry } from './mediaRegistry';
import { computeWaveform, decodeAudio } from './audioDecode';

const VIDEO_EXT = /\.(mp4|m4v|webm|mov|mkv|ogv|avi)$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba)$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i;

export function detectKind(file: File): MediaKind | null {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('image/')) return 'image';
  if (VIDEO_EXT.test(file.name)) return 'video';
  if (AUDIO_EXT.test(file.name)) return 'audio';
  if (IMAGE_EXT.test(file.name)) return 'image';
  return null;
}

export class ImportError extends Error {}

interface Probe {
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
  thumbnail?: string;
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new ImportError(`${what} timed out. The file may use an unsupported codec.`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function drawThumb(source: CanvasImageSource, w: number, h: number): string {
  const tw = 192;
  const th = Math.max(1, Math.round((tw * h) / w));
  const c = document.createElement('canvas');
  c.width = tw;
  c.height = th;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(source, 0, 0, tw, th);
  return c.toDataURL('image/jpeg', 0.7);
}

async function probeVideo(url: string): Promise<Probe> {
  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'auto';
  video.src = url;
  const loaded = new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new ImportError('This video cannot be decoded by your browser.'));
  });
  await withTimeout(loaded, 20000, 'Reading video metadata');
  const duration = isFinite(video.duration) ? video.duration : 0;
  // Grab a frame a little way in for a representative thumbnail.
  const seekTo = Math.min(Math.max(0.1, duration * 0.1), Math.max(0, duration - 0.05));
  const seeked = new Promise<void>((resolve) => {
    video.onseeked = () => resolve();
  });
  video.currentTime = seekTo;
  try {
    await withTimeout(seeked, 10000, 'Seeking video');
  } catch {
    /* thumbnail is optional */
  }
  let thumbnail: string | undefined;
  if (video.videoWidth > 0) {
    try {
      thumbnail = drawThumb(video, video.videoWidth, video.videoHeight);
    } catch {
      /* ignore */
    }
  }
  const v = video as HTMLVideoElement & { mozHasAudio?: boolean; webkitAudioDecodedByteCount?: number; audioTracks?: unknown[] };
  const hasAudio =
    v.mozHasAudio === true ||
    (typeof v.webkitAudioDecodedByteCount === 'number' && v.webkitAudioDecodedByteCount > 0) ||
    (Array.isArray(v.audioTracks) && v.audioTracks.length > 0);
  video.removeAttribute('src');
  video.load();
  return { duration, width: video.videoWidth, height: video.videoHeight, hasAudio, thumbnail };
}

async function probeAudio(url: string): Promise<Probe> {
  const audio = document.createElement('audio');
  audio.preload = 'metadata';
  audio.src = url;
  const loaded = new Promise<void>((resolve, reject) => {
    audio.onloadedmetadata = () => resolve();
    audio.onerror = () => reject(new ImportError('This audio file cannot be decoded by your browser.'));
  });
  await withTimeout(loaded, 20000, 'Reading audio metadata');
  const duration = isFinite(audio.duration) ? audio.duration : 0;
  audio.removeAttribute('src');
  audio.load();
  return { duration, width: 0, height: 0, hasAudio: true };
}

async function probeImage(url: string): Promise<Probe> {
  const img = new Image();
  img.src = url;
  await withTimeout(img.decode(), 20000, 'Decoding image');
  return {
    duration: 0,
    width: img.naturalWidth,
    height: img.naturalHeight,
    hasAudio: false,
    thumbnail: drawThumb(img, img.naturalWidth, img.naturalHeight),
  };
}

export interface ImportResult {
  asset: MediaAsset;
  /** Resolves later with the waveform (if any); callers can patch the asset. */
  waveform: Promise<number[] | null>;
}

/**
 * Import a local file: validate, store the Blob in IndexedDB, register an
 * object URL, probe metadata and produce a MediaAsset. Nothing is uploaded.
 */
export async function importFile(file: File, opts: { existingId?: string } = {}): Promise<ImportResult> {
  const kind = detectKind(file);
  if (!kind) throw new ImportError(`"${file.name}" is not a supported video, audio or image file.`);
  if (file.size > LIMITS.maxImportFileBytes) {
    throw new ImportError(`"${file.name}" is larger than the ${Math.round(LIMITS.maxImportFileBytes / 1048576)} MB import limit.`);
  }
  const id = opts.existingId ?? newId('asset');
  const { url } = mediaRegistry.register(id, file);
  let probe: Probe;
  try {
    probe = kind === 'video' ? await probeVideo(url) : kind === 'audio' ? await probeAudio(url) : await probeImage(url);
  } catch (e) {
    mediaRegistry.release(id);
    throw e;
  }
  if (kind !== 'image' && probe.duration <= 0) {
    mediaRegistry.release(id);
    throw new ImportError(`Could not determine the duration of "${file.name}".`);
  }
  await localDb.putMedia(id, file, file.name);

  const asset: MediaAsset = {
    id,
    name: file.name,
    kind,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    duration: Math.round(probe.duration * 1000) / 1000,
    width: probe.width,
    height: probe.height,
    hasAudio: kind === 'audio' ? true : probe.hasAudio,
    thumbnail: probe.thumbnail,
    addedAt: Date.now(),
  };

  const waveform =
    kind === 'image'
      ? Promise.resolve<number[] | null>(null)
      : decodeAudio(id, file).then(async (buffer) => {
          if (!buffer) return null;
          return computeWaveform(buffer);
        });
  // A decodable audio track means the video has audio even if the element
  // did not report it (Chrome exposes no reliable flag before playback).
  if (kind === 'video') {
    waveform.then((w) => {
      if (w && w.some((v) => v > 0)) asset.hasAudio = true;
    });
  }
  return { asset, waveform };
}

/** Re-hydrate object URLs for a project's assets from IndexedDB. Returns ids that are missing. */
export async function restoreProjectMedia(assetIds: string[]): Promise<string[]> {
  const missing: string[] = [];
  await Promise.all(
    assetIds.map(async (id) => {
      if (mediaRegistry.has(id)) return;
      const row = await localDb.getMedia(id);
      if (row) mediaRegistry.register(id, row.blob);
      else missing.push(id);
    }),
  );
  return missing;
}
