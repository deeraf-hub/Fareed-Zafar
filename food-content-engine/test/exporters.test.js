import test from "node:test";
import assert from "node:assert/strict";
import { toEDL } from "../src/exporters/edl.js";
import { toCSV } from "../src/exporters/csv.js";
import { assColor, wrapText, captionEvents, toSRT, toASS } from "../src/exporters/captions.js";
import { buildRenderArgs } from "../src/exporters/render.js";
import { BRAND } from "./helpers.js";

const PLAN = {
  id: "p", name: "Plan, with comma", fps: 30, platform: "tiktok", pacing: { minShot: 0.8, maxShot: 3 },
  segments: [
    { index: 0, slot: "hook", shot_id: 1, clip_id: 1, path: "/lib/a b.mp4", filename: "a b.mp4", in: 1, out: 3.5, duration: 2.5, caption: "40g protein bowl", has_audio: true, stage: "hero", actions: [], ingredients: [] },
    { index: 1, slot: "cook", shot_id: 2, clip_id: 2, path: "/lib/c.mp4", filename: "c.mp4", in: 0, out: 2, duration: 2, caption: "Grill the chicken", has_audio: false, stage: "cooking", actions: ["grilling"], ingredients: ["chicken"] },
    { index: 2, slot: "cook", shot_id: 3, clip_id: 3, path: "/lib/d.mp4", filename: "d.mp4", in: 4, out: 6, duration: 2, caption: "Grill the chicken", has_audio: true, stage: "cooking", actions: ["grilling"], ingredients: ["chicken"] },
  ],
};

test("EDL is CMX3600 with clip-name comments and cumulative record times", () => {
  const edl = toEDL(PLAN);
  const lines = edl.split("\n");
  assert.equal(lines[0], "TITLE: Plan, with comma");
  assert.equal(lines[1], "FCM: NON-DROP FRAME");
  assert.match(edl, /^001  AX       AA\/V  C        00:00:01:00 00:00:03:15 00:00:00:00 00:00:02:15$/m);
  assert.match(edl, /^002  AX       V     C        00:00:00:00 00:00:02:00 00:00:02:15 00:00:04:15$/m);
  assert.match(edl, /^\* FROM CLIP NAME: a b\.mp4$/m);
});

test("CSV escapes commas and quotes", () => {
  const csv = toCSV(PLAN);
  const rows = csv.trim().split("\n");
  assert.equal(rows.length, 4);
  assert.ok(rows[0].startsWith("#,slot,file,in_s,out_s,in_tc,out_tc,duration_s,timeline_start_s,caption"));
  assert.ok(rows[1].includes(",a b.mp4,1,3.5,00:00:01:00,00:00:03:15,2.5,0,40g protein bowl,"));
});

test("caption helpers", () => {
  assert.equal(assColor("#FF6B35"), "&H00356BFF");
  assert.equal(assColor("#000000", 128), "&H80000000");
  assert.deepEqual(wrapText("sear the chicken thighs until golden", 14, 2), ["sear the", "chicken thighs until golden"]);
  const ev = captionEvents(PLAN);
  assert.equal(ev.length, 2, "identical consecutive captions merge");
  assert.deepEqual(ev[1], { start: 2.5, end: 6.5, text: "Grill the chicken" });
  assert.match(toSRT(ev), /^1\n00:00:00,000 --> 00:00:02,500\n40g protein bowl\n/);
});

test("ASS style comes from the brand kit and respects the platform safe zone", () => {
  const ass = toASS(captionEvents(PLAN), { brand: BRAND, platform: { ...BRAND.platforms.tiktok } });
  assert.match(ass, /PlayResX: 1080/);
  assert.match(ass, /Style: Brand,DejaVu Sans,96,&H00FFFFFF,&H003FD2FF,&H00000000,/);
  const marginV = Number(ass.match(/^Style: Brand,.*/m)[0].split(",")[21]);
  assert.ok(marginV >= 400, "caption margin must clear the TikTok bottom UI zone");
  assert.match(ass, /Dialogue: 0,0:00:00\.00,0:00:02\.50,Brand,,0,0,0,,\{\\c&H003FD2FF&?\}?/);
  assert.match(ass, /40g/);
});

test("render args conform every segment, substitute silence for mute clips and burn captions", () => {
  const args = buildRenderArgs({ plan: PLAN, platform: BRAND.platforms.tiktok, outFile: "/out/p.mp4", captionsAss: "/out/cap:tions.ass", music: "/m/track.mp3" });
  const fc = args[args.indexOf("-filter_complex") + 1];
  assert.equal(args.filter((a) => a === "-i").length, 4);
  assert.match(fc, /\[0:v\]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920/);
  assert.match(fc, /anullsrc=r=48000:cl=stereo:d=2\[a1\]/);
  assert.match(fc, /concat=n=3:v=1:a=1\[vc\]\[ac\]/);
  assert.match(fc, /subtitles='\/out\/cap\\:tions\.ass'/);
  assert.match(fc, /amix=inputs=2/);
  assert.match(fc, /loudnorm=I=-14:TP=-1/);
  assert.ok(args.includes("-stream_loop"));
  assert.equal(args[args.length - 1], "/out/p.mp4");
});
