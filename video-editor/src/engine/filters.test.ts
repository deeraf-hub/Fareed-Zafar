import { describe, expect, it } from 'vitest';
import { filterString } from './filters';

describe('filterString', () => {
  it('returns none for neutral adjustments', () => {
    expect(filterString({ brightness: 1, contrast: 1, saturation: 1, hue: 0, blur: 0, vignette: 0, grain: 0, preset: 'none' })).toBe('none');
  });
  it('combines adjustments and presets', () => {
    const f = filterString({ brightness: 1.2, contrast: 0.9, saturation: 1.5, hue: 30, blur: 2, vignette: 0, grain: 0, preset: 'sepia' });
    expect(f).toContain('brightness(1.200)');
    expect(f).toContain('contrast(0.900)');
    expect(f).toContain('saturate(1.500)');
    expect(f).toContain('hue-rotate(30.0deg)');
    expect(f).toContain('blur(2.00px)');
    expect(f).toContain('sepia(');
  });
  it('adds transition blur to the clip blur', () => {
    const f = filterString({ brightness: 1, contrast: 1, saturation: 1, hue: 0, blur: 1, vignette: 0, grain: 0, preset: 'none' }, 4);
    expect(f).toBe('blur(5.00px)');
  });
});
