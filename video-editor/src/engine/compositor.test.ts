import { describe, expect, it } from 'vitest';
import { cropRect } from './compositor';

describe('cropRect', () => {
  it('returns the full source without a crop', () => {
    expect(cropRect({ w: 400, h: 200 })).toEqual({ sx: 0, sy: 0, sw: 400, sh: 200 });
  });
  it('removes fractions from each edge and never collapses', () => {
    expect(cropRect({ w: 400, h: 200 }, { left: 0.25, top: 0, right: 0.25, bottom: 0.5 })).toEqual({ sx: 100, sy: 0, sw: 200, sh: 100 });
    const tiny = cropRect({ w: 400, h: 200 }, { left: 0.95, top: 0.95, right: 0.95, bottom: 0.95 });
    expect(tiny.sw).toBeGreaterThan(0);
    expect(tiny.sh).toBeGreaterThan(0);
  });
});
