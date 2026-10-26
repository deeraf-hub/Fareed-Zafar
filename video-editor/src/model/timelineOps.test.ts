import { describe, expect, it } from 'vitest';
import type { Clip, MediaAsset, VideoClip } from '@/types/project';
import { createProject, makeClipFromAsset, clipEnd } from './project';
import {
  closeGaps,
  deleteClips,
  duplicateClips,
  findFreePosition,
  hasCollision,
  moveClip,
  moveClips,
  rippleDelete,
  snapPoints,
  snapTime,
  splitAt,
  splitClip,
  trimClipEnd,
  trimClipStart,
} from './timelineOps';

const asset: MediaAsset = {
  id: 'a1',
  name: 'clip.mp4',
  kind: 'video',
  mimeType: 'video/mp4',
  size: 1,
  duration: 10,
  width: 1920,
  height: 1080,
  hasAudio: true,
  addedAt: 0,
};

function video(id: string, start: number, duration: number, trackId = 'v1', trimStart = 0): VideoClip {
  const c = makeClipFromAsset(asset, trackId, start) as VideoClip;
  return { ...c, id, duration, trimStart };
}

describe('collisions and placement', () => {
  it('detects overlaps on the same track only', () => {
    const clips: Clip[] = [video('a', 0, 4), video('b', 0, 4, 'v2')];
    expect(hasCollision(clips, 'v1', 2, 2)).toBe(true);
    expect(hasCollision(clips, 'v1', 4, 2)).toBe(false);
    expect(hasCollision(clips, 'v3', 2, 2)).toBe(false);
  });

  it('finds the nearest free spot', () => {
    const clips: Clip[] = [video('a', 0, 4), video('b', 6, 4)];
    expect(findFreePosition(clips, 'v1', 1, 2)).toBe(4); // snaps after a
    expect(findFreePosition(clips, 'v1', 4.5, 2)).toBe(4);
    expect(findFreePosition(clips, 'v1', 20, 2)).toBe(20);
    expect(findFreePosition(clips, 'v1', 2, 3)).toBe(10); // 3s only fits after b
  });
});

describe('moveClip', () => {
  it('moves across tracks and resolves overlaps', () => {
    const clips: Clip[] = [video('a', 0, 4), video('b', 5, 4)];
    const moved = moveClip(clips, 'a', 'v1', 6);
    const a = moved.find((c) => c.id === 'a')!;
    expect(a.start).toBe(9); // placed right after b
    const moved2 = moveClip(clips, 'a', 'v2', 6);
    expect(moved2.find((c) => c.id === 'a')!.trackId).toBe('v2');
    expect(moved2.find((c) => c.id === 'a')!.start).toBe(6);
  });

  it('moves a selection atomically and never before zero', () => {
    const clips: Clip[] = [video('a', 1, 2), video('b', 4, 2), video('c', 7, 1)];
    const moved = moveClips(clips, ['a', 'b'], -5);
    expect(moved.find((c) => c.id === 'a')!.start).toBe(0);
    expect(moved.find((c) => c.id === 'b')!.start).toBe(3);
    // collision with c → unchanged
    expect(moveClips(clips, ['a', 'b'], 2)).toBe(clips);
  });
});

describe('trimming', () => {
  it('trims the start and keeps the end fixed, adjusting the source offset', () => {
    const clips: Clip[] = [video('a', 2, 6, 'v1', 1)];
    const out = trimClipStart(clips, 'a', 4) as VideoClip[];
    expect(out[0].start).toBe(4);
    expect(out[0].duration).toBe(4);
    expect(out[0].trimStart).toBe(3);
    expect(clipEnd(out[0])).toBe(8);
  });

  it('extends the start backwards only as far as source material allows', () => {
    const clips: Clip[] = [video('a', 5, 3, 'v1', 2)];
    const out = trimClipStart(clips, 'a', 0) as VideoClip[];
    expect(out[0].start).toBe(3); // 2s of trimmed material available
    expect(out[0].trimStart).toBe(0);
  });

  it('does not trim the start into the previous clip', () => {
    const clips: Clip[] = [video('p', 0, 3), video('a', 5, 3, 'v1', 4)];
    const out = trimClipStart(clips, 'a', 1);
    expect(out.find((c) => c.id === 'a')!.start).toBe(3);
  });

  it('trims the end within source duration and next clip', () => {
    const clips: Clip[] = [video('a', 0, 4), video('b', 8, 2)];
    expect(trimClipEnd(clips, 'a', 12, [asset])[0].duration).toBe(8); // blocked by b
    expect(trimClipEnd([video('a', 0, 4)], 'a', 30, [asset])[0].duration).toBe(10); // source length
    expect(trimClipEnd(clips, 'a', 0.001, [asset])[0].duration).toBeGreaterThan(0);
  });

  it('accounts for speed when limiting the end trim', () => {
    const fast: Clip[] = [{ ...video('a', 0, 2), speed: 2 }];
    expect(trimClipEnd(fast, 'a', 30, [asset])[0].duration).toBe(5); // 10s source at 2x
  });
});

describe('split', () => {
  it('splits into two clips with continuous source time', () => {
    const clips: Clip[] = [video('a', 2, 6, 'v1', 1)];
    const { clips: out, rightId } = splitClip(clips, 'a', 5);
    expect(out).toHaveLength(2);
    const left = out[0] as VideoClip;
    const right = out[1] as VideoClip;
    expect(rightId).toBe(right.id);
    expect(left.duration).toBe(3);
    expect(right.start).toBe(5);
    expect(right.duration).toBe(3);
    expect(right.trimStart).toBe(4);
  });

  it('respects speed when computing the right-hand trim', () => {
    const clips: Clip[] = [{ ...video('a', 0, 4), speed: 2 }];
    const { clips: out } = splitClip(clips, 'a', 1);
    expect((out[1] as VideoClip).trimStart).toBe(2);
  });

  it('keeps keyframed motion identical across a split and a start trim', () => {
    const animated: Clip = { ...video('a', 2, 4), keyframes: { opacity: [{ time: 0, value: 0 }, { time: 4, value: 1 }] } };
    const { clips: out } = splitClip([animated], 'a', 4);
    const left = out[0] as VideoClip;
    const right = out[1] as VideoClip;
    expect(left.keyframes!.opacity).toEqual([{ time: 0, value: 0 }, { time: 2, value: 0.5 }]);
    expect(right.keyframes!.opacity).toEqual([{ time: 0, value: 0.5 }, { time: 2, value: 1 }]);
    const trimmed = trimClipStart([animated], 'a', 3) as VideoClip[];
    expect(trimmed[0].keyframes!.opacity!.map((k) => k.time)).toEqual([-1, 3]);
  });

  it('ignores splits at the edges', () => {
    const clips: Clip[] = [video('a', 0, 4)];
    expect(splitClip(clips, 'a', 0).clips).toBe(clips);
    expect(splitClip(clips, 'a', 4).clips).toBe(clips);
  });

  it('splits every clip under the playhead', () => {
    const clips: Clip[] = [video('a', 0, 4), video('b', 0, 4, 'v2'), video('c', 6, 2)];
    const { clips: out, newIds } = splitAt(clips, 2);
    expect(newIds).toHaveLength(2);
    expect(out).toHaveLength(5);
  });
});

describe('duplicate / delete / gaps', () => {
  it('duplicates right after the original', () => {
    const clips: Clip[] = [video('a', 0, 4)];
    const { clips: out, newIds } = duplicateClips(clips, ['a']);
    expect(out).toHaveLength(2);
    expect(out[1].start).toBe(4);
    expect(out[1].id).toBe(newIds[0]);
  });

  it('deletes by id', () => {
    const clips: Clip[] = [video('a', 0, 4), video('b', 5, 4)];
    expect(deleteClips(clips, ['a']).map((c) => c.id)).toEqual(['b']);
  });

  it('ripple deletes and shifts only later clips on the same track', () => {
    const clips: Clip[] = [video('a', 0, 2), video('b', 3, 2), video('c', 6, 1), video('x', 4, 1, 'v2')];
    const out = rippleDelete(clips, ['b']);
    expect(out.map((c) => c.id)).toEqual(['a', 'c', 'x']);
    expect(out.find((c) => c.id === 'a')!.start).toBe(0);
    expect(out.find((c) => c.id === 'c')!.start).toBe(4);
    expect(out.find((c) => c.id === 'x')!.start).toBe(4);
    // Deleting two clips shifts by the sum of their durations.
    const out2 = rippleDelete(clips, ['a', 'b']);
    expect(out2.find((c) => c.id === 'c')!.start).toBe(2);
    expect(rippleDelete(clips, ['nope'])).toBe(clips);
  });

  it('closes gaps on a track', () => {
    const clips: Clip[] = [video('a', 2, 2), video('b', 7, 1), video('x', 3, 1, 'v2')];
    const out = closeGaps(clips, 'v1');
    expect(out.find((c) => c.id === 'a')!.start).toBe(0);
    expect(out.find((c) => c.id === 'b')!.start).toBe(2);
    expect(out.find((c) => c.id === 'x')!.start).toBe(3);
  });
});

describe('snapping', () => {
  it('collects edges and snaps within threshold', () => {
    const clips: Clip[] = [video('a', 1, 2)];
    const pts = snapPoints(clips, 7.5);
    expect(pts).toEqual(expect.arrayContaining([0, 1, 3, 7.5]));
    expect(snapTime(2.95, pts, 0.1)).toEqual({ time: 3, snapped: true });
    expect(snapTime(2.5, pts, 0.1)).toEqual({ time: 2.5, snapped: false });
  });
});

describe('project factory', () => {
  it('creates sensible defaults', () => {
    const p = createProject('Test', '9:16');
    expect(p.settings.width).toBe(1080);
    expect(p.settings.height).toBe(1920);
    expect(p.tracks.filter((t) => t.kind === 'video')).toHaveLength(2);
    expect(p.tracks.filter((t) => t.kind === 'audio')).toHaveLength(1);
  });
});
