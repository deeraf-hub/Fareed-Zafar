/**
 * Owns HTMLVideoElement / HTMLImageElement instances for clips. Each video
 * clip gets its own element (the same asset can appear several times at
 * once); images are shared per asset.
 */
import type { ImageClip, VideoClip } from '@/types/project';
import { mediaRegistry } from '@/media/mediaRegistry';

export interface PooledVideo {
  el: HTMLVideoElement;
  assetId: string;
  ready: boolean;
  /** Set once the element has been wired into a Web Audio graph. */
  audioNode?: MediaElementAudioSourceNode;
  gain?: GainNode;
}

export class MediaPool {
  private videos = new Map<string, PooledVideo>();
  private images = new Map<string, HTMLImageElement>();

  constructor(private readonly options: { muted: boolean } = { muted: false }) {}

  video(clip: VideoClip): PooledVideo | null {
    const existing = this.videos.get(clip.id);
    if (existing && existing.assetId === clip.assetId) return existing;
    if (existing) this.releaseVideo(clip.id);
    const media = mediaRegistry.get(clip.assetId);
    if (!media) return null;
    const el = document.createElement('video');
    el.src = media.url;
    el.preload = 'auto';
    el.muted = this.options.muted;
    el.playsInline = true;
    el.crossOrigin = 'anonymous';
    (el as HTMLVideoElement & { disableRemotePlayback?: boolean }).disableRemotePlayback = true;
    const entry: PooledVideo = { el, assetId: clip.assetId, ready: false };
    const onReady = () => {
      entry.ready = true;
    };
    el.addEventListener('loadeddata', onReady, { once: true });
    el.load();
    this.videos.set(clip.id, entry);
    return entry;
  }

  image(clip: ImageClip): HTMLImageElement | null {
    const existing = this.images.get(clip.assetId);
    if (existing) return existing.complete && existing.naturalWidth > 0 ? existing : null;
    const media = mediaRegistry.get(clip.assetId);
    if (!media) return null;
    const img = new Image();
    img.src = media.url;
    this.images.set(clip.assetId, img);
    return img.complete && img.naturalWidth > 0 ? img : null;
  }

  async ensureImage(clip: ImageClip): Promise<HTMLImageElement | null> {
    const media = mediaRegistry.get(clip.assetId);
    if (!media) return null;
    let img = this.images.get(clip.assetId);
    if (!img) {
      img = new Image();
      img.src = media.url;
      this.images.set(clip.assetId, img);
    }
    if (!img.complete) {
      try {
        await img.decode();
      } catch {
        return null;
      }
    }
    return img.naturalWidth > 0 ? img : null;
  }

  releaseVideo(clipId: string): void {
    const v = this.videos.get(clipId);
    if (!v) return;
    v.el.pause();
    try {
      v.audioNode?.disconnect();
      v.gain?.disconnect();
    } catch {
      /* ignore */
    }
    v.el.removeAttribute('src');
    v.el.load();
    this.videos.delete(clipId);
  }

  /** Drop elements for clips that no longer exist. */
  prune(liveClipIds: Set<string>): void {
    for (const id of [...this.videos.keys()]) {
      if (!liveClipIds.has(id)) this.releaseVideo(id);
    }
  }

  allVideos(): PooledVideo[] {
    return [...this.videos.values()];
  }

  videoEntries(): [string, PooledVideo][] {
    return [...this.videos.entries()];
  }

  dispose(): void {
    for (const id of [...this.videos.keys()]) this.releaseVideo(id);
    this.images.clear();
  }
}

/** Resolve a seek on a media element. */
export function seekElement(el: HTMLMediaElement, time: number, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve) => {
    const target = Math.max(0, Math.min(time, isFinite(el.duration) ? Math.max(0, el.duration - 0.001) : time));
    if (Math.abs(el.currentTime - target) < 0.0005 && el.readyState >= 2) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener('seeked', finish);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    el.addEventListener('seeked', finish);
    try {
      el.currentTime = target;
    } catch {
      finish();
    }
  });
}

/** Wait until the element has enough data to render a frame. */
export function waitForReady(el: HTMLMediaElement, timeoutMs = 8000): Promise<boolean> {
  if (el.readyState >= 2) return Promise.resolve(true);
  return new Promise((resolve) => {
    const ok = () => {
      cleanup();
      resolve(true);
    };
    const bad = () => {
      cleanup();
      resolve(false);
    };
    const timer = setTimeout(bad, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      el.removeEventListener('loadeddata', ok);
      el.removeEventListener('canplay', ok);
      el.removeEventListener('error', bad);
    };
    el.addEventListener('loadeddata', ok);
    el.addEventListener('canplay', ok);
    el.addEventListener('error', bad);
  });
}
