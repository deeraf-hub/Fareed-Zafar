import type { Renderer } from './renderer';
import { WebCodecsRenderer } from './webcodecsRenderer';
import { FfmpegRenderer } from './ffmpegRenderer';

export * from './renderer';

/** Registry in priority order. A server-side renderer would be added here. */
export const RENDERERS: Renderer[] = [new WebCodecsRenderer(), new FfmpegRenderer()];

export async function availableRenderers(): Promise<Renderer[]> {
  const flags = await Promise.all(RENDERERS.map((r) => r.isSupported().catch(() => false)));
  return RENDERERS.filter((_, i) => flags[i]);
}

export interface ExportPreset {
  id: string;
  label: string;
  /** Longest edge in pixels. */
  edge: number;
  bitrate: number;
}

export const EXPORT_PRESETS: ExportPreset[] = [
  { id: '1080p', label: '1080p (Full HD)', edge: 1920, bitrate: 12_000_000 },
  { id: '720p', label: '720p (HD)', edge: 1280, bitrate: 6_000_000 },
  { id: '480p', label: '480p (SD)', edge: 854, bitrate: 2_500_000 },
];

/** Fit the project frame to a preset's longest edge, keeping even dimensions. */
export function exportDimensions(projectW: number, projectH: number, edge: number): { width: number; height: number } {
  const scale = Math.min(1, edge / Math.max(projectW, projectH));
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  return { width: even(projectW * scale), height: even(projectH * scale) };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
