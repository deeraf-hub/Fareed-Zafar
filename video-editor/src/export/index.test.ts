import { describe, expect, it } from 'vitest';
import { exportDimensions, RENDERERS } from './index';

describe('export helpers', () => {
  it('scales to the longest edge with even dimensions', () => {
    expect(exportDimensions(1920, 1080, 1280)).toEqual({ width: 1280, height: 720 });
    expect(exportDimensions(1080, 1920, 854)).toEqual({ width: 480, height: 854 });
    expect(exportDimensions(1080, 1080, 1920)).toEqual({ width: 1080, height: 1080 });
    const odd = exportDimensions(1001, 1001, 1001);
    expect(odd.width % 2).toBe(0);
  });
  it('registers both browser renderers in priority order', () => {
    expect(RENDERERS.map((r) => r.id)).toEqual(['webcodecs', 'ffmpeg']);
  });
});
