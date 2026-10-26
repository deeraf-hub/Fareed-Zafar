import { describe, expect, it } from 'vitest';
import { formatBytes, formatTime, roundTo } from './time';

describe('time helpers', () => {
  it('formats timecodes', () => {
    expect(formatTime(0)).toBe('00:00.000');
    expect(formatTime(65.5)).toBe('01:05.500');
    expect(formatTime(3725, { showMs: false })).toBe('01:02:05');
    expect(formatTime(1.5, { fps: 30 })).toBe('00:01:15');
  });
  it('formats bytes and rounds', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(roundTo(1.23456)).toBe(1.235);
  });
});
