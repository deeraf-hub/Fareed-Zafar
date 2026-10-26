import type { ColorAdjust, FilterPreset } from '@/types/project';

const PRESET_FILTERS: Record<FilterPreset, string> = {
  none: '',
  grayscale: 'grayscale(1)',
  sepia: 'sepia(0.85)',
  invert: 'invert(1)',
  warm: 'sepia(0.28) saturate(1.3) brightness(1.03)',
  cool: 'hue-rotate(-18deg) saturate(1.15) brightness(1.02)',
  vintage: 'sepia(0.45) contrast(1.08) brightness(0.92) saturate(0.8)',
  vivid: 'saturate(1.6) contrast(1.12)',
};

export const FILTER_PRESETS: { id: FilterPreset; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'vivid', label: 'Vivid' },
  { id: 'warm', label: 'Warm' },
  { id: 'cool', label: 'Cool' },
  { id: 'vintage', label: 'Vintage' },
  { id: 'grayscale', label: 'Black & white' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'invert', label: 'Invert' },
];

/** Build a CanvasRenderingContext2D.filter string, or 'none'. */
export function filterString(adjust: ColorAdjust): string {
  const parts: string[] = [];
  if (Math.abs(adjust.brightness - 1) > 0.001) parts.push(`brightness(${adjust.brightness.toFixed(3)})`);
  if (Math.abs(adjust.contrast - 1) > 0.001) parts.push(`contrast(${adjust.contrast.toFixed(3)})`);
  if (Math.abs(adjust.saturation - 1) > 0.001) parts.push(`saturate(${adjust.saturation.toFixed(3)})`);
  const preset = PRESET_FILTERS[adjust.preset];
  if (preset) parts.push(preset);
  return parts.length ? parts.join(' ') : 'none';
}
