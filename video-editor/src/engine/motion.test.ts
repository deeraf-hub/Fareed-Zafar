import { describe, expect, it } from 'vitest';
import { createProject, defaultMotion, makeTextClip } from '@/model/project';
import { IDENTITY, motionAt } from './motion';

function clipWith(motion: ReturnType<typeof defaultMotion> | undefined) {
  const p = createProject('m');
  const c = makeTextClip(p.tracks[0].id, 2, 'title', p.settings);
  c.duration = 4;
  return { ...c, motion };
}

describe('motionAt', () => {
  it('is identity without motion', () => {
    expect(motionAt(clipWith(undefined), 3, 1920, 1080)).toBe(IDENTITY);
  });
  it('fades in and slides out', () => {
    const c = clipWith({ ...defaultMotion(), in: 'fade', inDuration: 1, out: 'slide-left', outDuration: 1 });
    expect(motionAt(c, 2, 1920, 1080).alpha).toBe(0);
    expect(motionAt(c, 2.5, 1920, 1080).alpha).toBeCloseTo(0.5);
    expect(motionAt(c, 4, 1920, 1080)).toEqual(IDENTITY);
    expect(motionAt(c, 6, 1920, 1080).dx).toBeCloseTo(-1920);
    expect(motionAt(c, 5, 1920, 1080).dx).toBe(0);
  });
  it('ken burns grows across the clip by the strength', () => {
    const c = clipWith({ ...defaultMotion(), loop: 'ken-burns', loopStrength: 1 });
    expect(motionAt(c, 2, 1920, 1080).scale).toBe(1);
    expect(motionAt(c, 6, 1920, 1080).scale).toBeCloseTo(1.3);
    const half = clipWith({ ...defaultMotion(), loop: 'ken-burns', loopStrength: 0.5 });
    expect(motionAt(half, 6, 1920, 1080).scale).toBeCloseTo(1.15);
  });
  it('oscillating loops return to rest', () => {
    const c = clipWith({ ...defaultMotion(), loop: 'float', loopSpeed: 1, loopStrength: 1 });
    expect(motionAt(c, 2, 1920, 1080).dy).toBeCloseTo(0);
    expect(Math.abs(motionAt(c, 2.25, 1920, 1080).dy)).toBeGreaterThan(10);
    expect(motionAt(c, 3, 1920, 1080).dy).toBeCloseTo(0);
  });
  it('clamps entrance and exit to the clip length', () => {
    const c = clipWith({ ...defaultMotion(), in: 'zoom-in', inDuration: 10, out: 'fade', outDuration: 10 });
    expect(motionAt(c, 2, 1920, 1080).scale).toBeCloseTo(0.3);
    expect(motionAt(c, 6, 1920, 1080).alpha).toBeCloseTo(0);
  });
});
