/**
 * Draws one frame of a project at a given time. Used by both the live
 * preview and the exporters so the output always matches the preview.
 */
import type { ImageClip, Project, TextClip, Track, VideoClip, VisualClip } from '@/types/project';
import {
  activeClipOnTrack,
  easeInOut,
  easeOutBack,
  previousAdjacentClip,
  transformAt,
  transitionInState,
  transitionOutState,
  visualTracksBottomUp,
  type TransitionState,
} from '@/model/clipMath';
import { clipEnd } from '@/model/project';
import { clamp } from '@/lib/time';
import { filterString } from './filters';

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface FrameSources {
  /** Returns a drawable for a media clip at the given timeline time, or null if not ready/missing. */
  getVisual(clip: VideoClip | ImageClip, time: number): CanvasImageSource | null;
}

export interface DrawOptions {
  /** Output size in pixels. Project coordinates are scaled to fit. */
  width: number;
  height: number;
}

const TEXT_ANIM_SECONDS = 0.5;

export function drawFrame(ctx: Ctx2D, project: Project, time: number, sources: FrameSources, opts: DrawOptions): void {
  const { width, height } = opts;
  const scale = width / project.settings.width;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.fillStyle = project.settings.background || '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.scale(scale, scale);

  for (const track of visualTracksBottomUp(project)) {
    const clip = activeClipOnTrack(project, track.id, time) as VisualClip | undefined;
    if (!clip) {
      // A clip whose transitionOut is a crossfade could be drawn here, but
      // crossfades are modelled on the incoming clip only (see clipMath).
      continue;
    }
    drawClipWithTransitions(ctx, project, track, clip, time, sources);
  }
  ctx.restore();
}

function drawClipWithTransitions(
  ctx: Ctx2D,
  project: Project,
  _track: Track,
  clip: VisualClip,
  time: number,
  sources: FrameSources,
): void {
  const tin = transitionInState(clip, time);
  const tout = transitionOutState(clip, time);

  if (tin?.transition.type === 'crossfade') {
    const prev = previousAdjacentClip(project, clip);
    if (prev && prev.kind !== 'audio') {
      // Draw the previous clip "extended" past its end under the new one.
      drawVisual(ctx, project, prev as VisualClip, time, sources, { alphaMul: 1, transition: null });
    }
  }

  const transition: ActiveTransition | null = tin
    ? { ...tin, direction: 'in' }
    : tout
      ? { ...tout, direction: 'out' }
      : null;
  drawVisual(ctx, project, clip, time, sources, { alphaMul: 1, transition });
}

interface ActiveTransition extends TransitionState {
  direction: 'in' | 'out';
}

interface DrawVisualOpts {
  alphaMul: number;
  transition: ActiveTransition | null;
}

/** Fraction 0..1 of how "present" the clip is given its transition (1 = fully shown). */
function transitionPresence(t: ActiveTransition | null): number {
  if (!t) return 1;
  return t.direction === 'in' ? t.progress : 1 - t.progress;
}

function drawVisual(
  ctx: Ctx2D,
  project: Project,
  clip: VisualClip,
  time: number,
  sources: FrameSources,
  opts: DrawVisualOpts,
): void {
  const W = project.settings.width;
  const H = project.settings.height;
  const t = opts.transition;
  const presence = easeInOut(transitionPresence(t));
  const transform = transformAt(clip, time);
  let alpha = clamp(transform.opacity, 0, 1) * opts.alphaMul;
  let dx = 0;
  let extraScale = 1;
  let clipRect: { x: number; y: number; w: number; h: number } | null = null;

  if (t) {
    switch (t.transition.type) {
      case 'fade':
      case 'crossfade':
        alpha *= presence;
        break;
      case 'slide':
        dx = (t.direction === 'in' ? -1 : 1) * (1 - presence) * W;
        break;
      case 'zoom':
        extraScale = 0.6 + 0.4 * presence;
        alpha *= presence;
        break;
      case 'wipe': {
        const w = W * presence;
        clipRect = t.direction === 'in' ? { x: 0, y: 0, w, h: H } : { x: W - w, y: 0, w, h: H };
        break;
      }
      default:
        break;
    }
  }
  if (alpha <= 0.001) return;

  ctx.save();
  if (clipRect) {
    ctx.beginPath();
    ctx.rect(clipRect.x, clipRect.y, clipRect.w, clipRect.h);
    ctx.clip();
  }
  ctx.globalAlpha = clamp(alpha, 0, 1);
  const cx = W / 2 + transform.x + dx;
  const cy = H / 2 + transform.y;
  ctx.translate(cx, cy);
  if (transform.rotation) ctx.rotate((transform.rotation * Math.PI) / 180);
  const s = transform.scale * extraScale;
  ctx.scale(s, s);

  if (clip.kind === 'text') {
    drawText(ctx, project, clip, time);
  } else {
    const src = sources.getVisual(clip, time);
    if (src) {
      const size = sourceSize(src);
      if (size.w > 0 && size.h > 0) {
        // "Contain" fit into the project frame at scale 1.
        const fit = Math.min(W / size.w, H / size.h);
        const dw = size.w * fit;
        const dh = size.h * fit;
        ctx.filter = filterString(clip.adjust);
        ctx.drawImage(src, -dw / 2, -dh / 2, dw, dh);
        ctx.filter = 'none';
      }
    } else {
      drawMissing(ctx, W, H, clip.name);
    }
  }
  ctx.restore();
}

function sourceSize(src: CanvasImageSource): { w: number; h: number } {
  if (typeof HTMLVideoElement !== 'undefined' && src instanceof HTMLVideoElement) {
    return { w: src.videoWidth, h: src.videoHeight };
  }
  if (typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement) {
    return { w: src.naturalWidth, h: src.naturalHeight };
  }
  const any = src as { width?: number; height?: number; displayWidth?: number; displayHeight?: number };
  return { w: any.displayWidth ?? any.width ?? 0, h: any.displayHeight ?? any.height ?? 0 };
}

function drawMissing(ctx: Ctx2D, W: number, H: number, name: string): void {
  ctx.fillStyle = '#2a2f3a';
  ctx.fillRect(-W / 2, -H / 2, W, H);
  ctx.fillStyle = '#9aa3b5';
  ctx.font = `${Math.round(H * 0.04)}px Inter, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Media not available: ${name}`, 0, 0);
}

export function fontString(clip: TextClip): string {
  const st = clip.style;
  return `${st.italic ? 'italic ' : ''}${st.bold ? '700 ' : '400 '}${st.fontSize}px ${st.fontFamily}`;
}

export function wrapText(ctx: Ctx2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const test = `${line} ${words[i]}`;
      if (ctx.measureText(test).width <= maxWidth) line = test;
      else {
        lines.push(line);
        line = words[i];
      }
    }
    lines.push(line);
  }
  return lines;
}

function drawText(ctx: Ctx2D, project: Project, clip: TextClip, time: number): void {
  const st = clip.style;
  const W = project.settings.width;
  const local = time - clip.start;
  const remaining = clipEnd(clip) - time;
  const animDur = Math.min(TEXT_ANIM_SECONDS, clip.duration / 2);
  let text = clip.text;
  let alpha = 1;
  let dy = 0;
  let sc = 1;
  if (clip.animation !== 'none') {
    const pIn = clamp(local / animDur, 0, 1);
    const pOut = clamp(remaining / animDur, 0, 1);
    switch (clip.animation) {
      case 'fade':
        alpha = Math.min(pIn, pOut);
        break;
      case 'slide-up':
        alpha = Math.min(pIn, pOut);
        dy = (1 - easeInOut(pIn)) * st.fontSize * 1.5 - (1 - easeInOut(pOut)) * st.fontSize * 1.5;
        break;
      case 'pop':
        alpha = Math.min(pIn, pOut);
        sc = pIn < 1 ? easeOutBack(pIn) : pOut < 1 ? 0.8 + 0.2 * pOut : 1;
        break;
      case 'typewriter': {
        const chars = Math.ceil(clip.text.length * clamp(local / Math.min(clip.duration * 0.6, 2.5), 0, 1));
        text = clip.text.slice(0, chars);
        alpha = pOut;
        break;
      }
    }
  }
  if (alpha <= 0.001 || !text) return;

  ctx.save();
  ctx.globalAlpha *= clamp(alpha, 0, 1);
  ctx.translate(0, dy);
  ctx.scale(sc, sc);
  ctx.font = fontString(clip);
  ctx.textBaseline = 'middle';
  ctx.textAlign = st.align;
  const maxWidth = W * clamp(st.maxWidth, 0.1, 1);
  const lines = wrapText(ctx, text, maxWidth);
  const lineH = st.fontSize * st.lineHeight;
  const totalH = lineH * lines.length;
  const widths = lines.map((l) => ctx.measureText(l).width);
  const blockW = Math.max(...widths, 0);
  const pad = st.fontSize * 0.35;

  if (st.background) {
    ctx.save();
    ctx.globalAlpha *= clamp(st.backgroundOpacity, 0, 1);
    ctx.fillStyle = st.background;
    const bx = st.align === 'left' ? -blockW / 2 : st.align === 'right' ? -blockW / 2 : -blockW / 2;
    roundRect(ctx, bx - pad, -totalH / 2 - pad * 0.6, blockW + pad * 2, totalH + pad * 1.2, pad * 0.5);
    ctx.fill();
    ctx.restore();
  }

  const xForAlign = st.align === 'left' ? -blockW / 2 : st.align === 'right' ? blockW / 2 : 0;
  lines.forEach((line, i) => {
    const y = -totalH / 2 + lineH * (i + 0.5);
    if (st.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = st.fontSize * 0.15;
      ctx.shadowOffsetX = st.fontSize * 0.04;
      ctx.shadowOffsetY = st.fontSize * 0.06;
    }
    if (st.stroke && st.strokeWidth > 0) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = st.strokeWidth * 2;
      ctx.strokeStyle = st.stroke;
      ctx.strokeText(line, xForAlign, y);
    }
    ctx.fillStyle = st.color;
    ctx.fillText(line, xForAlign, y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  });
  ctx.restore();
}

function roundRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Bounding box of a clip in project pixels (for selection outlines in the preview). */
export function clipBounds(
  project: Project,
  clip: VisualClip,
  time: number,
  sourceSizeFor: (clip: VideoClip | ImageClip) => { w: number; h: number } | null,
  measure?: Ctx2D,
): { x: number; y: number; w: number; h: number } | null {
  const W = project.settings.width;
  const H = project.settings.height;
  let w: number;
  let h: number;
  if (clip.kind === 'text') {
    if (!measure) return null;
    measure.save();
    measure.font = fontString(clip);
    const lines = wrapText(measure, clip.text, W * clip.style.maxWidth);
    w = Math.max(...lines.map((l) => measure.measureText(l).width), 1) + clip.style.fontSize * 0.7;
    h = clip.style.fontSize * clip.style.lineHeight * lines.length + clip.style.fontSize * 0.4;
    measure.restore();
  } else {
    const size = sourceSizeFor(clip);
    if (!size || size.w === 0) return null;
    const fit = Math.min(W / size.w, H / size.h);
    w = size.w * fit;
    h = size.h * fit;
  }
  const transform = transformAt(clip, time);
  const s = transform.scale;
  return {
    x: W / 2 + transform.x - (w * s) / 2,
    y: H / 2 + transform.y - (h * s) / 2,
    w: w * s,
    h: h * s,
  };
}
