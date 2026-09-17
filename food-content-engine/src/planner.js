// Template-driven edit planner. Fills each template slot with the best
// available shots, trims them to the slot's pacing and returns a plan the
// exporters can turn into an EDL, a shot list, caption files or a render.

import fs from "node:fs";
import path from "node:path";
import { PROTEINS } from "./taxonomy.js";
import { getPlatform } from "./config.js";
import { round3 } from "./ffmpeg.js";

/** Small deterministic PRNG so the same seed always yields the same variant. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** How well a shot fits a slot's `prefer` block (before diversity/reuse adjustments). */
export function slotScore(shot, slot, { recipe, usedCount = 0, preferUnused = true } = {}) {
  const p = slot.prefer ?? {};
  let score = 0;
  if (p.stages?.length) {
    const i = p.stages.indexOf(shot.stage);
    score += i === -1 ? -6 : 8 - i * 1.5;
  }
  if (p.shotTypes?.length) score += p.shotTypes.includes(shot.shot_type) ? 3 : shot.shot_type ? -1 : 0;
  if (p.cameraMotion?.length) score += p.cameraMotion.includes(shot.camera_motion) ? 2 : 0;
  if (p.actions?.length) score += (shot.actions ?? []).some((a) => p.actions.includes(a)) ? 5 : -2;
  if (p.heroWorthy) score += shot.hero_worthy ? 5 : -3;
  if (p.hookWorthy) score += shot.hook_worthy ? 5 : -3;
  if (p.proteinOnly) score += (shot.ingredients ?? []).some((i) => PROTEINS.includes(i)) ? 4 : -6;
  if (p.minQuality && (shot.quality ?? 3) < p.minQuality) score -= 4;
  if (p.minMotion != null && shot.motion != null && shot.motion < p.minMotion) score -= 5;
  score += (shot.quality ?? 3) * 1.2;
  if (shot.dead) score -= 10;
  if (recipe) {
    if (shot.clip_recipe === recipe) score += 6;
    else if (slot.sameRecipe) return -Infinity;
    else score -= 3;
  }
  if (preferUnused) score += usedCount === 0 ? 3 : -2 * Math.min(usedCount, 3);
  const perPick = slot.seconds / (slot.count ?? 1);
  if (shot.duration < perPick * 0.6) score -= 3;
  return score;
}

/** Parts of a shot not yet used by this plan, longest first. */
function freeIntervals(shot, used, minLen) {
  const taken = [...(used ?? [])].sort((a, b) => a.in - b.in);
  const free = [];
  let cursor = shot.start;
  for (const w of taken) {
    if (w.in - cursor >= minLen) free.push({ start: cursor, end: w.in });
    cursor = Math.max(cursor, w.out);
  }
  if (shot.end - cursor >= minLen) free.push({ start: cursor, end: shot.end });
  return free.sort((a, b) => b.end - b.start - (a.end - a.start));
}

function pickWindow(shot, wanted, pacing, used = [], align = 0.4) {
  const maxShot = pacing.maxShot ?? 3;
  const minShot = pacing.minShot ?? 0.8;
  const free = freeIntervals(shot, used, Math.min(minShot, shot.duration));
  if (!free.length) return null;
  const iv = free[0];
  const len = iv.end - iv.start;
  let d = Math.min(wanted, len, maxShot);
  if (d < minShot) d = Math.min(len, minShot);
  const start = iv.start + Math.max(0, len - d) * align;
  return { in: round3(start), out: round3(start + d), duration: round3(d) };
}

function diversityValues(shot, key) {
  if (!key) return [];
  if (key === "clip") return [shot.clip_id];
  if (key === "actions") return shot.actions ?? [];
  if (key === "ingredients") return shot.ingredients ?? [];
  return [shot[key]];
}

/**
 * Build a plan.
 * @param {object} args
 * @param {import('./db.js').Index} args.ix
 * @param {object} args.config
 * @param {object} args.brand
 * @param {object} args.template
 * @param {string} [args.recipe]   restrict/prioritise a recipe slug
 * @param {string} [args.scope]    "recipe" (default when recipe given) | "library"
 * @param {number|string} [args.seed]
 * @param {object[]} [args.shots]  candidate shots (defaults to the whole index)
 */
export function buildPlan({ ix, config, brand, template, recipe = null, scope, seed = 1, preferUnused = true, shots, name, excludeAi = false }) {
  const platform = getPlatform(brand, template.platform);
  scope = scope ?? template.scope ?? (recipe ? "recipe" : "library");
  const rng = mulberry32(typeof seed === "number" ? seed : hashSeed(seed));
  const used = ix.usageCounts();
  let candidates = shots ?? ix.allShots({ excludeAi });
  if (scope === "recipe" && recipe) candidates = candidates.filter((s) => s.clip_recipe === recipe);
  const pacing = { ...(brand.pacing?.default ?? {}), ...(template.pacing ?? {}) };
  const windows = new Map(); // shot_id → windows already used in this plan
  const clipUse = new Map();
  const states = new Map(template.slots.map((slot) => [slot.id, { slot, filled: 0, picked: [], seen: new Set() }]));

  const scoreFor = (shot, slot, st) => {
    const recipeCtx = scope === "recipe" ? recipe : recipe && slot.sameRecipe ? recipe : null;
    let s = slotScore(shot, slot, { recipe: recipeCtx, usedCount: used.get(shot.id) ?? 0, preferUnused });
    if (s === -Infinity) return s;
    s -= (clipUse.get(shot.clip_id) ?? 0) * 2.5; // spread picks across clips
    s -= (windows.get(shot.id)?.length ?? 0) * 6; // strongly prefer fresh shots over a second window of one
    if (slot.diversify) s -= diversityValues(shot, slot.diversify).filter((v) => st.seen.has(String(v))).length * 4;
    return s + rng() * 1.5; // tie-break jitter → different seeds, different variants
  };

  const fillSlot = (st, minScore, strict) => {
    const { slot } = st;
    const perPick = slot.seconds / slot.count;
    const wantStages = slot.prefer?.stages ?? [];
    let guard = 0;
    while (st.filled < slot.seconds - 0.4 && guard++ < slot.count * 3) {
      let best = null;
      let bestScore = -Infinity;
      let bestWin = null;
      for (const shot of candidates) {
        if (strict && wantStages.length && !wantStages.includes(shot.stage)) continue;
        const s = scoreFor(shot, slot, st);
        if (s < minScore || s <= bestScore) continue;
        const win = pickWindow(shot, Math.min(perPick, slot.seconds - st.filled), pacing, windows.get(shot.id));
        if (!win) continue;
        best = shot;
        bestScore = s;
        bestWin = win;
      }
      if (!best) break;
      windows.set(best.id, [...(windows.get(best.id) ?? []), bestWin]);
      clipUse.set(best.clip_id, (clipUse.get(best.clip_id) ?? 0) + 1);
      for (const v of diversityValues(best, slot.diversify)) st.seen.add(String(v));
      st.filled += bestWin.duration;
      st.picked.push({ shot: best, win: bestWin, score: Math.round(bestScore * 10) / 10 });
    }
  };

  // Pass 1: only shots that genuinely match the slot (stage etc.), so the cook
  // slot cannot eat the plating and hero shots. Pass 2: fill what is still short.
  for (const st of states.values()) fillSlot(st, 0, true);
  for (const st of states.values()) fillSlot(st, -8, false);

  const segments = [];
  const gaps = [];
  for (const st of states.values()) {
    const { slot } = st;
    for (const { shot, win, score } of st.picked) {
      segments.push({
        index: segments.length,
        slot: slot.id,
        shot_id: shot.id,
        clip_id: shot.clip_id,
        path: shot.clip_path,
        filename: shot.clip_filename,
        recipe: shot.clip_recipe,
        in: win.in,
        out: win.out,
        duration: win.duration,
        stage: shot.stage,
        shot_type: shot.shot_type,
        camera_motion: shot.camera_motion,
        actions: shot.actions ?? [],
        ingredients: shot.ingredients ?? [],
        description: shot.description,
        caption: slot.caption ?? null,
        captionKey: slot.caption ?? null,
        caption_suggestion: shot.caption_suggestion,
        hero_worthy: Boolean(shot.hero_worthy),
        hook_worthy: Boolean(shot.hook_worthy),
        has_audio: Boolean(shot.clip_has_audio),
        ai_generated: Boolean(shot.clip_ai_generated),
        quality: shot.quality,
        score,
      });
    }
    if (st.filled < slot.seconds - 0.4) {
      gaps.push({
        slot: slot.id,
        neededSeconds: round3(slot.seconds - st.filled),
        prefer: slot.prefer ?? {},
        reason: st.picked.length ? "not enough matching footage to fill the slot" : "no footage matches this slot",
      });
    }
  }

  const total = round3(segments.reduce((a, s) => a + s.duration, 0));
  const id = `${recipe ?? "library"}__${template.id}__s${typeof seed === "number" ? seed : hashSeed(seed).toString(16)}`;
  return {
    id,
    name: name ?? `${template.name}${recipe ? ` — ${recipe}` : ""}`,
    template: template.id,
    templateName: template.name,
    platform: platform.id,
    width: platform.width,
    height: platform.height,
    fps: platform.fps,
    recipe,
    scope,
    seed,
    targetSeconds: template.targetSeconds,
    totalSeconds: total,
    pacing,
    segments,
    gaps,
    copy: null,
    created_at: new Date().toISOString(),
  };
}

/** output/<plan id>/ */
export function planDir(config, plan) {
  return path.join(config.outputDir, plan.id);
}

export function writePlan(config, plan) {
  const dir = planDir(config, plan);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n");
  return dir;
}

export function summarizePlan(plan) {
  const lines = [`${plan.name}  [${plan.platform} ${plan.width}x${plan.height}]  ${plan.totalSeconds}s / target ${plan.targetSeconds}s  seed ${plan.seed}`];
  for (const s of plan.segments) {
    lines.push(`  ${String(s.index + 1).padStart(2)}. ${s.slot.padEnd(11)} ${s.in.toFixed(2).padStart(7)}-${s.out.toFixed(2).padEnd(7)} ${s.duration.toFixed(1)}s  ${(s.stage ?? "-").padEnd(11)} ${s.filename.slice(0, 48).padEnd(48)} ${s.caption ? "“" + s.caption + "”" : ""}`);
  }
  for (const g of plan.gaps) lines.push(`  GAP ${g.slot}: ${g.neededSeconds}s missing — ${g.reason}`);
  return lines.join("\n");
}
