/**
 * Motion presets: entrance/exit animations and looping effects applied on
 * top of a clip's transform. Pure functions of time so preview and export
 * agree frame for frame.
 */
import type { Motion, MotionInOut, MotionLoop, VisualClip } from '@/types/project';
import { clamp } from '@/lib/time';

export interface MotionOffsets {
  /** Project pixels. */
  dx: number;
  dy: number;
  /** Multipliers. */
  scale: number;
  scaleX: number;
  /** Degrees, added. */
  rotation: number;
  /** Multiplier 0..1. */
  alpha: number;
}

export const IDENTITY: MotionOffsets = { dx: 0, dy: 0, scale: 1, scaleX: 1, rotation: 0, alpha: 1 };

export const MOTION_IN_OUT: { id: MotionInOut; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade' },
  { id: 'zoom-in', label: 'Zoom in' },
  { id: 'zoom-out', label: 'Zoom out' },
  { id: 'slide-left', label: 'Slide from right' },
  { id: 'slide-right', label: 'Slide from left' },
  { id: 'slide-up', label: 'Slide from bottom' },
  { id: 'slide-down', label: 'Slide from top' },
  { id: 'spin', label: 'Spin' },
  { id: 'bounce', label: 'Bounce' },
  { id: 'flip', label: 'Flip' },
  { id: 'drop', label: 'Drop' },
];

export const MOTION_OUT_LABELS: Partial<Record<MotionInOut, string>> = {
  'slide-left': 'Slide out left',
  'slide-right': 'Slide out right',
  'slide-up': 'Slide out up',
  'slide-down': 'Slide out down',
  drop: 'Fall',
};

export const MOTION_LOOPS: { id: MotionLoop; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'ken-burns', label: 'Ken Burns (zoom in)' },
  { id: 'ken-burns-out', label: 'Ken Burns (zoom out)' },
  { id: 'pan-left', label: 'Pan left' },
  { id: 'pan-right', label: 'Pan right' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'float', label: 'Float' },
  { id: 'swing', label: 'Swing' },
  { id: 'shake', label: 'Shake' },
  { id: 'spin', label: 'Spin' },
  { id: 'flicker', label: 'Flicker' },
];

const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);
const easeInCubic = (p: number) => p * p * p;
function easeOutBounce(p: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (p < 1 / d1) return n1 * p * p;
  if (p < 2 / d1) return n1 * (p -= 1.5 / d1) * p + 0.75;
  if (p < 2.5 / d1) return n1 * (p -= 2.25 / d1) * p + 0.9375;
  return n1 * (p -= 2.625 / d1) * p + 0.984375;
}

/** Entrance: p goes 0 → 1 over the in-duration. */
function enter(kind: MotionInOut, p: number, W: number, H: number): MotionOffsets {
  const e = easeOutCubic(p);
  const q = 1 - e;
  switch (kind) {
    case 'fade':
      return { ...IDENTITY, alpha: p };
    case 'zoom-in':
      return { ...IDENTITY, scale: 0.3 + 0.7 * e, alpha: Math.min(1, p * 2) };
    case 'zoom-out':
      return { ...IDENTITY, scale: 1.6 - 0.6 * e, alpha: Math.min(1, p * 2) };
    case 'slide-left':
      return { ...IDENTITY, dx: q * W, alpha: Math.min(1, p * 3) };
    case 'slide-right':
      return { ...IDENTITY, dx: -q * W, alpha: Math.min(1, p * 3) };
    case 'slide-up':
      return { ...IDENTITY, dy: q * H, alpha: Math.min(1, p * 3) };
    case 'slide-down':
      return { ...IDENTITY, dy: -q * H, alpha: Math.min(1, p * 3) };
    case 'spin':
      return { ...IDENTITY, rotation: -360 * q, scale: 0.2 + 0.8 * e, alpha: p };
    case 'bounce':
      return { ...IDENTITY, scale: Math.max(0.01, easeOutBounce(p)), alpha: Math.min(1, p * 4) };
    case 'flip':
      return { ...IDENTITY, scaleX: Math.max(0.01, e), alpha: Math.min(1, p * 3) };
    case 'drop':
      return { ...IDENTITY, dy: -(1 - easeOutBounce(p)) * H * 0.6, alpha: Math.min(1, p * 4) };
    default:
      return IDENTITY;
  }
}

/** Exit: p goes 0 → 1 over the out-duration (1 = fully gone). */
function exit(kind: MotionInOut, p: number, W: number, H: number): MotionOffsets {
  const e = easeInCubic(p);
  switch (kind) {
    case 'fade':
      return { ...IDENTITY, alpha: 1 - p };
    case 'zoom-in':
      return { ...IDENTITY, scale: 1 + 0.7 * e, alpha: 1 - p };
    case 'zoom-out':
      return { ...IDENTITY, scale: Math.max(0.01, 1 - 0.7 * e), alpha: 1 - p };
    case 'slide-left':
      return { ...IDENTITY, dx: -e * W, alpha: 1 - Math.max(0, p - 0.66) * 3 };
    case 'slide-right':
      return { ...IDENTITY, dx: e * W, alpha: 1 - Math.max(0, p - 0.66) * 3 };
    case 'slide-up':
      return { ...IDENTITY, dy: -e * H, alpha: 1 - Math.max(0, p - 0.66) * 3 };
    case 'slide-down':
      return { ...IDENTITY, dy: e * H, alpha: 1 - Math.max(0, p - 0.66) * 3 };
    case 'spin':
      return { ...IDENTITY, rotation: 360 * e, scale: Math.max(0.01, 1 - 0.8 * e), alpha: 1 - p };
    case 'bounce':
      return { ...IDENTITY, scale: Math.max(0.01, 1 - easeOutBounce(p)), alpha: 1 - Math.max(0, p - 0.75) * 4 };
    case 'flip':
      return { ...IDENTITY, scaleX: Math.max(0.01, 1 - e), alpha: 1 - Math.max(0, p - 0.66) * 3 };
    case 'drop':
      return { ...IDENTITY, dy: e * H, rotation: 12 * e, alpha: 1 - Math.max(0, p - 0.66) * 3 };
    default:
      return IDENTITY;
  }
}

/** Looping effect over the whole clip. `t` = seconds since clip start, `u` = 0..1 progress. */
function loop(kind: MotionLoop, t: number, u: number, speed: number, k: number, W: number, H: number): MotionOffsets {
  const w = 2 * Math.PI * speed * t;
  switch (kind) {
    case 'ken-burns':
      return { ...IDENTITY, scale: 1 + 0.3 * k * u };
    case 'ken-burns-out':
      return { ...IDENTITY, scale: 1 + 0.3 * k * (1 - u) };
    case 'pan-left':
      return { ...IDENTITY, scale: 1 + 0.2 * k, dx: (0.5 - u) * 0.2 * k * W };
    case 'pan-right':
      return { ...IDENTITY, scale: 1 + 0.2 * k, dx: (u - 0.5) * 0.2 * k * W };
    case 'pulse':
      return { ...IDENTITY, scale: 1 + 0.08 * k * Math.sin(w) };
    case 'float':
      return { ...IDENTITY, dy: 0.04 * k * H * Math.sin(w) };
    case 'swing':
      return { ...IDENTITY, rotation: 10 * k * Math.sin(w) };
    case 'shake': {
      const a = 0.02 * k;
      return {
        ...IDENTITY,
        dx: a * W * Math.sin(w * 7.3 + 1.7) * Math.cos(w * 3.1),
        dy: a * H * Math.sin(w * 5.7 + 0.4) * Math.cos(w * 2.3 + 2.1),
        rotation: 1.5 * k * Math.sin(w * 4.1),
      };
    }
    case 'spin':
      return { ...IDENTITY, rotation: 90 * speed * t };
    case 'flicker': {
      const n = 0.5 + 0.5 * Math.sin(w * 9.7) * Math.sin(w * 4.3 + 2) * Math.sin(w * 13.1 + 1);
      return { ...IDENTITY, alpha: 1 - 0.7 * k * n };
    }
    default:
      return IDENTITY;
  }
}

function combine(a: MotionOffsets, b: MotionOffsets): MotionOffsets {
  return {
    dx: a.dx + b.dx,
    dy: a.dy + b.dy,
    scale: a.scale * b.scale,
    scaleX: a.scaleX * b.scaleX,
    rotation: a.rotation + b.rotation,
    alpha: a.alpha * b.alpha,
  };
}

export function motionAt(clip: VisualClip, time: number, W: number, H: number): MotionOffsets {
  const m: Motion | undefined = clip.motion;
  if (!m) return IDENTITY;
  const local = time - clip.start;
  const dur = Math.max(1e-6, clip.duration);
  let out = IDENTITY;
  if (m.loop !== 'none') {
    out = combine(out, loop(m.loop, local, clamp(local / dur, 0, 1), m.loopSpeed || 1, clamp(m.loopStrength, 0, 1), W, H));
  }
  const inDur = Math.min(m.inDuration, dur);
  if (m.in !== 'none' && inDur > 0 && local < inDur) {
    out = combine(out, enter(m.in, clamp(local / inDur, 0, 1), W, H));
  }
  const outDur = Math.min(m.outDuration, dur);
  const remaining = dur - local;
  if (m.out !== 'none' && outDur > 0 && remaining < outDur) {
    out = combine(out, exit(m.out, clamp(1 - remaining / outDur, 0, 1), W, H));
  }
  return out;
}
