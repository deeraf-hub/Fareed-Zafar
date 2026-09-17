// Quality-control checklist run on every render before it leaves the pipeline.
import fs from "node:fs";
import { probe, loudness } from "./ffmpeg.js";

export async function runQc({ file, plan, platform, brand, captionsAss }) {
  const checks = [];
  const add = (id, status, detail) => checks.push({ id, status, detail });
  if (!fs.existsSync(file)) {
    add("file", "fail", `missing render ${file}`);
    return { file, passed: false, checks };
  }
  const meta = await probe(file);
  const st = fs.statSync(file);

  // Duration
  if (meta.duration > platform.maxSeconds + 0.5) add("duration", "fail", `${meta.duration.toFixed(1)}s exceeds ${platform.label} max ${platform.maxSeconds}s`);
  else if (platform.idealSeconds && (meta.duration < platform.idealSeconds[0] - 0.5 || meta.duration > platform.idealSeconds[1] + 0.5))
    add("duration", "warn", `${meta.duration.toFixed(1)}s is outside the ideal ${platform.idealSeconds[0]}-${platform.idealSeconds[1]}s window`);
  else add("duration", "pass", `${meta.duration.toFixed(1)}s`);

  // Frame
  if (meta.width !== platform.width || meta.height !== platform.height) add("frame", "fail", `${meta.width}x${meta.height}, expected ${platform.width}x${platform.height}`);
  else add("frame", "pass", `${meta.width}x${meta.height}`);
  if (Math.abs(meta.fps - platform.fps) > 0.6) add("fps", "warn", `${meta.fps.toFixed(2)} fps, expected ${platform.fps}`);
  else add("fps", "pass", `${meta.fps.toFixed(2)} fps`);

  // File size
  const mb = st.size / 1048576;
  if (platform.maxFileMB && mb > platform.maxFileMB) add("filesize", "fail", `${mb.toFixed(0)} MB exceeds ${platform.maxFileMB} MB`);
  else add("filesize", "pass", `${mb.toFixed(1)} MB`);

  // Loudness
  if (meta.hasAudio) {
    const l = await loudness(file);
    const target = platform.loudnessLUFS ?? -14;
    const tol = platform.loudnessTolerance ?? 2;
    if (l.integrated == null) add("loudness", "warn", "could not measure");
    else if (Math.abs(l.integrated - target) > tol) add("loudness", "warn", `${l.integrated} LUFS, target ${target}±${tol}`);
    else add("loudness", "pass", `${l.integrated} LUFS`);
    if (l.truePeak != null && l.truePeak > (platform.truePeakMax ?? -1) + 0.1) add("true_peak", "warn", `${l.truePeak} dBTP above ${platform.truePeakMax ?? -1}`);
    else add("true_peak", "pass", `${l.truePeak ?? "n/a"} dBTP`);
  } else add("loudness", "warn", "no audio track");

  // Captions
  if (captionsAss && fs.existsSync(captionsAss)) {
    const ass = fs.readFileSync(captionsAss, "utf8");
    const dialogues = ass.split("\n").filter((l) => l.startsWith("Dialogue:"));
    let covered = 0;
    for (const d of dialogues) {
      const m = d.match(/^Dialogue: \d+,(\d+):(\d+):(\d+)\.(\d+),(\d+):(\d+):(\d+)\.(\d+)/);
      if (m) covered += (+m[5] * 3600 + +m[6] * 60 + +m[7] + +m[8] / 100) - (+m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 100);
    }
    const share = meta.duration ? covered / meta.duration : 0;
    if (!dialogues.length) add("captions", "warn", "caption file has no lines");
    else if (share < 0.7) add("captions", "warn", `captions cover ${(share * 100).toFixed(0)}% of runtime (aim ≥70%)`);
    else add("captions", "pass", `${dialogues.length} lines, ${(share * 100).toFixed(0)}% coverage`);
    const mv = Number((ass.match(/^Style: Brand,[^\n]*/m)?.[0] ?? "").split(",")[21] ?? 0);
    if (platform.safeZone && mv < platform.safeZone.bottom) add("safe_zone", "warn", `caption margin ${mv}px is inside the ${platform.safeZone.bottom}px bottom UI zone`);
    else add("safe_zone", "pass", `caption margin ${mv}px`);
    const longest = Math.max(0, ...dialogues.map((d) => d.split(",,").pop()?.replace(/\{[^}]*\}/g, "").replace(/\\N/g, "\n").split("\n").reduce((a, l) => Math.max(a, l.length), 0) ?? 0));
    const maxChars = brand?.captions?.maxCharsPerLine ?? 22;
    if (longest > maxChars + 4) add("caption_length", "warn", `longest caption line is ${longest} chars (brand max ${maxChars})`);
    else add("caption_length", "pass", `longest line ${longest} chars`);
  } else add("captions", "warn", "no caption file");

  // Plan-derived checks
  if (plan) {
    const segs = plan.segments ?? [];
    let overlap = 0;
    let repeats = 0;
    for (let i = 0; i < segs.length; i++)
      for (let j = i + 1; j < segs.length; j++)
        if (segs[i].shot_id === segs[j].shot_id) {
          repeats++;
          if (segs[i].in < segs[j].out - 0.01 && segs[j].in < segs[i].out - 0.01) overlap++;
        }
    if (overlap) add("unique_shots", "fail", `${overlap} segment pair(s) reuse the same source frames`);
    else if (repeats) add("unique_shots", "warn", `${repeats} shot(s) appear twice (different windows of one take)`);
    else add("unique_shots", "pass", `${segs.length} distinct shots`);
    const avg = segs.length ? segs.reduce((a, s) => a + s.duration, 0) / segs.length : 0;
    const maxShot = plan.pacing?.maxShot ?? 3;
    const minShot = plan.pacing?.minShot ?? 0.8;
    const tooLong = segs.filter((s) => s.duration > maxShot + 0.05).length;
    if (avg > maxShot || avg < minShot) add("pacing", "warn", `average shot ${avg.toFixed(2)}s is outside ${minShot}-${maxShot}s`);
    else if (tooLong) add("pacing", "warn", `${tooLong} shots longer than ${maxShot}s`);
    else add("pacing", "pass", `average shot ${avg.toFixed(2)}s`);
    const first = segs[0];
    if (first && !(first.hook_worthy || first.hero_worthy)) add("hook", "warn", "first shot is not tagged hook-worthy or hero-worthy");
    else if (first) add("hook", "pass", `opens on ${first.stage ?? "?"} (${first.filename})`);
    const aiSec = segs.filter((s) => s.ai_generated).reduce((a, s) => a + s.duration, 0);
    const total = segs.reduce((a, s) => a + s.duration, 0) || 1;
    const maxShare = brand?.aiBroll?.maxShareOfRuntime ?? 0.2;
    if (aiSec / total > maxShare) add("ai_broll_share", "fail", `AI B-roll is ${((aiSec / total) * 100).toFixed(0)}% of runtime (brand max ${maxShare * 100}%)`);
    else add("ai_broll_share", "pass", `${((aiSec / total) * 100).toFixed(0)}% AI B-roll`);
    const heroAi = segs.some((s) => s.ai_generated && (s.slot === "hero" || s.slot === "cta" || s.hero_worthy));
    if (heroAi) add("ai_hero", "fail", "AI-generated footage used for the hero dish");
    if (plan.gaps?.length) add("gaps", "warn", `${plan.gaps.length} slot(s) short of footage: ${plan.gaps.map((g) => g.slot).join(", ")}`);
    else add("gaps", "pass", "every slot filled");
  }

  const passed = !checks.some((c) => c.status === "fail");
  return { file, passed, checks, meta: { duration: meta.duration, width: meta.width, height: meta.height, fps: meta.fps, sizeMB: Math.round(mb * 10) / 10 } };
}

export function formatQc(result) {
  const icon = { pass: "PASS", warn: "WARN", fail: "FAIL" };
  const lines = [`QC ${result.passed ? "PASSED" : "FAILED"}: ${result.file}`];
  for (const c of result.checks) lines.push(`  ${icon[c.status].padEnd(4)} ${c.id.padEnd(16)} ${c.detail}`);
  return lines.join("\n");
}
