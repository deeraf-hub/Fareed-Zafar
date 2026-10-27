import { describe, expect, it } from 'vitest';
import { audioBufferToWav, interleave } from './wav';

function fakeBuffer(channels: number, frames: number, sampleRate = 48000): AudioBuffer {
  const data = Array.from({ length: channels }, (_, c) => Float32Array.from({ length: frames }, (_, i) => ((i + c) % 4) / 4 - 0.5));
  return {
    numberOfChannels: channels,
    length: frames,
    sampleRate,
    duration: frames / sampleRate,
    getChannelData: (c: number) => data[c],
  } as unknown as AudioBuffer;
}

describe('audioBufferToWav', () => {
  it('writes a valid 16-bit PCM header', async () => {
    const blob = audioBufferToWav(fakeBuffer(2, 100));
    const view = new DataView(await blob.arrayBuffer());
    const str = (o: number, n: number) => String.fromCharCode(...new Uint8Array(view.buffer, o, n));
    expect(str(0, 4)).toBe('RIFF');
    expect(str(8, 4)).toBe('WAVE');
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(48000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(100 * 2 * 2);
    expect(blob.size).toBe(44 + 400);
  });
  it('clamps samples', async () => {
    const buf = fakeBuffer(1, 2);
    (buf.getChannelData(0) as Float32Array).set([2, -2]);
    const view = new DataView(await audioBufferToWav(buf).arrayBuffer());
    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(-0x8000);
  });
});

describe('interleave', () => {
  it('interleaves channels and upmixes mono', () => {
    const buf = fakeBuffer(1, 3);
    const out = interleave(buf, 2);
    expect(out.length).toBe(6);
    expect(out[0]).toBe(out[1]);
    expect(out[2]).toBe(out[3]);
  });
});
