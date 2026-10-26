import { useEffect, useRef } from 'react';

/** Draws a slice of an asset's peak list across the clip width. */
export function WaveformCanvas({
  peaks,
  from,
  to,
  width,
  height,
  color = 'rgba(255,255,255,0.65)',
}: {
  peaks: number[];
  /** Fractions 0..1 of the source covered by this clip. */
  from: number;
  to: number;
  width: number;
  height: number;
  color?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const w = Math.max(1, Math.min(Math.round(width), 4096));
    const h = Math.max(1, Math.round(height));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    if (!peaks.length) return;
    ctx.fillStyle = color;
    const n = peaks.length;
    const span = Math.max(1e-6, to - from);
    const mid = h / 2;
    for (let x = 0; x < w; x++) {
      const f = from + (x / w) * span;
      const idx = Math.min(n - 1, Math.max(0, Math.floor(f * n)));
      const v = peaks[idx] ?? 0;
      const bar = Math.max(1, v * (h - 2));
      ctx.fillRect(x, mid - bar / 2, 1, bar);
    }
  }, [peaks, from, to, width, height, color]);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" style={{ width, height }} aria-hidden />;
}
