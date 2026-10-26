import { describe, expect, it } from 'vitest';
import { createProject, makeTextClip, normalizeProject, sequenceDuration, summarize, withAspect } from './project';

describe('normalizeProject', () => {
  it('round-trips a freshly created project', () => {
    const p = createProject('Round trip', '1:1');
    p.clips.push(makeTextClip(p.tracks[0].id, 1, 'subtitle', p.settings, 'hello'));
    const json = JSON.parse(JSON.stringify(p));
    const back = normalizeProject(json);
    expect(back).toEqual(p);
  });

  it('fills defaults for older saves', () => {
    const p = createProject('Old');
    const clip = makeTextClip(p.tracks[0].id, 0, 'title', p.settings);
    const raw = JSON.parse(JSON.stringify({ ...p, clips: [{ ...clip, animation: undefined, transitionIn: undefined, style: { fontSize: 50 } }] }));
    const back = normalizeProject(raw);
    const c = back.clips[0];
    expect(c.kind).toBe('text');
    if (c.kind === 'text') {
      expect(c.animation).toBe('none');
      expect(c.transitionIn.type).toBe('none');
      expect(c.style.fontSize).toBe(50);
      expect(c.style.fontFamily).toContain('Inter');
    }
  });

  it('rejects garbage', () => {
    expect(() => normalizeProject(null)).toThrow();
    expect(() => normalizeProject({ id: 'x' })).toThrow();
  });
});

describe('helpers', () => {
  it('computes duration and summary', () => {
    const p = createProject('Sum');
    p.clips.push(makeTextClip(p.tracks[0].id, 3, 'title', p.settings));
    expect(sequenceDuration(p.clips)).toBe(7);
    const s = summarize(p);
    expect(s.clipCount).toBe(1);
    expect(s.durationSeconds).toBe(7);
  });
  it('switches aspect ratio keeping fps', () => {
    const p = createProject('A');
    const q = withAspect(p, '9:16');
    expect(q.settings.width).toBe(1080);
    expect(q.settings.height).toBe(1920);
    expect(q.settings.fps).toBe(p.settings.fps);
  });
});
