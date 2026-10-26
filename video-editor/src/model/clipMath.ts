/**
 * Time/geometry helpers shared by the preview player and the exporters.
 */
import type { AudibleClip, Clip, Project, Track, Transition, VisualClip } from '@/types/project';
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

/** Gain multiplier for an audible clip at a timeline time (fades + volume + mutes). */
export function clipGainAt(clip: AudibleClip, track: Track | undefined, time: number): number {
  if (clip.audio.muted || track?.muted) return 0;
  const local = time - clip.start;
  let g = clip.audio.volume;
  if (clip.audio.fadeIn > 0 && local < clip.audio.fadeIn) g *= clamp(local / clip.audio.fadeIn, 0, 1);
  const remaining = clip.duration - local;
  if (clip.audio.fadeOut > 0 && remaining < clip.audio.fadeOut) g *= clamp(remaining / clip.audio.fadeOut, 0, 1);
  return clamp(g, 0, 2);
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
