export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function roundTo(value: number, decimals = 3): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** 00:00.000 or 00:00:00.00 style timecode. */
export function formatTime(seconds: number, opts: { fps?: number; showMs?: boolean } = {}): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  let tail: string;
  if (opts.fps) {
    const frame = Math.floor((s - Math.floor(s)) * opts.fps);
    tail = `:${pad(frame)}`;
  } else if (opts.showMs === false) {
    tail = '';
  } else {
    const ms = Math.floor((s - Math.floor(s)) * 1000);
    tail = `.${ms.toString().padStart(3, '0')}`;
  }
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}${tail}` : `${pad(m)}:${pad(sec)}${tail}`;
}

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d ago`;
  return new Date(ts).toLocaleDateString();
}
