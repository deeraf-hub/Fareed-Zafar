import { describe, expect, it } from 'vitest';
import { exportDimensions, FORMAT_INFO, RENDERERS } from './index';

describe('export helpers', () => {
  it('scales by the short side with even dimensions and never upscales', () => {
    expect(exportDimensions(1920, 1080, 720)).toEqual({ width: 1280, height: 720 });
    expect(exportDimensions(1920, 1080, 480)).toEqual({ width: 854, height: 480 });
    expect(exportDimensions(1080, 1920, 480)).toEqual({ width: 480, height: 854 });
    expect(exportDimensions(1080, 1080, 480)).toEqual({ width: 480, height: 480 });
    expect(exportDimensions(1080, 1080, 1080)).toEqual({ width: 1080, height: 1080 });
    expect(exportDimensions(1280, 720, 1080)).toEqual({ width: 1280, height: 720 });
    const odd = exportDimensions(1001, 1001, 999);
    expect(odd.width % 2).toBe(0);
  });
  it('registers both browser renderers in priority order', () => {
    expect(RENDERERS.map((r) => r.id)).toEqual(['webcodecs', 'ffmpeg']);
  });
  it('describes every export format', () => {
    expect(Object.keys(FORMAT_INFO)).toEqual(['mp4', 'webm', 'gif']);
    expect(FORMAT_INFO.gif.audio).toBe(false);
    expect(FORMAT_INFO.gif.maxSeconds).toBeLessThanOrEqual(30);
    expect(FORMAT_INFO.webm.mimeType).toBe('video/webm');
  });
});
