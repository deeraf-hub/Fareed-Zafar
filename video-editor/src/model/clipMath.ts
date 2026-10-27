/**
 * Time/geometry helpers shared by the preview player and the exporters.
 */
import type {
  AudibleClip,
  Clip,
  Keyframe,
  KeyframeEasing,
  KeyframeProperty,
  Keyframes,
  Project,
  Track,
  Transform,
  Transition,
  VisualClip,
} from '@/types/project';
import { DEFAULT_DUCK_AMOUNT, DEFAULT_DUCK_RELEASE } from './project';
import { SNAP_EPSILON } from '@/config/limits';
import { clipEnd } from './project';
import { clamp } from '@/lib/time';

/** Convert a timeline time to the clip's source time (seconds into the media). */
export function clipSourceTime(clip: Clip, time: number): number {
  const local = time - clip.start;
  const speed = 'speed' in clip ? clip.speed : 1;
  const trimStart = 'trimStart' in clip ? clip.trimStart : 0;
  return trimStart + local * speed;
}

export function isActive(clip: Clip, time: number): boolean {
  return time >= clip.start - SNAP_EPSILON && time < clipEnd(clip) - SNAP_EPSILON;
}

/**
 * Gain multiplier for an audible clip at a timeline time (fades + volume +
 * mutes, and ducking when `project` is given and the clip's track ducks).
 */
export function clipGainAt(clip: AudibleClip, track: Track | undefined, time: number, project?: Project): number {
  if (clip.audio.muted || track?.muted) return 0;
  const local = time - clip.start;
  let g = clip.audio.volume;
  if (clip.audio.fadeIn > 0 && local < clip.audio.fadeIn) g *= clamp(local / clip.audio.fadeIn, 0, 1);
  const remaining = clip.duration - local;
  if (clip.audio.fadeOut > 0 && remaining < clip.audio.fadeOut) g *= clamp(remaining / clip.audio.fadeOut, 0, 1);
  if (project && track?.duck) g *= duckingFactor(project, track, time);
  return clamp(g, 0, 2);
}

/** Timeline intervals during which something other than ducked tracks is audible. */
export function voiceIntervals(project: Project, excludeTrackId?: string): { start: number; end: number }[] {
  const tracks = new Map(project.tracks.map((t) => [t.id, t]));
  const out: { start: number; end: number }[] = [];
  for (const c of project.clips) {
    if (c.kind !== 'video' && c.kind !== 'audio') continue;
    const t = tracks.get(c.trackId);
    if (!t || t.muted || t.duck || t.id === excludeTrackId) continue;
    if (c.audio.muted || c.audio.volume <= 0) continue;
    if (c.kind === 'video') {
      const asset = project.assets.find((a) => a.id === c.assetId);
      if (asset && asset.hasAudio === false) continue;
    }
    out.push({ start: c.start, end: c.start + c.duration });
  }
  return out;
}

/** 1 = no ducking, (1 - amount) = fully ducked; ramps over the release time around voice. */
export function duckingFactor(project: Project, track: Track, time: number): number {
  if (!track.duck) return 1;
  const amount = clamp(project.settings.duckAmount ?? DEFAULT_DUCK_AMOUNT, 0, 1);
  const release = Math.max(0.01, project.settings.duckRelease ?? DEFAULT_DUCK_RELEASE);
  let envelope = 0;
  for (const iv of voiceIntervals(project, track.id)) {
    const dist = time < iv.start ? iv.start - time : time > iv.end ? time - iv.end : 0;
    envelope = Math.max(envelope, clamp(1 - dist / release, 0, 1));
    if (envelope >= 1) break;
  }
  return 1 - amount * envelope;
}

export interface TransitionState {
  /** 0..1 progress through the transition. */
  progress: number;
  transition: Transition;
}

export function transitionInState(clip: VisualClip, time: number): TransitionState | null {
  const t = clip.transitionIn;
  if (!t || t.type === 'none' || t.duration <= 0) return null;
  const local = time - clip.start;
  const d = Math.min(t.duration, clip.duration);
  if (local >= d) return null;
  return { progress: clamp(local / d, 0, 1), transition: t };
}

export function transitionOutState(clip: VisualClip, time: number): TransitionState | null {
  const t = clip.transitionOut;
  if (!t || t.type === 'none' || t.duration <= 0) return null;
  const remaining = clipEnd(clip) - time;
  const d = Math.min(t.duration, clip.duration);
  if (remaining >= d) return null;
  return { progress: clamp(1 - remaining / d, 0, 1), transition: t };
}

/** The clip on the same track that ends exactly where `clip` starts (for crossfades). */
export function previousAdjacentClip(project: Project, clip: Clip): Clip | undefined {
  return project.clips.find(
    (c) => c.id !== clip.id && c.trackId === clip.trackId && Math.abs(clipEnd(c) - clip.start) < 0.02,
  );
}

/** Visual tracks ordered bottom layer → top layer, hidden tracks removed. */
export function visualTracksBottomUp(project: Project): Track[] {
  return project.tracks.filter((t) => t.kind === 'video' && !t.hidden).reverse();
}

export function activeClipOnTrack(project: Project, trackId: string, time: number): Clip | undefined {
  return project.clips.find((c) => c.trackId === trackId && isActive(c, time));
}

export function activeAudibleClips(project: Project, time: number): AudibleClip[] {
  return project.clips.filter(
    (c): c is AudibleClip => (c.kind === 'video' || c.kind === 'audio') && isActive(c, time),
  );
}

/** Easing used by transitions and text animations. */
export function easeInOut(p: number): number {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

export function easeOutBack(p: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}

// ---------------------------------------------------------------------------
// Keyframes
// ---------------------------------------------------------------------------

export const KEYFRAME_PROPS: KeyframeProperty[] = ['x', 'y', 'scale', 'rotation', 'opacity'];

function easeBounce(p: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (p < 1 / d1) return n1 * p * p;
  if (p < 2 / d1) return n1 * (p -= 1.5 / d1) * p + 0.75;
  if (p < 2.5 / d1) return n1 * (p -= 2.25 / d1) * p + 0.9375;
  return n1 * (p -= 2.625 / d1) * p + 0.984375;
}

export function applyEasing(easing: KeyframeEasing | undefined, p: number): number {
  switch (easing) {
    case 'linear':
      return p;
    case 'ease-in':
      return p * p * p;
    case 'ease-out':
      return 1 - Math.pow(1 - p, 3);
    case 'bounce':
      return easeBounce(p);
    default:
      return easeInOut(p);
  }
}

export const KEYFRAME_EASINGS: { id: KeyframeEasing; label: string }[] = [
  { id: 'ease', label: 'Ease in-out' },
  { id: 'linear', label: 'Linear' },
  { id: 'ease-in', label: 'Ease in' },
  { id: 'ease-out', label: 'Ease out' },
  { id: 'bounce', label: 'Bounce' },
];

/** Interpolated value of a keyframe list at a clip-local time (eased between keys, held outside). */
export function keyframeValueAt(keyframes: Keyframe[], time: number): number {
  if (keyframes.length === 0) return NaN;
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (time <= sorted[0].time) return sorted[0].value;
  const last = sorted[sorted.length - 1];
  if (time >= last.time) return last.value;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (time >= a.time && time <= b.time) {
      const span = b.time - a.time;
      const p = span <= 0 ? 1 : (time - a.time) / span;
      return a.value + (b.value - a.value) * applyEasing(a.easing, p);
    }
  }
  return last.value;
}

/** The clip's transform at a timeline time, with keyframed properties resolved. */
export function transformAt(clip: VisualClip, time: number): Transform {
  const kfs = clip.keyframes;
  if (!kfs) return clip.transform;
  const local = time - clip.start;
  const out: Transform = { ...clip.transform };
  for (const prop of KEYFRAME_PROPS) {
    const list = kfs[prop];
    if (list && list.length > 0) out[prop] = keyframeValueAt(list, local);
  }
  return out;
}

export function hasKeyframes(clip: VisualClip, prop: KeyframeProperty): boolean {
  return (clip.keyframes?.[prop]?.length ?? 0) > 0;
}

export function keyframeAt(keyframes: Keyframes | undefined, prop: KeyframeProperty, time: number, tolerance: number): Keyframe | undefined {
  return keyframes?.[prop]?.find((k) => Math.abs(k.time - time) <= tolerance);
}

/** Add or update a keyframe (immutable). */
export function withKeyframe(keyframes: Keyframes | undefined, prop: KeyframeProperty, time: number, value: number, tolerance: number): Keyframes {
  const list = [...(keyframes?.[prop] ?? [])];
  const t = Math.round(time * 1000) / 1000;
  const idx = list.findIndex((k) => Math.abs(k.time - t) <= tolerance);
  if (idx >= 0) list[idx] = { ...list[idx], value };
  else list.push({ time: t, value });
  list.sort((a, b) => a.time - b.time);
  return { ...keyframes, [prop]: list };
}

/** Remove the keyframe nearest to `time` (immutable); drops the property when empty. */
export function withoutKeyframe(keyframes: Keyframes | undefined, prop: KeyframeProperty, time: number, tolerance: number): Keyframes | undefined {
  if (!keyframes?.[prop]) return keyframes;
  const list = keyframes[prop]!.filter((k) => Math.abs(k.time - time) > tolerance);
  const next: Keyframes = { ...keyframes };
  if (list.length) next[prop] = list;
  else delete next[prop];
  return Object.keys(next).length ? next : undefined;
}

/** Shift every keyframe by `delta` seconds (used when the clip's start edge is trimmed). */
export function shiftKeyframes(keyframes: Keyframes | undefined, delta: number): Keyframes | undefined {
  if (!keyframes || delta === 0) return keyframes;
  const out: Keyframes = {};
  for (const prop of KEYFRAME_PROPS) {
    const list = keyframes[prop];
    if (list) out[prop] = list.map((k) => ({ ...k, time: Math.round((k.time + delta) * 1000) / 1000 }));
  }
  return out;
}

/**
 * Split keyframes at a clip-local time. Both halves get a boundary key so the
 * motion is identical before and after the cut.
 */
export function splitKeyframes(keyframes: Keyframes | undefined, at: number): { left: Keyframes | undefined; right: Keyframes | undefined } {
  if (!keyframes) return { left: undefined, right: undefined };
  const left: Keyframes = {};
  const right: Keyframes = {};
  for (const prop of KEYFRAME_PROPS) {
    const list = keyframes[prop];
    if (!list || list.length === 0) continue;
    const boundary = keyframeValueAt(list, at);
    const l = list.filter((k) => k.time < at - 1e-6);
    const r = list.filter((k) => k.time > at + 1e-6).map((k) => ({ ...k, time: Math.round((k.time - at) * 1000) / 1000 }));
    l.push({ time: Math.round(at * 1000) / 1000, value: boundary });
    r.unshift({ time: 0, value: boundary });
    left[prop] = l;
    right[prop] = r;
  }
  return { left: Object.keys(left).length ? left : undefined, right: Object.keys(right).length ? right : undefined };
}

/** Set the easing of every keyframe (any property) at a clip-local time. */
export function withKeyframeEasing(keyframes: Keyframes | undefined, time: number, easing: KeyframeEasing, tolerance: number): Keyframes | undefined {
  if (!keyframes) return keyframes;
  const out: Keyframes = {};
  for (const prop of KEYFRAME_PROPS) {
    const list = keyframes[prop];
    if (list) out[prop] = list.map((k) => (Math.abs(k.time - time) <= tolerance ? { ...k, easing } : k));
  }
  return out;
}

/** The easing of the keyframe nearest `time` (first property that has one). */
export function keyframeEasingAt(keyframes: Keyframes | undefined, time: number, tolerance: number): KeyframeEasing | undefined {
  if (!keyframes) return undefined;
  for (const prop of KEYFRAME_PROPS) {
    const k = keyframes[prop]?.find((e) => Math.abs(e.time - time) <= tolerance);
    if (k) return k.easing ?? 'ease';
  }
  return undefined;
}

/** All distinct keyframe times of a clip (for timeline markers). */
export function keyframeTimes(keyframes: Keyframes | undefined): number[] {
  if (!keyframes) return [];
  const set = new Set<number>();
  for (const prop of KEYFRAME_PROPS) for (const k of keyframes[prop] ?? []) set.add(k.time);
  return [...set].sort((a, b) => a - b);
}
