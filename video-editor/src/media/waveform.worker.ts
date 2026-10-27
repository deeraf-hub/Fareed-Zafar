/// <reference lib="webworker" />
/**
 * Computes evenly spaced peak values from decoded PCM channels. Runs in a
 * Web Worker so large files do not block the editor UI.
 */
export interface WaveformRequest {
  channels: Float32Array[];
  buckets: number;
}

self.onmessage = (e: MessageEvent<WaveformRequest>) => {
  const { channels, buckets } = e.data;
  const length = channels[0]?.length ?? 0;
  const peaks = new Float32Array(buckets);
  if (length === 0) {
    self.postMessage(Array.from(peaks));
    return;
  }
  const step = length / buckets;
  for (let b = 0; b < buckets; b++) {
    const from = Math.floor(b * step);
    const to = Math.min(length, Math.floor((b + 1) * step));
    let peak = 0;
    for (const ch of channels) {
      for (let i = from; i < to; i += 1) {
        const v = Math.abs(ch[i]);
        if (v > peak) peak = v;
      }
    }
    peaks[b] = peak;
  }
  // Normalise so the loudest bucket touches 1.
  let max = 0;
  for (let i = 0; i < buckets; i++) if (peaks[i] > max) max = peaks[i];
  if (max > 0) for (let i = 0; i < buckets; i++) peaks[i] = peaks[i] / max;
  self.postMessage(Array.from(peaks));
};
