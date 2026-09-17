// Integration test for the UI server's JSON API on a tiny synthetic project.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ffmpegAvailable } from "../src/ffmpeg.js";
import { makeClip } from "../scripts/synth.js";
import { initProject, loadConfig, ensureDirs, loadBrandKit } from "../src/config.js";
import { openIndex } from "../src/db.js";
import { ingest } from "../src/ingest.js";
import { analyzeAll } from "../src/analyze.js";
import { startUi } from "../src/ui/server.js";
import { writeSnapshot } from "../src/ui/snapshot.js";
import { tmpDir } from "./helpers.js";

const ff = await ffmpegAvailable();

test("ui server: API, files, jobs and snapshot", { skip: !ff.ok && "ffmpeg not installed" }, async () => {
  const root = tmpDir("fce-ui-");
  initProject(root);
  const config = loadConfig({ project: root, overrides: { render: { preset: "ultrafast", crf: 30 } } });
  ensureDirs(config);
  const brand = loadBrandKit(config);
  const session = path.join(config.library, "01_raw", "2026-09-10_grilled-chicken-bowl");
  for (const [name, segs] of [
    ["20260910_grilled-chicken-bowl_hero_final-dish_closeup_t01.mp4", [{ kind: "motion", seconds: 4, hue: 40 }]],
    ["20260910_grilled-chicken-bowl_cooking_chicken-grilling_closeup_t01.mp4", [{ kind: "motion", seconds: 4, hue: 100 }]],
    ["20260910_grilled-chicken-bowl_cooking_sauce-pouring_closeup_t01.mp4", [{ kind: "motion", seconds: 3, hue: 300 }]],
    ["20260910_grilled-chicken-bowl_plating_assembling_overhead_t01.mp4", [{ kind: "motion", seconds: 3, hue: 240 }]],
  ]) await makeClip(path.join(session, name), segs, { width: 320, height: 180 });
  const ix = openIndex(config.dbPath);
  await ingest(config, ix);
  await analyzeAll(config, ix, brand, { mode: "offline" });

  const { server, url } = await startUi({ config, brand, ix, port: 0 });
  try {
    const get = async (p) => { const r = await fetch(url + p); return { status: r.status, body: await r.json() }; };
    const send = async (m, p, b) => { const r = await fetch(url + p, { method: m, headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); return { status: r.status, body: await r.json() }; };

    const status = await get("/api/status");
    assert.equal(status.body.stats.clips.n, 4);
    assert.equal(status.body.templates.length, 6);
    const clips = await get("/api/clips");
    assert.equal(clips.body.length, 4);
    assert.match(clips.body[0].poster, /^\/frames\//);
    const clip = await get(`/api/clips/${clips.body[0].id}`);
    assert.ok(clip.body.shots.length >= 1);
    const frame = await fetch(url + clip.body.shots[0].frames[0]);
    assert.equal(frame.status, 200);
    assert.equal(frame.headers.get("content-type"), "image/jpeg");
    const traversal = await fetch(url + "/frames/..%2Ffce.config.json");
    assert.notEqual(traversal.status, 200);

    const search = await get("/api/shots?q=" + encodeURIComponent("close-up shots of pouring sauce") + "&limit=5");
    assert.equal(search.body.results[0].actions[0], "pouring");
    assert.equal(search.body.results[0].matched, 3);

    const shotId = search.body.results[0].id;
    const patched = await send("PATCH", `/api/shots/${shotId}`, { quality: 5, hook_worthy: true, keywords: ["glossy"] });
    assert.equal(patched.body.quality, 5);
    assert.equal(patched.body.hook_worthy, true);
    const again = await get("/api/shots?q=glossy");
    assert.ok(again.body.results.some((s) => s.id === shotId), "edited keyword is searchable");

    const job = await send("POST", "/api/jobs", { type: "plan", template: "short-hook-first-20s", recipe: "grilled-chicken-bowl", seed: 1, info: "protein_grams=42", offline: true, render: true });
    assert.equal(job.status, 200);
    let j;
    for (let i = 0; i < 600; i++) {
      j = (await get(`/api/jobs/${job.body.id}`)).body;
      if (j.status === "done" || j.status === "failed") break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(j.status, "done", j.error);
    const planId = j.result.planId;
    const plans = await get("/api/plans");
    assert.ok(plans.body.some((p) => p.id === planId && p.files.mp4 && p.qc));
    const detail = await get(`/api/plans/${encodeURIComponent(planId)}`);
    assert.ok(detail.body.plan.segments[0].frames.length >= 1);
    assert.equal(detail.body.platform.width, 1080);
    const video = await fetch(url + detail.body.files.mp4, { headers: { range: "bytes=0-9" } });
    assert.equal(video.status, 206);
    assert.equal(video.headers.get("content-range").startsWith("bytes 0-9/"), true);

    // edit a caption through the API → files re-exported
    const edited = JSON.parse(JSON.stringify(detail.body.plan));
    edited.segments[0].caption = "Hello from the UI";
    const put = await send("PUT", `/api/plans/${encodeURIComponent(planId)}`, { plan: edited });
    assert.equal(put.status, 200);
    assert.match(fs.readFileSync(path.join(config.outputDir, planId, "captions.srt"), "utf8"), /Hello from the UI/);

    const report = await get("/api/report");
    assert.ok(report.body.recipes.length === 1);
    const brandGet = await get("/api/brand");
    assert.equal(brandGet.body.kit.brand.name, brand.brand.name);
    const bad = await send("PUT", "/api/brand", { kit: { brand: {} } });
    assert.equal(bad.status, 400);
    const broll = await send("POST", "/api/jobs", { type: "broll", needs: ["steam rising off rice"], offline: true });
    for (let i = 0; i < 100; i++) {
      j = (await get(`/api/jobs/${broll.body.id}`)).body;
      if (j.status === "done" || j.status === "failed") break;
      await new Promise((r) => setTimeout(r, 50));
    }
    assert.equal(j.status, "done", j.error);
    assert.equal((await get("/api/broll")).body.length, 1);
    assert.equal((await get("/api/nope")).status, 404);

    const snap = await writeSnapshot({ config, brand, ix, api: server.api, outFile: path.join(root, "snapshot.html"), thumbWidth: 160 });
    assert.ok(snap.thumbnails > 0);
    const html = fs.readFileSync(snap.outFile, "utf8");
    assert.match(html, /id="fce-snapshot"/);
    assert.ok(!/\/frames\//.test(html.split('id="fce-snapshot"')[1].slice(0, 200000)), "snapshot data has no server frame URLs left");
  } finally {
    await new Promise((r) => server.close(r));
    ix.close();
  }
});
