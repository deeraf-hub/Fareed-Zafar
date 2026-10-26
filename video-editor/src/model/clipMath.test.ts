import { describe, expect, it } from 'vitest';
import type { Project, TextClip, VideoClip } from '@/types/project';
import { createProject, makeClipFromAsset, makeTextClip } from './project';
import {
  activeAudibleClips,
  clipGainAt,
  clipSourceTime,
  isActive,
  previousAdjacentClip,
  transitionInState,
  transitionOutState,
  visualTracksBottomUp,
} from './clipMath';

function base(): { project: Project; clip: VideoClip } {
  const project = createProject('t');
  const asset = { id: 'a', name: 'a.mp4', kind: 'video' as const, mimeType: 'video/mp4', size: 1, duration: 20, width: 1, height: 1, hasAudio: true, addedAt: 0 };
  project.assets.push(asset);
  const clip = makeClipFromAsset(asset, project.tracks[1].id, 2) as VideoClip;
  clip.duration = 5;
  clip.trimStart = 1;
  project.clips.push(clip);
  return { project, clip };
}

describe('clipSourceTime', () => {
  it('maps timeline time through trim and speed', () => {
    const { clip } = base();
    expect(clipSourceTime(clip, 2)).toBe(1);
    expect(clipSourceTime(clip, 4)).toBe(3);
    expect(clipSourceTime({ ...clip, speed: 2 }, 4)).toBe(5);
  });
  it('isActive uses a half-open interval', () => {
    const { clip } = base();
    expect(isActive(clip, 2)).toBe(true);
    expect(isActive(clip, 6.99)).toBe(true);
    expect(isActive(clip, 7)).toBe(false);
    expect(isActive(clip, 1.9)).toBe(false);
  });
});

describe('clipGainAt', () => {
  it('applies volume, fades and mutes', () => {
    const { clip, project } = base();
    const c = { ...clip, audio: { volume: 0.5, fadeIn: 1, fadeOut: 1, muted: false } };
    expect(clipGainAt(c, undefined, 2)).toBe(0);
    expect(clipGainAt(c, undefined, 2.5)).toBeCloseTo(0.25);
    expect(clipGainAt(c, undefined, 4)).toBeCloseTo(0.5);
    expect(clipGainAt(c, undefined, 6.5)).toBeCloseTo(0.25);
    expect(clipGainAt({ ...c, audio: { ...c.audio, muted: true } }, undefined, 4)).toBe(0);
    expect(clipGainAt(c, { ...project.tracks[1], muted: true }, 4)).toBe(0);
  });
});

describe('transitions', () => {
  it('reports progress only inside the transition window', () => {
    const { clip } = base();
    const c = { ...clip, transitionIn: { type: 'fade' as const, duration: 1 }, transitionOut: { type: 'wipe' as const, duration: 2 } };
    expect(transitionInState(c, 2.5)?.progress).toBeCloseTo(0.5);
    expect(transitionInState(c, 3.5)).toBeNull();
    expect(transitionOutState(c, 6)?.progress).toBeCloseTo(0.5);
    expect(transitionOutState(c, 4)).toBeNull();
  });
  it('finds the previous adjacent clip for crossfades', () => {
    const { project, clip } = base();
    const next = { ...clip, id: 'n', start: 7, duration: 2 };
    project.clips.push(next);
    expect(previousAdjacentClip(project, next)?.id).toBe(clip.id);
    expect(previousAdjacentClip(project, { ...next, start: 7.5 })).toBeUndefined();
  });
});

describe('track ordering & audible clips', () => {
  it('renders video tracks bottom-up and skips hidden ones', () => {
    const { project } = base();
    const order = visualTracksBottomUp(project).map((t) => t.name);
    expect(order).toEqual(['Video 1', 'Overlay']);
    project.tracks[0].hidden = true;
    expect(visualTracksBottomUp(project).map((t) => t.name)).toEqual(['Video 1']);
  });
  it('lists audible clips at a time, excluding text', () => {
    const { project } = base();
    const text: TextClip = makeTextClip(project.tracks[0].id, 2, 'title', project.settings);
    project.clips.push(text);
    expect(activeAudibleClips(project, 3).map((c) => c.kind)).toEqual(['video']);
  });
});

describe('keyframes', () => {
  it('interpolates with ease-in-out and holds outside the range', async () => {
    const { keyframeValueAt, transformAt, withKeyframe, withoutKeyframe, splitKeyframes, shiftKeyframes } = await import('./clipMath');
    const kfs = [
      { time: 0, value: 0 },
      { time: 2, value: 10 },
    ];
    expect(keyframeValueAt(kfs, -1)).toBe(0);
    expect(keyframeValueAt(kfs, 0)).toBe(0);
    expect(keyframeValueAt(kfs, 1)).toBeCloseTo(5);
    expect(keyframeValueAt(kfs, 0.5)).toBeCloseTo(1.25);
    expect(keyframeValueAt(kfs, 3)).toBe(10);

    const { clip } = base();
    const animated = { ...clip, keyframes: { scale: [{ time: 0, value: 0.5 }, { time: 2, value: 1 }] } };
    expect(transformAt(animated, clip.start).scale).toBe(0.5);
    expect(transformAt(animated, clip.start + 1).scale).toBeCloseTo(0.75);
    expect(transformAt(animated, clip.start + 1).x).toBe(clip.transform.x);
    expect(transformAt(clip, 0)).toBe(clip.transform);

    let k = withKeyframe(undefined, 'x', 1, 100, 0.02);
    k = withKeyframe(k, 'x', 0.5, 50, 0.02);
    expect(k.x!.map((e) => e.time)).toEqual([0.5, 1]);
    k = withKeyframe(k, 'x', 1.01, 120, 0.02); // updates the existing key within tolerance
    expect(k.x!.length).toBe(2);
    expect(k.x![1].value).toBe(120);
    expect(withoutKeyframe(withoutKeyframe(k, 'x', 1, 0.02), 'x', 0.5, 0.02)).toBeUndefined();

    const shifted = shiftKeyframes(k, -0.5)!;
    expect(shifted.x!.map((e) => e.time)).toEqual([0, 0.5]);

    const parts = splitKeyframes({ x: [{ time: 0, value: 0 }, { time: 2, value: 10 }] }, 1);
    expect(parts.left!.x).toEqual([{ time: 0, value: 0 }, { time: 1, value: 5 }]);
    expect(parts.right!.x).toEqual([{ time: 0, value: 5 }, { time: 1, value: 10 }]);
  });
});

describe('ducking', () => {
  it('lowers ducked tracks while other audible clips play, with a release ramp', async () => {
    const { duckingFactor, clipGainAt } = await import('./clipMath');
    const { project, clip } = base(); // video clip 2..7 s on the video track
    const audioTrack = { ...project.tracks[2], duck: true };
    project.tracks[2] = audioTrack;
    project.settings.duckAmount = 0.6;
    project.settings.duckRelease = 0.5;
    expect(duckingFactor(project, audioTrack, 4)).toBeCloseTo(0.4); // inside the voice interval
    expect(duckingFactor(project, audioTrack, 0)).toBe(1); // far before
    expect(duckingFactor(project, audioTrack, 1.75)).toBeCloseTo(0.7); // halfway through the ramp
    expect(duckingFactor(project, { ...audioTrack, duck: false }, 4)).toBe(1);
    const music = { ...clip, id: 'm', kind: 'audio' as const, trackId: audioTrack.id, start: 0, duration: 10 };
    expect(clipGainAt(music, audioTrack, 4, project)).toBeCloseTo(0.4);
    expect(clipGainAt(music, audioTrack, 4)).toBe(1); // no project → no ducking
  });
});

describe('keyframe easing', () => {
  it('honours per-key easing and edits it', async () => {
    const { keyframeValueAt, applyEasing, withKeyframeEasing, keyframeEasingAt } = await import('./clipMath');
    const linear = [{ time: 0, value: 0, easing: 'linear' as const }, { time: 2, value: 10 }];
    expect(keyframeValueAt(linear, 0.5)).toBeCloseTo(2.5);
    expect(applyEasing('ease-out', 0.5)).toBeCloseTo(0.875);
    expect(applyEasing('ease-in', 0.5)).toBeCloseTo(0.125);
    expect(applyEasing('bounce', 1)).toBeCloseTo(1);
    const edited = withKeyframeEasing({ x: linear, y: [{ time: 0, value: 1 }] }, 0, 'bounce', 0.01)!;
    expect(edited.x![0].easing).toBe('bounce');
    expect(edited.y![0].easing).toBe('bounce');
    expect(edited.x![1].easing).toBeUndefined();
    expect(keyframeEasingAt(edited, 0, 0.01)).toBe('bounce');
    expect(keyframeEasingAt(edited, 2, 0.01)).toBe('ease');
    expect(keyframeEasingAt(edited, 1, 0.01)).toBeUndefined();
  });
});
