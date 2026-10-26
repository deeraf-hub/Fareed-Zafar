/**
 * Draws one frame of a project at a given time. Used by both the live
 * preview and the exporters so the output always matches the preview.
 */
import type { Crop, ImageClip, Mask, Project, TextClip, Track, TransitionType, VideoClip, VisualClip } from '@/types/project';
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
import { motionAt } from './motion';

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
  const W = project.settings.width;

  if (tin && (tin.transition.type === 'crossfade' || tin.transition.type === 'push')) {
    const prev = previousAdjacentClip(project, clip);
    if (prev && prev.kind !== 'audio') {
      // Draw the previous clip "extended" past its end under / beside the new one.
      const presence = easeInOut(tin.progress);
      const extraDx = tin.transition.type === 'push' ? -presence * W : 0;
      drawVisual(ctx, project, prev as VisualClip, time, sources, { alphaMul: 1, transition: null, extraDx });
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
  /** Extra horizontal offset in project pixels (push transitions). */
  extraDx?: number;
}

/** Fraction 0..1 of how "present" the clip is given its transition (1 = fully shown). */
function transitionPresence(t: ActiveTransition | null): number {
  if (!t) return 1;
  return t.direction === 'in' ? t.progress : 1 - t.progress;
}

type PathBuilder = (ctx: Ctx2D) => void;

/** Deterministic pseudo-random in [0,1) for grid cells (blocks transition). */
function cellHash(i: number, j: number): number {
  const v = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** Clip-path builders for reveal transitions, in project coordinates. */
function revealPath(type: TransitionType, dir: 'in' | 'out', presence: number, W: number, H: number): PathBuilder | null {
  const p = clamp(presence, 0, 1);
  switch (type) {
    case 'wipe': {
      const w = W * p;
      return (c) => c.rect(dir === 'in' ? 0 : W - w, 0, w, H);
    }
    case 'wipe-left': {
      const w = W * p;
      return (c) => c.rect(dir === 'in' ? W - w : 0, 0, w, H);
    }
    case 'wipe-up': {
      const h = H * p;
      return (c) => c.rect(0, dir === 'in' ? H - h : 0, W, h);
    }
    case 'wipe-down': {
      const h = H * p;
      return (c) => c.rect(0, dir === 'in' ? 0 : H - h, W, h);
    }
    case 'circle': {
      const r = p * Math.hypot(W / 2, H / 2);
      return (c) => c.arc(W / 2, H / 2, Math.max(0, r), 0, Math.PI * 2);
    }
    case 'blinds': {
      const n = 10;
      const sw = W / n;
      return (c) => {
        for (let i = 0; i < n; i++) c.rect(i * sw, 0, sw * p + 0.5, H);
      };
    }
    case 'blocks': {
      const cols = 10;
      const rows = 6;
      const cw = W / cols;
      const ch = H / rows;
      return (c) => {
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            if (cellHash(i, j) < p) c.rect(i * cw, j * ch, cw + 0.5, ch + 0.5);
          }
        }
      };
    }
    case 'clock': {
      const R = Math.hypot(W, H);
      const a0 = -Math.PI / 2;
      return (c) => {
        c.moveTo(W / 2, H / 2);
        c.arc(W / 2, H / 2, R, a0, a0 + Math.PI * 2 * p);
        c.closePath();
      };
    }
    default:
      return null;
  }
}

let noiseTile: HTMLCanvasElement | OffscreenCanvas | null = null;
const NOISE = 128;

/** Cached grayscale noise tile for the grain effect (deterministic). */
function getNoiseTile(): HTMLCanvasElement | OffscreenCanvas | null {
  if (noiseTile) return noiseTile;
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  if (typeof OffscreenCanvas !== 'undefined') canvas = new OffscreenCanvas(NOISE, NOISE);
  else if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    canvas.width = NOISE;
    canvas.height = NOISE;
  } else return null;
  const c = canvas.getContext('2d') as Ctx2D | null;
  if (!c) return null;
  const img = c.createImageData(NOISE, NOISE);
  let seed = 1234567;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const v = seed >>> 24;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  noiseTile = canvas;
  return canvas;
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
  const motion = motionAt(clip, time, W, H);
  let alpha = clamp(transform.opacity, 0, 1) * opts.alphaMul * motion.alpha;
  let dx = motion.dx + (opts.extraDx ?? 0);
  let dy = motion.dy;
  let extraScale = motion.scale;
  let scaleX = motion.scaleX;
  let rotation = transform.rotation + motion.rotation;
  let extraBlur = 0;
  let flash = 0;
  let clipPath: PathBuilder | null = null;

  if (t) {
    const dir = t.direction;
    const sign = dir === 'in' ? 1 : -1;
    const q = 1 - presence;
    switch (t.transition.type) {
      case 'fade':
      case 'crossfade':
        alpha *= presence;
        break;
      case 'push':
        dx += q * W;
        break;
      case 'slide':
        dx += -sign * q * W;
        break;
      case 'slide-right':
        dx += sign * q * W;
        break;
      case 'slide-up':
        dy += sign * q * H;
        break;
      case 'slide-down':
        dy += -sign * q * H;
        break;
      case 'zoom':
        extraScale *= 0.6 + 0.4 * presence;
        alpha *= presence;
        break;
      case 'spin':
        rotation += -sign * 180 * q;
        extraScale *= Math.max(0.01, presence);
        alpha *= Math.min(1, presence * 1.5);
        break;
      case 'flip':
        scaleX *= Math.max(0.01, presence);
        break;
      case 'blur':
        extraBlur = q * Math.max(W, H) * 0.02;
        alpha *= Math.min(1, presence * 1.5);
        break;
      case 'flash':
        flash = q;
        break;
      default:
        clipPath = revealPath(t.transition.type, dir, presence, W, H);
        break;
    }
  }
  if (alpha <= 0.001 && flash <= 0.001) return;

  ctx.save();
  if (clipPath) {
    ctx.beginPath();
    clipPath(ctx);
    ctx.clip();
  }
  ctx.globalAlpha = clamp(alpha, 0, 1);
  const cx = W / 2 + transform.x + dx;
  const cy = H / 2 + transform.y + dy;
  ctx.translate(cx, cy);
  if (rotation) ctx.rotate((rotation * Math.PI) / 180);
  const s = transform.scale * extraScale;
  ctx.scale(s * scaleX, s);

  if (clip.kind === 'text') {
    drawText(ctx, project, clip, time);
  } else {
    const src = sources.getVisual(clip, time);
    if (src) {
      const size = sourceSize(src);
      if (size.w > 0 && size.h > 0) {
        // Crop the source, then "contain" fit the remaining region at scale 1.
        const { sx, sy, sw, sh } = cropRect(size, clip.crop);
        const fit = Math.min(W / sw, H / sh);
        const dw = sw * fit;
        const dh = sh * fit;
        const filter = filterString(clip.adjust, extraBlur);
        if (clip.mask && clip.mask.shape !== 'none') {
          drawMaskedImage(ctx, src, sx, sy, sw, sh, dw, dh, clip.mask, filter);
        } else {
          ctx.filter = filter;
          ctx.drawImage(src, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
          ctx.filter = 'none';
        }
        drawEffects(ctx, clip, time, dw, dh);
      }
    } else {
      drawMissing(ctx, W, H, clip.name);
    }
  }
  ctx.restore();

  if (flash > 0.001) {
    ctx.save();
    ctx.globalAlpha = clamp(flash, 0, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

/** Source rectangle after applying the crop fractions. */
export function cropRect(size: { w: number; h: number }, crop?: Crop): { sx: number; sy: number; sw: number; sh: number } {
  if (!crop) return { sx: 0, sy: 0, sw: size.w, sh: size.h };
  const l = clamp(crop.left, 0, 0.95);
  const t = clamp(crop.top, 0, 0.95);
  const r = clamp(crop.right, 0, 0.95);
  const b = clamp(crop.bottom, 0, 0.95);
  const sw = size.w * Math.max(0.02, 1 - l - r);
  const sh = size.h * Math.max(0.02, 1 - t - b);
  return { sx: size.w * l, sy: size.h * t, sw, sh };
}

interface Scratch {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: Ctx2D;
}
let scratch: Scratch | null = null;

/** A reusable offscreen canvas at least w×h pixels (for masks). */
function getScratch(w: number, h: number): Scratch | null {
  const cw = Math.max(1, Math.ceil(w));
  const ch = Math.max(1, Math.ceil(h));
  if (!scratch) {
    let canvas: HTMLCanvasElement | OffscreenCanvas;
    if (typeof OffscreenCanvas !== 'undefined') canvas = new OffscreenCanvas(cw, ch);
    else if (typeof document !== 'undefined') canvas = document.createElement('canvas');
    else return null;
    const c = canvas.getContext('2d') as Ctx2D | null;
    if (!c) return null;
    scratch = { canvas, ctx: c };
  }
  if (scratch.canvas.width < cw || scratch.canvas.height < ch) {
    scratch.canvas.width = Math.max(scratch.canvas.width, cw);
    scratch.canvas.height = Math.max(scratch.canvas.height, ch);
  }
  return scratch;
}

/** Build the mask shape path centred on the clip's drawn rectangle (origin at its top-left). */
function maskPath(c: Ctx2D, mask: Mask, dw: number, dh: number): void {
  const size = clamp(mask.size, 0.02, 1);
  const cx = dw / 2 + clamp(mask.x, -0.5, 0.5) * dw;
  const cy = dh / 2 + clamp(mask.y, -0.5, 0.5) * dh;
  c.save();
  c.translate(cx, cy);
  if (mask.rotation) c.rotate((mask.rotation * Math.PI) / 180);
  c.beginPath();
  switch (mask.shape) {
    case 'rectangle':
      c.rect((-dw * size) / 2, (-dh * size) / 2, dw * size, dh * size);
      break;
    case 'rounded': {
      const w = dw * size;
      const h = dh * size;
      roundRect(c, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.2);
      break;
    }
    case 'circle':
      c.arc(0, 0, (Math.min(dw, dh) / 2) * size, 0, Math.PI * 2);
      break;
    case 'ellipse':
      c.ellipse(0, 0, (dw / 2) * size, (dh / 2) * size, 0, 0, Math.PI * 2);
      break;
    case 'linear':
      // Everything left of the edge; `size` moves the edge across the width.
      c.rect(-3 * dw, -3 * dh, 3 * dw + (size - 0.5) * dw, 6 * dh);
      break;
    default:
      c.rect(-dw, -dh, dw * 2, dh * 2);
  }
  c.restore();
}

/** Draw a cropped image through a (possibly feathered) mask using an offscreen canvas. */
function drawMaskedImage(
  ctx: Ctx2D,
  src: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  mask: Mask,
  filter: string,
): void {
  const s = getScratch(dw, dh);
  if (!s) {
    ctx.filter = filter;
    ctx.drawImage(src, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
    ctx.filter = 'none';
    return;
  }
  const oc = s.ctx;
  oc.setTransform(1, 0, 0, 1, 0, 0);
  oc.globalCompositeOperation = 'source-over';
  oc.globalAlpha = 1;
  oc.filter = 'none';
  oc.clearRect(0, 0, s.canvas.width, s.canvas.height);
  oc.filter = filter;
  oc.drawImage(src, sx, sy, sw, sh, 0, 0, dw, dh);
  oc.filter = 'none';
  oc.globalCompositeOperation = mask.invert ? 'destination-out' : 'destination-in';
  const featherPx = clamp(mask.feather, 0, 1) * Math.min(dw, dh) * 0.15;
  if (featherPx > 0.5) oc.filter = `blur(${featherPx.toFixed(1)}px)`;
  oc.fillStyle = '#ffffff';
  maskPath(oc, mask, dw, dh);
  oc.fill();
  oc.filter = 'none';
  oc.globalCompositeOperation = 'source-over';
  ctx.drawImage(s.canvas, 0, 0, Math.ceil(dw), Math.ceil(dh), -dw / 2, -dh / 2, Math.ceil(dw), Math.ceil(dh));
}

/** Vignette and grain, drawn over the clip's image rectangle (local coordinates). */
function drawEffects(ctx: Ctx2D, clip: VideoClip | ImageClip, time: number, dw: number, dh: number): void {
  const { vignette, grain } = clip.adjust;
  if (vignette > 0.001) {
    const r = Math.hypot(dw, dh) / 2;
    const g = ctx.createRadialGradient(0, 0, r * 0.35, 0, 0, r);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${clamp(vignette, 0, 1).toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
  }
  if (grain > 0.001) {
    const tile = getNoiseTile();
    if (tile) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-dw / 2, -dh / 2, dw, dh);
      ctx.clip();
      ctx.globalAlpha *= clamp(grain, 0, 1) * 0.45;
      ctx.globalCompositeOperation = 'overlay';
      // Jitter the tile per frame so the grain flickers like film.
      const frame = Math.floor(time * 60);
      const ox = (frame * 37) % NOISE;
      const oy = (frame * 53) % NOISE;
      const scale = Math.max(1, Math.round(Math.max(dw, dh) / 640));
      const step = NOISE * scale;
      for (let y = -dh / 2 - oy * scale; y < dh / 2; y += step) {
        for (let x = -dw / 2 - ox * scale; x < dw / 2; x += step) {
          ctx.drawImage(tile, x, y, step, step);
        }
      }
      ctx.restore();
    }
  }
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

const PER_CHAR_ANIMATIONS = new Set(['wave', 'rise', 'glitch']);

function easeOutCubic(p: number): number {
  return 1 - Math.pow(1 - p, 3);
}
function easeOutBounce(p: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (p < 1 / d1) return n1 * p * p;
  if (p < 2 / d1) return n1 * (p -= 1.5 / d1) * p + 0.75;
  if (p < 2.5 / d1) return n1 * (p -= 2.25 / d1) * p + 0.9375;
  return n1 * (p -= 2.625 / d1) * p + 0.984375;
}
function hash2(a: number, b: number): number {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

interface CharOffset {
  dx: number;
  dy: number;
  alpha: number;
  /** Draw colour-split ghost copies (glitch). */
  split?: number;
}

function drawText(ctx: Ctx2D, project: Project, clip: TextClip, time: number): void {
  const st = clip.style;
  const W = project.settings.width;
  const local = time - clip.start;
  const remaining = clipEnd(clip) - time;
  const animDur = Math.min(TEXT_ANIM_SECONDS, clip.duration / 2);
  let text = st.uppercase ? clip.text.toUpperCase() : clip.text;
  let alpha = 1;
  let dy = 0;
  let sc = 1;
  let rot = 0;
  let blur = 0;
  const pIn = clamp(local / animDur, 0, 1);
  const pOut = clamp(remaining / animDur, 0, 1);
  const perChar = PER_CHAR_ANIMATIONS.has(clip.animation);
  if (clip.animation !== 'none' && !perChar) {
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
        text = text.slice(0, chars);
        alpha = pOut;
        break;
      }
      case 'bounce':
        alpha = Math.min(1, pIn * 3) * pOut;
        sc = pIn < 1 ? Math.max(0.01, easeOutBounce(pIn)) : 1;
        break;
      case 'zoom':
        alpha = Math.min(pIn, pOut);
        sc = pIn < 1 ? 1.6 - 0.6 * easeOutCubic(pIn) : pOut < 1 ? 1 + 0.6 * (1 - pOut) : 1;
        break;
      case 'spin':
        alpha = Math.min(pIn, pOut);
        rot = pIn < 1 ? (1 - easeOutCubic(pIn)) * 180 : pOut < 1 ? -(1 - pOut) * 180 : 0;
        sc = pIn < 1 ? 0.3 + 0.7 * easeOutCubic(pIn) : 1;
        break;
      case 'blur':
        alpha = Math.min(pIn, pOut);
        blur = Math.max(1 - pIn, 1 - pOut) * st.fontSize * 0.35;
        break;
      default:
        break;
    }
  } else if (perChar) {
    // Per-character animations fade the whole block out; entrance is per character.
    alpha = clip.animation === 'wave' ? Math.min(pIn, pOut) : pOut;
  }
  if (alpha <= 0.001 || !text) return;

  ctx.save();
  ctx.globalAlpha *= clamp(alpha, 0, 1);
  ctx.translate(0, dy);
  if (rot) ctx.rotate((rot * Math.PI) / 180);
  ctx.scale(sc, sc);
  if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
  ctx.font = fontString(clip);
  ctx.textBaseline = 'middle';
  const spacing = st.letterSpacing ?? 0;
  const styled = ctx as Ctx2D & { letterSpacing?: string };
  if ('letterSpacing' in styled) styled.letterSpacing = `${spacing}px`;
  ctx.textAlign = 'left';
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
    roundRect(ctx, -blockW / 2 - pad, -totalH / 2 - pad * 0.6, blockW + pad * 2, totalH + pad * 1.2, pad * 0.5);
    ctx.fill();
    ctx.restore();
  }

  let fill: string | CanvasGradient = st.color;
  if (st.gradientTo) {
    const g = ctx.createLinearGradient(0, -totalH / 2, 0, totalH / 2);
    g.addColorStop(0, st.color);
    g.addColorStop(1, st.gradientTo);
    fill = g;
  }
  const strokeOn = Boolean(st.stroke && st.strokeWidth > 0);
  const applyShadow = () => {
    if (st.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = st.fontSize * 0.15;
      ctx.shadowOffsetX = st.fontSize * 0.04;
      ctx.shadowOffsetY = st.fontSize * 0.06;
    }
  };
  const clearShadow = () => {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  };
  const drawGlyphs = (str: string, x: number, y: number) => {
    applyShadow();
    if (strokeOn) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = st.strokeWidth * 2;
      ctx.strokeStyle = st.stroke;
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
    clearShadow();
  };

  let charIndex = 0;
  lines.forEach((line, i) => {
    const y = -totalH / 2 + lineH * (i + 0.5);
    const lw = widths[i];
    const x0 = st.align === 'left' ? -blockW / 2 : st.align === 'right' ? blockW / 2 - lw : -lw / 2;
    if (!perChar) {
      drawGlyphs(line, x0, y);
      return;
    }
    let x = x0;
    for (const ch of Array.from(line)) {
      const w = ctx.measureText(ch).width;
      const off = charOffset(clip, charIndex, local, animDur, time);
      if (off.alpha > 0.001) {
        ctx.save();
        ctx.globalAlpha *= clamp(off.alpha, 0, 1);
        if (off.split) {
          ctx.save();
          ctx.globalAlpha *= 0.5;
          ctx.fillStyle = '#ff2a6d';
          ctx.fillText(ch, x + off.dx - off.split, y + off.dy);
          ctx.fillStyle = '#05d9e8';
          ctx.fillText(ch, x + off.dx + off.split, y + off.dy);
          ctx.restore();
        }
        drawGlyphs(ch, x + off.dx, y + off.dy);
        ctx.restore();
      }
      x += w;
      charIndex++;
    }
    charIndex++; // line break counts as a character for staggering
  });
  ctx.restore();
}

function charOffset(clip: TextClip, i: number, local: number, animDur: number, time: number): CharOffset {
  const fs = clip.style.fontSize;
  switch (clip.animation) {
    case 'wave':
      return { dx: 0, dy: Math.sin(local * 4 + i * 0.6) * fs * 0.15, alpha: 1 };
    case 'rise': {
      const p = clamp((local - i * 0.04) / Math.max(0.15, animDur * 0.7), 0, 1);
      return { dx: 0, dy: (1 - easeOutCubic(p)) * fs * 0.9, alpha: p };
    }
    case 'glitch': {
      const frame = Math.floor(time * 30);
      const burst = hash2(frame, 7) < 0.25; // glitch bursts on ~25% of frames
      const hit = burst && hash2(frame, i + 1) < 0.5;
      const entering = clamp(local / Math.max(0.15, animDur), 0, 1);
      if (!hit) return { dx: 0, dy: 0, alpha: entering };
      return {
        dx: (hash2(frame + 3, i) - 0.5) * fs * 0.4,
        dy: (hash2(frame + 5, i) - 0.5) * fs * 0.15,
        alpha: entering,
        split: fs * 0.06,
      };
    }
    default:
      return { dx: 0, dy: 0, alpha: 1 };
  }
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
