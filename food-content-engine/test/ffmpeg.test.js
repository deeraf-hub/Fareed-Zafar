import test from "node:test";
import assert from "node:assert/strict";
import { buildShots, timecode, clock } from "../src/ffmpeg.js";

test("buildShots merges fragments below minShot and splits takes above maxShot", () => {
  const shots = buildShots([0.3, 5, 5.4, 30], 42, { minShot: 0.8, maxShot: 10 });
  // 0-0.3 merged forward, 5-5.4 merged into previous, 5.4-30 split into 3 parts, 30-42 split into 2
  assert.equal(shots[0].start, 0);
  assert.ok(shots.every((s) => s.duration <= 10.001), "no shot longer than maxShot");
  assert.ok(shots.every((s) => s.duration >= 0.8), "no shot shorter than minShot");
  assert.equal(shots[shots.length - 1].end, 42);
  assert.deepEqual(shots.map((s) => s.idx), shots.map((_, i) => i));
});

test("buildShots on a clip with no cuts returns evenly split shots", () => {
  const shots = buildShots([], 25, { minShot: 0.8, maxShot: 10 });
  assert.equal(shots.length, 3);
  assert.equal(Math.round(shots[0].duration * 100) / 100, 8.33);
});

test("timecode and clocks", () => {
  assert.equal(timecode(3.5, 30), "00:00:03:15");
  assert.equal(timecode(3661, 25), "01:01:01:00");
  assert.equal(clock(3.5), "00:00:03,500");
  assert.equal(clock(3.5, { ms: false }), "0:00:03.50");
});
