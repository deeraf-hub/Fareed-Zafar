import { describe, expect, it } from 'vitest';
import { filterString } from './filters';

describe('filterString', () => {
  it('returns none for neutral adjustments', () => {
    expect(filterString({ brightness: 1, contrast: 1, saturation: 1, preset: 'none' })).toBe('none');
  });
  it('combines adjustments and presets', () => {
    const f = filterString({ brightness: 1.2, contrast: 0.9, saturation: 1.5, preset: 'sepia' });
    expect(f).toContain('brightness(1.200)');
    expect(f).toContain('contrast(0.900)');
    expect(f).toContain('saturate(1.500)');
    expect(f).toContain('sepia(');
  });
});
