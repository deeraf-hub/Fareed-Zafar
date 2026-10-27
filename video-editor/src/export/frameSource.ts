/**
 * Deterministic frame producer for export: for every output frame it seeks
 * each active video element to the exact source time, waits for the seek
 * to settle and then composites with the shared `drawFrame`.
 */
import type { ImageClip, Project, VideoClip } from '@/types/project';
import { clipSourceTime, isActive } from '@/model/clipMath';
import { drawFrame, type FrameSources } from '@/engine/compositor';
import { MediaPool, seekElement, waitForReady } from '@/engine/mediaPool';

export class ExportFrameSource implements FrameSources {
  private pool = new MediaPool({ muted: true });
  readonly canvas: HTMLCanvasElement | OffscreenCanvas;
  readonly ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  constructor(
    private readonly project: Project,
    readonly width: number,
    readonly height: number,
  ) {
    if (typeof OffscreenCanvas !== 'undefined') {
      this.canvas = new OffscreenCanvas(width, height);
      this.ctx = this.canvas.getContext('2d', { alpha: false }) as OffscreenCanvasRenderingContext2D;
    } else {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      this.canvas = c;
      this.ctx = c.getContext('2d', { alpha: false })!;
    }
  }

  getVisual(clip: VideoClip | ImageClip): CanvasImageSource | null {
    if (clip.kind === 'image') return this.pool.image(clip);
    const v = this.pool.video(clip);
    return v && v.el.readyState >= 2 ? v.el : null;
  }

  /** Preload every media element used in the export range. */
  async prepare(startTime: number, duration: number): Promise<void> {
    const end = startTime + duration;
    const tasks: Promise<unknown>[] = [];
    for (const clip of this.project.clips) {
      if (clip.start >= end || clip.start + clip.duration <= startTime) continue;
      if (clip.kind === 'video') {
        const v = this.pool.video(clip);
        if (v) tasks.push(waitForReady(v.el));
      } else if (clip.kind === 'image') {
        tasks.push(this.pool.ensureImage(clip));
      }
    }
    await Promise.all(tasks);
  }

  /** Seek + draw the frame for `time`. Resolves when the canvas holds the frame. */
  async renderFrame(time: number): Promise<void> {
    const seeks: Promise<void>[] = [];
    for (const clip of this.project.clips) {
      if (clip.kind !== 'video') continue;
      const track = this.project.tracks.find((t) => t.id === clip.trackId);
      if (track?.hidden) continue;
      // Also keep crossfade predecessors in sync (drawn past their end).
      const inRange = isActive(clip, time) || isCrossfadePredecessor(this.project, clip, time);
      if (!inRange) continue;
      const v = this.pool.video(clip);
      if (!v) continue;
      const want = Math.min(clipSourceTime(clip, time), Math.max(0, (v.el.duration || Infinity) - 0.001));
      if (Math.abs(v.el.currentTime - want) > 1 / 120 || v.el.readyState < 2) {
        seeks.push(seekElement(v.el, want));
      }
    }
    if (seeks.length) await Promise.all(seeks);
    drawFrame(this.ctx, this.project, time, this, { width: this.width, height: this.height });
  }

  dispose(): void {
    this.pool.dispose();
  }
}

function isCrossfadePredecessor(project: Project, clip: VideoClip, time: number): boolean {
  const end = clip.start + clip.duration;
  const next = project.clips.find(
    (c) =>
      c.trackId === clip.trackId &&
      c.id !== clip.id &&
      Math.abs(c.start - end) < 0.02 &&
      'transitionIn' in c &&
      c.transitionIn.type === 'crossfade',
  );
  if (!next || !('transitionIn' in next)) return false;
  return time >= next.start && time < next.start + Math.min(next.transitionIn.duration, next.duration);
}
