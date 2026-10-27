/**
 * Decode an audio or video file's audio track into an AudioBuffer. Chrome's
 * decodeAudioData handles MP4/WebM/MP3/WAV/OGG containers directly.
 */
const cache = new Map<string, Promise<AudioBuffer | null>>();
let sharedCtx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!sharedCtx) sharedCtx = new AudioContext();
  return sharedCtx;
}

export function decodeAudio(assetId: string, blob: Blob): Promise<AudioBuffer | null> {
  let p = cache.get(assetId);
  if (!p) {
    p = (async () => {
      try {
        const data = await blob.arrayBuffer();
        return await ctx().decodeAudioData(data);
      } catch {
        return null;
      }
    })();
    cache.set(assetId, p);
  }
  return p;
}

export function forgetDecodedAudio(assetId: string): void {
  cache.delete(assetId);
}

export async function computeWaveform(buffer: AudioBuffer, buckets = 240): Promise<number[]> {
  const channels: Float32Array[] = [];
  for (let c = 0; c < Math.min(2, buffer.numberOfChannels); c++) {
    // Copy so the buffer stays usable after transfer.
    channels.push(buffer.getChannelData(c).slice());
  }
  const worker = new Worker(new URL('./waveform.worker.ts', import.meta.url), { type: 'module' });
  try {
    return await new Promise<number[]>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<number[]>) => resolve(e.data.map((v) => Math.round(v * 100) / 100));
      worker.onerror = (e) => reject(e.error ?? new Error('waveform worker failed'));
      worker.postMessage(
        { channels, buckets },
        channels.map((c) => c.buffer),
      );
    });
  } finally {
    worker.terminate();
  }
}
