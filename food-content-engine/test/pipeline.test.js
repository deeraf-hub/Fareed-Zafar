// Integration test: synthetic footage → ingest → analyze (offline) → plan → export → render → QC.
// Skipped automatically when ffmpeg is not installed.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ffmpegAvailable } from "../src/ffmpeg.js";
import { makeClip } from "../scripts/synth.js";
import { initProject, loadConfig, ensureDirs, loadBrandKit, getPlatform } from "../src/config.js";
import { openIndex } from "../src/db.js";
import { ingest } from "../src/ingest.js";
import { analyzeAll } from "../src/analyze.js";
import { getTemplate } from "../src/templates.js";
import { producePlan } from "../src/variants.js";
import { libraryReport } from "../src/report.js";
import { needsFromPlan, offlinePrompts, writePromptSheet, pickReference } from "../src/broll.js";
import { tmpDir } from "./helpers.js";

const ff = await ffmpegAvailable();

test("end-to-end offline pipeline on synthetic footage", { skip: !ff.ok && "ffmpeg not installed" }, async () => {
  const root = tmpDir("fce-e2e-");
  initProject(root);
  const config = loadConfig({ project: root, overrides: { render: { preset: "ultrafast", crf: 30 } } });
  ensureDirs(config);
  const brand = loadBrandKit(config);
  const session = path.join(config.library, "01_raw", "2026-09-10_grilled-chicken-bowl");
  const clips = [
    ["20260910_grilled-chicken-bowl_hero_final-dish_closeup_t01.mp4", [{ kind: "motion", seconds: 4, hue: 40 }]],
    ["20260910_grilled-chicken-bowl_ingredients_chicken-rice_overhead_t01.mp4", [{ kind: "motion", seconds: 3, hue: 20 }]],
    ["20260910_grilled-chicken-bowl_cooking_chicken-grilling_closeup_t01.mp4", [{ kind: "motion", seconds: 4, hue: 100 }, { kind: "static", seconds: 2, color: "0x552211" }]],
    ["20260910_grilled-chicken-bowl_cooking_sauce-pouring_closeup_t01.mp4", [{ kind: "motion", seconds: 3, hue: 300 }]],
    ["20260910_grilled-chicken-bowl_plating_assembling_overhead_t01.mp4", [{ kind: "motion", seconds: 3, hue: 240 }]],
  ];
  for (const [name, segs] of clips) await makeClip(path.join(session, name), segs, { width: 320, height: 180, audio: name.includes("hero") ? false : true });

  const ix = openIndex(config.dbPath);
  const ing = await ingest(config, ix);
  assert.equal(ing.added, 5);
  const an = await analyzeAll(config, ix, brand, { mode: "offline" });
  assert.equal(an.analyzed, 5);
  assert.ok(an.shots >= 6, "scene detection should split the grilling clip");
  assert.ok(an.dead >= 1, "the static colour card must be flagged dead");
  const shots = ix.allShots({ includeDead: true });
  assert.ok(shots.every((s) => s.frames.length >= 1 && fs.existsSync(s.frames[0])), "keyframes extracted");

  const template = getTemplate(config, "short-hook-first-20s");
  const r = await producePlan({ config, brand, ix, template, recipe: "grilled-chicken-bowl", seed: 1, info: { protein_grams: 42 }, mode: "offline", render: true });
  assert.ok(r.plan.segments.length >= 4);
  assert.equal(r.plan.segments[0].stage, "hero", "hook slot takes the hero shot");
  assert.ok(!r.plan.segments.some((s) => s.shot_id === shots.find((x) => x.dead)?.id), "dead shots are never planned");
  for (const f of [r.files.edl, r.files.csv, r.files.srt, r.files.ass, path.join(r.files.dir, "plan.json"), path.join(r.files.dir, "post-copy.md"), path.join(r.files.dir, "render.sh")]) assert.ok(fs.existsSync(f), `missing ${f}`);
  assert.ok(r.render.rendered && fs.existsSync(r.render.outFile));
  assert.equal(r.qc.meta.width, 1080);
  assert.equal(r.qc.meta.height, 1920);
  assert.ok(r.qc.checks.find((c) => c.id === "frame").status === "pass");
  assert.ok(r.qc.checks.find((c) => c.id === "captions").status === "pass", JSON.stringify(r.qc.checks));
  assert.ok(r.qc.checks.find((c) => c.id === "loudness").status === "pass", JSON.stringify(r.qc.checks));
  assert.equal(ix.usageCounts().size, new Set(r.plan.segments.map((s) => s.shot_id)).size, "usage recorded");

  const report = libraryReport(ix, brand);
  assert.match(report.markdown, /grilled-chicken-bowl/);
  assert.match(report.markdown, /Missing/);
  const needs = [...needsFromPlan(r.plan), { need: "steam rising off rice", seconds: 3 }];
  const sheet = writePromptSheet(path.join(config.outputDir, "broll"), { requests: offlinePrompts(needs, brand), reference: pickReference(ix, { stage: "hero" }), brand, needs });
  assert.ok(fs.existsSync(sheet.md));
  ix.close();
});
