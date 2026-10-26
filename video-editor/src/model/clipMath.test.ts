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
