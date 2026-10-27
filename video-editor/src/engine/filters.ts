import type { ColorAdjust, FilterPreset } from '@/types/project';

const PRESET_FILTERS: Record<FilterPreset, string> = {
  none: '',
  vivid: 'saturate(1.6) contrast(1.12)',
  warm: 'sepia(0.28) saturate(1.3) brightness(1.03)',
  cool: 'hue-rotate(-18deg) saturate(1.15) brightness(1.02)',
  vintage: 'sepia(0.45) contrast(1.08) brightness(0.92) saturate(0.8)',
  grayscale: 'grayscale(1)',
  sepia: 'sepia(0.85)',
  invert: 'invert(1)',
  noir: 'grayscale(1) contrast(1.35) brightness(0.9)',
  faded: 'contrast(0.85) brightness(1.1) saturate(0.75) sepia(0.15)',
  cinematic: 'contrast(1.18) saturate(0.85) hue-rotate(-6deg) brightness(0.94)',
  sunset: 'sepia(0.4) saturate(1.5) hue-rotate(-14deg) brightness(1.02)',
  cyber: 'hue-rotate(190deg) saturate(1.45) contrast(1.1)',
  pastel: 'saturate(0.7) brightness(1.12) contrast(0.88)',
  dramatic: 'contrast(1.45) saturate(1.1) brightness(0.88)',
  chrome: 'grayscale(0.35) contrast(1.25) brightness(1.08) saturate(1.2)',
};

export const FILTER_PRESETS: { id: FilterPreset; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'vivid', label: 'Vivid' },
  { id: 'warm', label: 'Warm' },
  { id: 'cool', label: 'Cool' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'dramatic', label: 'Dramatic' },
  { id: 'faded', label: 'Faded' },
  { id: 'pastel', label: 'Pastel' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'vintage', label: 'Vintage' },
  { id: 'chrome', label: 'Chrome' },
  { id: 'cyber', label: 'Cyber' },
  { id: 'grayscale', label: 'Black & white' },
  { id: 'noir', label: 'Noir' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'invert', label: 'Invert' },
];

/**
 * Build a CanvasRenderingContext2D.filter string, or 'none'.
 * `extraBlur` (project px) is added by transitions such as "blur".
 */
export function filterString(adjust: ColorAdjust, extraBlur = 0): string {
  const parts: string[] = [];
  if (Math.abs(adjust.brightness - 1) > 0.001) parts.push(`brightness(${adjust.brightness.toFixed(3)})`);
  if (Math.abs(adjust.contrast - 1) > 0.001) parts.push(`contrast(${adjust.contrast.toFixed(3)})`);
  if (Math.abs(adjust.saturation - 1) > 0.001) parts.push(`saturate(${adjust.saturation.toFixed(3)})`);
  if (Math.abs(adjust.hue) > 0.01) parts.push(`hue-rotate(${adjust.hue.toFixed(1)}deg)`);
  const blur = (adjust.blur || 0) + extraBlur;
  if (blur > 0.01) parts.push(`blur(${blur.toFixed(2)}px)`);
  const preset = PRESET_FILTERS[adjust.preset];
  if (preset) parts.push(preset);
  return parts.length ? parts.join(' ') : 'none';
}
