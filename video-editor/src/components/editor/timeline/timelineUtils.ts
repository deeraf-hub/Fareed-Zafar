export const HEADER_WIDTH = 168;
export const RULER_HEIGHT = 28;
export const VIDEO_TRACK_HEIGHT = 60;
export const AUDIO_TRACK_HEIGHT = 48;
export const SNAP_PX = 8;
export const TAIL_SECONDS = 10;

/** Pick a "nice" major tick interval (seconds) for a zoom level (px/s). */
export function tickInterval(zoom: number, minLabelPx = 80): { major: number; minor: number } {
  const candidates = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  for (const c of candidates) {
    if (c * zoom >= minLabelPx) {
      const minor = c >= 1 ? c / (c === 1 || c === 2 || c === 5 || c === 10 ? 5 : c === 15 || c === 30 ? 3 : 4) : c / 2;
      return { major: c, minor };
    }
  }
  return { major: 1200, minor: 300 };
}

export function timeToX(time: number, zoom: number): number {
  return time * zoom;
}

export function xToTime(x: number, zoom: number): number {
  return Math.max(0, x / zoom);
}

export function trackHeight(kind: 'video' | 'audio'): number {
  return kind === 'video' ? VIDEO_TRACK_HEIGHT : AUDIO_TRACK_HEIGHT;
}
