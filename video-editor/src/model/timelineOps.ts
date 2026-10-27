/**
 * Pure, side-effect-free timeline operations. All functions take the clip
 * list (and whatever else they need) and return a new list. The Zustand
 * store wraps these with history/undo.
 */
import type { Clip, MediaAsset, Track } from '@/types/project';
import { MIN_CLIP_DURATION, SNAP_EPSILON } from '@/config/limits';
import { clipEnd } from './project';
import { shiftKeyframes, splitKeyframes } from './clipMath';
import { newId } from '@/lib/id';
import { clamp, roundTo } from '@/lib/time';

export function clipsOnTrack(clips: Clip[], trackId: string, excludeId?: string): Clip[] {
  return clips
    .filter((c) => c.trackId === trackId && c.id !== excludeId)
    .sort((a, b) => a.start - b.start);
}

export function overlaps(aStart: number, aDur: number, bStart: number, bDur: number): boolean {
  return aStart < bStart + bDur - SNAP_EPSILON && bStart < aStart + aDur - SNAP_EPSILON;
}

export function hasCollision(clips: Clip[], trackId: string, start: number, duration: number, excludeId?: string): boolean {
  return clipsOnTrack(clips, trackId, excludeId).some((c) => overlaps(start, duration, c.start, c.duration));
}

/**
 * Find the closest start position on `trackId` where a clip of `duration`
 * fits without overlapping. Returns null when nothing fits anywhere near.
 */
export function findFreePosition(
  clips: Clip[],
  trackId: string,
  desiredStart: number,
  duration: number,
  excludeId?: string,
): number | null {
  const want = Math.max(0, desiredStart);
  const others = clipsOnTrack(clips, trackId, excludeId);
  const fits = (s: number) => s >= 0 && !others.some((c) => overlaps(s, duration, c.start, c.duration));
  if (fits(want)) return want;
  const candidates: number[] = [];
  for (const c of others) {
    candidates.push(clipEnd(c));
    candidates.push(c.start - duration);
  }
  let best: number | null = null;
  for (const s of candidates) {
    if (!fits(s)) continue;
    if (best === null || Math.abs(s - want) < Math.abs(best - want)) best = s;
  }
  return best;
}

export function canPlaceOnTrack(clip: Clip, track: Track): boolean {
  if (track.locked) return false;
  if (clip.kind === 'audio') return track.kind === 'audio';
  return track.kind === 'video';
}

/** Source media length available to a clip, in source seconds. Infinity for images/text. */
export function sourceLength(clip: Clip, assets: MediaAsset[]): number {
  if (clip.kind === 'video' || clip.kind === 'audio') {
    const a = assets.find((x) => x.id === clip.assetId);
    return a ? a.duration : Infinity;
  }
  return Infinity;
}

export function maxDurationFor(clip: Clip, assets: MediaAsset[]): number {
  const len = sourceLength(clip, assets);
  if (!isFinite(len)) return Infinity;
  const speed = 'speed' in clip ? clip.speed : 1;
  const trimStart = 'trimStart' in clip ? clip.trimStart : 0;
  return Math.max(MIN_CLIP_DURATION, (len - trimStart) / speed);
}

/** Move a clip to a track/time, resolving overlaps by snapping to the nearest free spot. */
export function moveClip(
  clips: Clip[],
  clipId: string,
  trackId: string,
  start: number,
): Clip[] {
  const clip = clips.find((c) => c.id === clipId);
  if (!clip) return clips;
  const pos = findFreePosition(clips, trackId, start, clip.duration, clipId);
  if (pos === null) return clips;
  return clips.map((c) => (c.id === clipId ? { ...c, trackId, start: roundTo(pos) } : c));
}

/** Move several clips by the same delta (multi-select drag). Fails atomically if any collides. */
export function moveClips(clips: Clip[], clipIds: string[], deltaTime: number): Clip[] {
  const moving = clips.filter((c) => clipIds.includes(c.id));
  if (moving.length === 0) return clips;
  const minStart = Math.min(...moving.map((c) => c.start));
  const delta = Math.max(deltaTime, -minStart);
  const moved = clips.map((c) => (clipIds.includes(c.id) ? { ...c, start: roundTo(c.start + delta) } : c));
  for (const m of moved.filter((c) => clipIds.includes(c.id))) {
    if (hasCollision(moved, m.trackId, m.start, m.duration, m.id)) return clips;
  }
  return moved;
}

/** Trim the start edge. `newStart` is a timeline time. Keeps the end fixed. */
export function trimClipStart(clips: Clip[], clipId: string, newStart: number): Clip[] {
  const clip = clips.find((c) => c.id === clipId);
  if (!clip) return clips;
  const end = clipEnd(clip);
  const prev = clipsOnTrack(clips, clip.trackId, clipId).filter((c) => clipEnd(c) <= clip.start + SNAP_EPSILON).pop();
  const minStart = prev ? clipEnd(prev) : 0;
  const speed = 'speed' in clip ? clip.speed : 1;
  const trimStart = 'trimStart' in clip ? clip.trimStart : 0;
  // Earliest we can extend backwards is limited by available source before trimStart.
  const sourceLimitedStart = clip.start - trimStart / speed;
  let s = clamp(newStart, Math.max(minStart, sourceLimitedStart), end - MIN_CLIP_DURATION);
  s = roundTo(s);
  const delta = s - clip.start;
  return clips.map((c) => {
    if (c.id !== clipId) return c;
    const next = { ...c, start: s, duration: roundTo(c.duration - delta) };
    if ('trimStart' in next) next.trimStart = roundTo(Math.max(0, next.trimStart + delta * speed));
    if ('keyframes' in next && next.keyframes) next.keyframes = shiftKeyframes(next.keyframes, -delta);
    return next;
  });
}

/** Trim the end edge. `newEnd` is a timeline time. */
export function trimClipEnd(clips: Clip[], clipId: string, newEnd: number, assets: MediaAsset[]): Clip[] {
  const clip = clips.find((c) => c.id === clipId);
  if (!clip) return clips;
  const next = clipsOnTrack(clips, clip.trackId, clipId).find((c) => c.start >= clipEnd(clip) - SNAP_EPSILON);
  const maxEnd = next ? next.start : Infinity;
  const maxDur = maxDurationFor(clip, assets);
  const dur = clamp(newEnd - clip.start, MIN_CLIP_DURATION, Math.min(maxDur, maxEnd - clip.start));
  return clips.map((c) => (c.id === clipId ? { ...c, duration: roundTo(dur) } : c));
}

/** Split a clip at a timeline time. Returns the new list and the id of the right-hand part. */
export function splitClip(clips: Clip[], clipId: string, time: number): { clips: Clip[]; rightId: string | null } {
  const clip = clips.find((c) => c.id === clipId);
  if (!clip) return { clips, rightId: null };
  const local = time - clip.start;
  if (local <= MIN_CLIP_DURATION || clip.duration - local <= MIN_CLIP_DURATION) return { clips, rightId: null };
  const leftDur = roundTo(local);
  const rightDur = roundTo(clip.duration - local);
  const rightId = newId('clip');
  const left: Clip = { ...clip, duration: leftDur } as Clip;
  const right: Clip = { ...clip, id: rightId, start: roundTo(time), duration: rightDur } as Clip;
  if ('transitionOut' in left) left.transitionOut = { type: 'none', duration: 0.5 };
  if ('keyframes' in left && left.keyframes) {
    const parts = splitKeyframes(left.keyframes, local);
    left.keyframes = parts.left;
    (right as typeof left).keyframes = parts.right;
  }
  if ('trimStart' in right && 'speed' in right) {
    right.trimStart = roundTo(right.trimStart + local * right.speed);
  }
  if ('transitionIn' in right) right.transitionIn = { type: 'none', duration: 0.5 };
  if ('audio' in left && 'audio' in right) {
    left.audio = { ...left.audio, fadeOut: 0 };
    right.audio = { ...right.audio, fadeIn: 0 };
  }
  const idx = clips.findIndex((c) => c.id === clipId);
  const out = [...clips];
  out.splice(idx, 1, left, right);
  return { clips: out, rightId };
}

/** Split every clip that spans `time` on unlocked tracks (or only selected ones when ids given). */
export function splitAt(clips: Clip[], time: number, onlyIds?: string[]): { clips: Clip[]; newIds: string[] } {
  let out = clips;
  const newIds: string[] = [];
  const targets = clips.filter(
    (c) => (!onlyIds || onlyIds.includes(c.id)) && c.start < time - SNAP_EPSILON && clipEnd(c) > time + SNAP_EPSILON,
  );
  for (const t of targets) {
    const r = splitClip(out, t.id, time);
    out = r.clips;
    if (r.rightId) newIds.push(r.rightId);
  }
  return { clips: out, newIds };
}

export function duplicateClips(clips: Clip[], clipIds: string[]): { clips: Clip[]; newIds: string[] } {
  const out = [...clips];
  const newIds: string[] = [];
  for (const id of clipIds) {
    const clip = out.find((c) => c.id === id);
    if (!clip) continue;
    const pos = findFreePosition(out, clip.trackId, clipEnd(clip), clip.duration);
    if (pos === null) continue;
    const copy: Clip = { ...clip, id: newId('clip'), start: roundTo(pos) } as Clip;
    out.push(copy);
    newIds.push(copy.id);
  }
  return { clips: out, newIds };
}

export function deleteClips(clips: Clip[], clipIds: string[]): Clip[] {
  return clips.filter((c) => !clipIds.includes(c.id));
}

/**
 * Delete clips and pull every later clip on the same track left by the
 * removed duration, so no hole is left behind (ripple delete).
 */
export function rippleDelete(clips: Clip[], clipIds: string[]): Clip[] {
  const deleted = clips.filter((c) => clipIds.includes(c.id));
  if (deleted.length === 0) return clips;
  return clips
    .filter((c) => !clipIds.includes(c.id))
    .map((c) => {
      const shift = deleted
        .filter((d) => d.trackId === c.trackId && clipEnd(d) <= c.start + SNAP_EPSILON)
        .reduce((sum, d) => sum + d.duration, 0);
      return shift > 0 ? { ...c, start: roundTo(c.start - shift) } : c;
    });
}

/** Collect snap targets: clip edges, playhead, zero. */
export function snapPoints(clips: Clip[], playhead: number, excludeIds: string[] = []): number[] {
  const pts = new Set<number>([0, roundTo(playhead)]);
  for (const c of clips) {
    if (excludeIds.includes(c.id)) continue;
    pts.add(roundTo(c.start));
    pts.add(roundTo(clipEnd(c)));
  }
  return [...pts];
}

export function snapTime(time: number, points: number[], threshold: number): { time: number; snapped: boolean } {
  let best = time;
  let bestDist = threshold;
  let snapped = false;
  for (const p of points) {
    const d = Math.abs(p - time);
    if (d < bestDist) {
      best = p;
      bestDist = d;
      snapped = true;
    }
  }
  return { time: best, snapped };
}

/** Remove gaps on a track by shifting clips left (ripple). */
export function closeGaps(clips: Clip[], trackId: string): Clip[] {
  const sorted = clipsOnTrack(clips, trackId);
  let cursor = 0;
  const moved = new Map<string, number>();
  for (const c of sorted) {
    moved.set(c.id, cursor);
    cursor = roundTo(cursor + c.duration);
  }
  return clips.map((c) => (moved.has(c.id) ? { ...c, start: moved.get(c.id)! } : c));
}
