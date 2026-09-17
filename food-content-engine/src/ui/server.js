// Local web UI for the engine: a small HTTP server (no dependencies) that
// serves the single-page app in index.html, a JSON API over the index and
// the project's outputs, keyframes, rendered drafts, and a job queue for
// the long-running actions (analyze, plan, variants, render, qc, broll).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ffmpegAvailable } from "../ffmpeg.js";
import { resolveMode, hasCredentials, usageSummary, resetUsage } from "../ai.js";
import { parseQuery, searchShots, unusedFootage, emptyFilter } from "../search.js";
import { loadTemplates, getTemplate } from "../templates.js";
import { parseInfo } from "../copy.js";
import { producePlan, produceVariants, exportPlanFiles } from "../variants.js";
import { renderPlan } from "../exporters/render.js";
import { runQc } from "../qc.js";
import { libraryReport } from "../report.js";
import { needsFromPlan, pickReference, offlinePrompts, claudePrompts, writePromptSheet } from "../broll.js";
import { ingest } from "../ingest.js";
import { analyzeAll, analyzeClip } from "../analyze.js";
import { getPlatform, loadBrandKit } from "../config.js";
import { SYNONYMS, INGREDIENTS, INGREDIENT_SYNONYMS, PROTEINS, STAGES, SHOT_TYPES, CAMERA_MOTION, ACTIONS } from "../taxonomy.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".mp4": "video/mp4", ".edl": "text/plain; charset=utf-8", ".csv": "text/csv; charset=utf-8", ".srt": "text/plain; charset=utf-8",
  ".ass": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".sh": "text/plain; charset=utf-8", ".txt": "text/plain; charset=utf-8",
};

function json(res, status, body) {
  const s = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(s);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 5e6) reject(new Error("body too large"));
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error("invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

/** Serve a file with Range support (so <video> can seek). Guards against path traversal. */
function sendFile(req, res, root, rel, { download = false } = {}) {
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(path.resolve(root) + path.sep) && abs !== path.resolve(root)) return json(res, 403, { error: "forbidden" });
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return json(res, 404, { error: "not found" });
  const st = fs.statSync(abs);
  const type = MIME[path.extname(abs).toLowerCase()] ?? "application/octet-stream";
  const headers = { "content-type": type, "accept-ranges": "bytes", "cache-control": type.startsWith("image") ? "max-age=3600" : "no-cache" };
  if (download) headers["content-disposition"] = `attachment; filename="${path.basename(abs)}"`;
  const range = req.headers.range;
  if (range) {
    const m = range.match(/bytes=(\d*)-(\d*)/);
    let start = m && m[1] ? Number(m[1]) : 0;
    let end = m && m[2] ? Number(m[2]) : st.size - 1;
    if (start > end || start >= st.size) {
      res.writeHead(416, { "content-range": `bytes */${st.size}` });
      return res.end();
    }
    end = Math.min(end, st.size - 1);
    res.writeHead(206, { ...headers, "content-range": `bytes ${start}-${end}/${st.size}`, "content-length": end - start + 1 });
    return fs.createReadStream(abs, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...headers, "content-length": st.size });
  fs.createReadStream(abs).pipe(res);
}

// ---- data shaping -------------------------------------------------------------

function frameUrl(config, absFrame) {
  return "/frames/" + path.relative(config.framesDir, absFrame).split(path.sep).join("/");
}

function shapeShot(config, s) {
  return {
    id: s.id, clip_id: s.clip_id, idx: s.idx, start: s.start, end: s.end, duration: s.duration, motion: s.motion, dead: s.dead,
    frames: (s.frames ?? []).map((f) => frameUrl(config, f)),
    shot_type: s.shot_type, camera_motion: s.camera_motion, stage: s.stage, dish: s.dish, description: s.description,
    ingredients: s.ingredients, actions: s.actions, keywords: s.keywords, quality: s.quality, hero_worthy: s.hero_worthy, hook_worthy: s.hook_worthy,
    has_face: s.has_face, has_hands: s.has_hands, lighting: s.lighting, caption_suggestion: s.caption_suggestion,
    clip_filename: s.clip_filename, clip_recipe: s.clip_recipe, clip_session: s.clip_session, clip_source_type: s.clip_source_type,
    clip_ai_generated: s.clip_ai_generated, clip_duration: s.clip_duration, clip_width: s.clip_width, clip_height: s.clip_height,
    score: s.score, matched: s.matched, facets: s.facets, used: s.used,
  };
}

function listPlans(config, brand) {
  if (!fs.existsSync(config.outputDir)) return [];
  const out = [];
  for (const d of fs.readdirSync(config.outputDir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const planFile = path.join(config.outputDir, d.name, "plan.json");
    if (!fs.existsSync(planFile)) continue;
    try {
      const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
      out.push(planSummary(config, brand, plan, d.name));
    } catch {
      /* skip broken */
    }
  }
  return out.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}

function planFiles(config, id) {
  const dir = path.join(config.outputDir, id);
  const files = {};
  if (!fs.existsSync(dir)) return files;
  for (const f of fs.readdirSync(dir)) {
    const ext = path.extname(f).toLowerCase();
    const key = f === "plan.json" ? "plan" : f === "qc.json" ? "qc" : f === "captions.srt" ? "srt" : f === "captions.ass" ? "ass" : f === "shotlist.csv" ? "csv" : f === "post-copy.md" ? "copy" : f === "render.sh" ? "script" : ext === ".edl" ? "edl" : ext === ".mp4" ? "mp4" : null;
    if (key) files[key] = `/output/${encodeURIComponent(id)}/${encodeURIComponent(f)}`;
  }
  return files;
}

function planSummary(config, brand, plan, id) {
  const qcFile = path.join(config.outputDir, id, "qc.json");
  let qc = null;
  if (fs.existsSync(qcFile)) {
    try {
      const q = JSON.parse(fs.readFileSync(qcFile, "utf8"));
      qc = { passed: q.passed, warn: q.checks.filter((c) => c.status === "warn").length, fail: q.checks.filter((c) => c.status === "fail").length };
    } catch {
      /* ignore */
    }
  }
  const first = plan.segments?.[0];
  const ix = getIx();
  let poster = null;
  if (first && ix) {
    const s = ix.getShot(first.shot_id);
    if (s?.frames?.[1] || s?.frames?.[0]) poster = frameUrl(config, s.frames[1] ?? s.frames[0]);
  }
  return {
    id, name: plan.name, template: plan.template, templateName: plan.templateName, platform: plan.platform, width: plan.width, height: plan.height,
    recipe: plan.recipe, seed: plan.seed, targetSeconds: plan.targetSeconds, totalSeconds: plan.totalSeconds, segments: plan.segments?.length ?? 0,
    gaps: plan.gaps?.length ?? 0, created_at: plan.created_at, copy: plan.copy, files: planFiles(config, id), qc, poster,
  };
}

let _ix = null;
function getIx() {
  return _ix;
}

function planDetail(config, brand, id) {
  const file = path.join(config.outputDir, id, "plan.json");
  if (!fs.existsSync(file)) return null;
  const plan = JSON.parse(fs.readFileSync(file, "utf8"));
  const ix = getIx();
  plan.segments = (plan.segments ?? []).map((seg) => {
    const s = ix ? ix.getShot(seg.shot_id) : null;
    return { ...seg, frames: s ? (s.frames ?? []).map((f) => frameUrl(config, f)) : [], quality: seg.quality ?? s?.quality ?? null };
  });
  const qcFile = path.join(config.outputDir, id, "qc.json");
  const qc = fs.existsSync(qcFile) ? JSON.parse(fs.readFileSync(qcFile, "utf8")) : null;
  const copyFile = path.join(config.outputDir, id, "post-copy.md");
  const platform = (() => {
    try {
      return getPlatform(brand, plan.platform);
    } catch {
      return null;
    }
  })();
  return { plan, qc, files: planFiles(config, id), postCopy: fs.existsSync(copyFile) ? fs.readFileSync(copyFile, "utf8") : null, platform };
}

function listBroll(config) {
  const dir = path.join(config.outputDir, "broll");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse()
    .map((f) => {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      const ref = data.reference;
      return { file: f, md: `/output/broll/${encodeURIComponent(f.replace(/\.json$/, ".md"))}`, generated: data.generated, reference: ref ? { ...ref, frameUrl: ref.frame && fs.existsSync(ref.frame) ? frameUrl(config, ref.frame) : null } : null, requests: data.requests };
    });
}

// ---- jobs ----------------------------------------------------------------------

class Jobs {
  constructor() {
    this.list = [];
    this.running = false;
    this.seq = 0;
  }
  add(type, params, run) {
    const job = { id: `job-${++this.seq}`, type, params, status: "queued", log: [], result: null, error: null, created_at: new Date().toISOString(), finished_at: null };
    job._run = run;
    this.list.unshift(job);
    if (this.list.length > 50) this.list.length = 50;
    this.pump();
    return job;
  }
  async pump() {
    if (this.running) return;
    const next = [...this.list].reverse().find((j) => j.status === "queued");
    if (!next) return;
    this.running = true;
    next.status = "running";
    next.started_at = new Date().toISOString();
    try {
      next.result = await next._run((line) => next.log.push(line));
      next.status = "done";
    } catch (err) {
      next.status = "failed";
      next.error = err.message;
      next.log.push(`error: ${err.message}`);
    } finally {
      next.finished_at = new Date().toISOString();
      this.running = false;
      this.pump();
    }
  }
  get(id) {
    return this.list.find((j) => j.id === id) ?? null;
  }
  public() {
    return this.list.map(({ _run, ...j }) => j);
  }
}

// ---- server ----------------------------------------------------------------------

export function createUiServer({ config, brand, ix }) {
  _ix = ix;
  const jobs = new Jobs();
  let brandKit = brand;
  const reloadBrand = () => (brandKit = loadBrandKit(config));

  const api = {
    async "GET /api/status"() {
      const ff = await ffmpegAvailable();
      const mode = (() => {
        try {
          return resolveMode(config);
        } catch {
          return "offline";
        }
      })();
      return {
        project: config.root, library: config.library, outputDir: config.outputDir, brandKit: config.brandKit, brandName: brandKit.brand?.name,
        ffmpeg: ff.ok ? ff.ffmpeg : null, aiMode: mode, model: config.ai.model, hasKey: hasCredentials(), stats: ix.stats(),
        templates: [...loadTemplates(config).values()].map((t) => ({ id: t.id, name: t.name, platform: t.platform, targetSeconds: t.targetSeconds, slots: t.slots.length, description: t.description })),
        recipes: recipes(), usage: usageSummary(),
      };
    },
    "GET /api/clips"(q) {
      const clips = ix.listClips({ recipe: q.get("recipe") || undefined, sourceType: q.get("source") || undefined });
      const shotsByClip = new Map();
      for (const s of ix.allShots({ includeDead: true })) {
        if (!shotsByClip.has(s.clip_id)) shotsByClip.set(s.clip_id, []);
        shotsByClip.get(s.clip_id).push(s);
      }
      return clips.map((c) => {
        const shots = shotsByClip.get(c.id) ?? [];
        return {
          id: c.id, filename: c.filename, rel_path: c.rel_path, recipe: c.recipe, session: c.session, source_type: c.source_type, ai_generated: c.ai_generated,
          duration: c.duration, width: c.width, height: c.height, fps: c.fps, has_audio: c.has_audio, status: c.status, analysis_mode: c.analysis_mode,
          dish: c.dish, protein: c.protein, media_created: c.media_created, shots: shots.length, dead: shots.filter((s) => s.dead).length,
          hero: shots.filter((s) => s.hero_worthy).length, hook: shots.filter((s) => s.hook_worthy).length,
          poster: shots[0]?.frames?.[1] ? frameUrl(config, shots[0].frames[1]) : shots[0]?.frames?.[0] ? frameUrl(config, shots[0].frames[0]) : null,
          stages: [...new Set(shots.map((s) => s.stage).filter(Boolean))],
        };
      });
    },
    "GET /api/clips/:id"(q, params) {
      const clip = ix.getClip(Number(params.id));
      if (!clip) throw Object.assign(new Error("clip not found"), { status: 404 });
      const used = ix.usageCounts();
      const shots = ix.allShots({ includeDead: true }).filter((s) => s.clip_id === clip.id).map((s) => shapeShot(config, { ...s, used: used.get(s.id) ?? 0 }));
      return { clip, shots, transcript: ix.getTranscript(clip.id) };
    },
    "GET /api/shots/:id"(q, params) {
      const s = ix.getShot(Number(params.id));
      if (!s) throw Object.assign(new Error("shot not found"), { status: 404 });
      return shapeShot(config, { ...s, used: ix.usageCounts().get(s.id) ?? 0 });
    },
    async "PATCH /api/shots/:id"(q, params, body) {
      const s = ix.updateShot(Number(params.id), body ?? {});
      if (!s) throw Object.assign(new Error("shot not found"), { status: 404 });
      return shapeShot(config, { ...s, used: ix.usageCounts().get(s.id) ?? 0 });
    },
    async "GET /api/shots"(q) {
      const query = (q.get("q") ?? "").trim();
      const mode = query && q.get("ai") !== "0" ? (() => { try { return resolveMode(config); } catch { return "offline"; } })() : "offline";
      const { filter, mode: usedMode } = query ? await parseQuery(query, { config, mode }) : { filter: emptyFilter(), mode: "none" };
      const results = searchShots(ix, filter, {
        limit: Number(q.get("limit") ?? 60), unusedOnly: q.get("unused") === "1", strict: q.get("strict") === "1",
        recipe: q.get("recipe") || undefined, includeDead: q.get("dead") === "1",
      });
      return { query, filter, mode: usedMode, results: results.map((s) => shapeShot(config, s)) };
    },
    "GET /api/recipes"() {
      return recipes();
    },
    "GET /api/templates"() {
      return [...loadTemplates(config).values()];
    },
    "GET /api/plans"() {
      return listPlans(config, brandKit);
    },
    "GET /api/plans/:id"(q, params) {
      const d = planDetail(config, brandKit, params.id);
      if (!d) throw Object.assign(new Error("plan not found"), { status: 404 });
      return d;
    },
    async "PUT /api/plans/:id"(q, params, body) {
      // Manual tweak from the UI: swap a shot, trim, rewrite a caption → re-export files.
      const file = path.join(config.outputDir, params.id, "plan.json");
      if (!fs.existsSync(file)) throw Object.assign(new Error("plan not found"), { status: 404 });
      const plan = JSON.parse(fs.readFileSync(file, "utf8"));
      const incoming = body?.plan;
      if (!incoming || incoming.id !== plan.id) throw Object.assign(new Error("plan id mismatch"), { status: 400 });
      const clean = { ...plan, segments: incoming.segments.map((s) => { const { frames, ...rest } = s; return rest; }), copy: incoming.copy ?? plan.copy };
      clean.totalSeconds = Math.round(clean.segments.reduce((a, s) => a + s.duration, 0) * 1000) / 1000;
      ix.savePlan(clean);
      exportPlanFiles(config, brandKit, clean);
      return planDetail(config, brandKit, params.id);
    },
    "GET /api/report"() {
      const r = libraryReport(ix, brandKit);
      return { markdown: r.markdown, ...r.data };
    },
    "GET /api/unused"(q) {
      return unusedFootage(ix, { minQuality: Number(q.get("minQuality") ?? 3), recipe: q.get("recipe") || undefined });
    },
    "GET /api/brand"() {
      const { _path, _dir, ...kit } = brandKit;
      return { path: config.brandKit, kit };
    },
    async "PUT /api/brand"(q, params, body) {
      const kit = body?.kit;
      if (!kit || typeof kit !== "object" || !kit.platforms || !kit.captions) throw Object.assign(new Error("brand kit must include platforms and captions"), { status: 400 });
      fs.copyFileSync(config.brandKit, config.brandKit + ".bak");
      fs.writeFileSync(config.brandKit, JSON.stringify(kit, null, 2) + "\n");
      reloadBrand();
      const { _path, _dir, ...clean } = brandKit;
      return { path: config.brandKit, kit: clean, backup: config.brandKit + ".bak" };
    },
    "GET /api/broll"() {
      return listBroll(config);
    },
    "GET /api/jobs"() {
      return jobs.public();
    },
    "GET /api/jobs/:id"(q, params) {
      const j = jobs.get(params.id);
      if (!j) throw Object.assign(new Error("job not found"), { status: 404 });
      const { _run, ...pub } = j;
      return pub;
    },
    async "POST /api/jobs"(q, params, body) {
      const { type, ...p } = body ?? {};
      const mode = () => { try { return p.offline ? "offline" : resolveMode(config); } catch { return "offline"; } };
      const runners = {
        plan: (log) => producePlan({ config, brand: brandKit, ix, template: getTemplate(config, p.template), recipe: p.recipe || null, seed: Number(p.seed ?? 1), info: typeof p.info === "string" ? parseInfo(p.info) : p.info ?? {}, mode: mode(), render: Boolean(p.render), music: p.music || null, scope: p.scope || undefined, log }).then((r) => ({ planId: r.plan.id, gaps: r.plan.gaps.length, qc: r.qc ? { passed: r.qc.passed } : null })),
        variants: (log) => produceVariants({ config, brand: brandKit, ix, set: p.set || "default", templates: p.templates?.length ? p.templates : null, recipe: p.recipe || null, seed: Number(p.seed ?? 1), info: typeof p.info === "string" ? parseInfo(p.info) : p.info ?? {}, mode: mode(), render: Boolean(p.render), music: p.music || null, log }).then((rs) => ({ plans: rs.map((r) => ({ planId: r.plan.id, gaps: r.plan.gaps.length, qc: r.qc ? { passed: r.qc.passed } : null })) })),
        render: async (log) => {
          const d = planDetail(config, brandKit, p.planId);
          if (!d) throw new Error("plan not found");
          const dir = path.join(config.outputDir, p.planId);
          const ass = path.join(dir, "captions.ass");
          const platform = getPlatform(brandKit, d.plan.platform);
          log(`rendering ${p.planId} (${d.plan.segments.length} segments)`);
          const { plan } = JSON.parse(JSON.stringify(d));
          const r = await renderPlan({ plan, platform, dir, brand: brandKit, captionsAss: fs.existsSync(ass) ? ass : null, music: p.music || null, preset: config.render?.preset, crf: config.render?.crf });
          log(`rendered in ${(r.ms / 1000).toFixed(1)}s`);
          const qc = await runQc({ file: r.outFile, plan, platform, brand: brandKit, captionsAss: ass });
          fs.writeFileSync(path.join(dir, "qc.json"), JSON.stringify(qc, null, 2) + "\n");
          return { planId: p.planId, qc: { passed: qc.passed } };
        },
        qc: async () => {
          const d = planDetail(config, brandKit, p.planId);
          if (!d) throw new Error("plan not found");
          const dir = path.join(config.outputDir, p.planId);
          const platform = getPlatform(brandKit, d.plan.platform);
          const qc = await runQc({ file: path.join(dir, `${p.planId}.mp4`), plan: d.plan, platform, brand: brandKit, captionsAss: path.join(dir, "captions.ass") });
          fs.writeFileSync(path.join(dir, "qc.json"), JSON.stringify(qc, null, 2) + "\n");
          return { planId: p.planId, qc: { passed: qc.passed } };
        },
        broll: async (log) => {
          let needs = [];
          let plan = null;
          if (p.planId) {
            const d = planDetail(config, brandKit, p.planId);
            if (!d) throw new Error("plan not found");
            plan = d.plan;
            needs = needsFromPlan(plan);
          }
          for (const n of p.needs ?? []) if (String(n).trim()) needs.push({ need: String(n).trim(), seconds: 4 });
          if (!needs.length) throw new Error("nothing to request: pick a plan with gaps or add a need");
          const reference = pickReference(ix, { stage: plan?.gaps?.[0]?.prefer?.stages?.[0], recipe: plan?.recipe });
          const m = mode();
          log(`${needs.length} need(s), ${m} mode`);
          const requests = m === "claude" ? await claudePrompts({ config, brand: brandKit, needs, reference }) : offlinePrompts(needs, brandKit);
          const out = writePromptSheet(path.join(config.outputDir, "broll"), { requests, reference, brand: brandKit, needs });
          return { requests: requests.length, file: path.basename(out.json) };
        },
        ingest: (log) => ingest(config, ix, { force: Boolean(p.force), prune: Boolean(p.prune), log }),
        analyze: async (log) => {
          if (p.clipId) {
            const clip = ix.getClip(Number(p.clipId));
            if (!clip) throw new Error("clip not found");
            log(`analyze ${clip.rel_path}`);
            const r = await analyzeClip(config, ix, brandKit, clip, { mode: mode(), force: true, log });
            return { analyzed: 1, shots: r.shots, dead: r.dead, clipId: clip.id };
          }
          return analyzeAll(config, ix, brandKit, { force: Boolean(p.force), limit: p.limit ? Number(p.limit) : undefined, mode: mode(), concurrency: 2, log });
        },
      };
      if (!runners[type]) throw Object.assign(new Error(`unknown job type ${type}`), { status: 400 });
      resetUsage();
      const job = jobs.add(type, p, runners[type]);
      const { _run, ...pub } = job;
      return pub;
    },
  };

  function recipes() {
    const rows = ix.db.prepare("SELECT recipe, COUNT(*) AS clips, COALESCE(SUM(duration),0) AS seconds, MAX(session) AS session FROM clips GROUP BY recipe ORDER BY clips DESC").all();
    return rows.map((r) => ({ recipe: r.recipe, clips: r.clips, seconds: Math.round(r.seconds), session: r.session }));
  }

  function match(method, pathname) {
    for (const key of Object.keys(api)) {
      const [m, pat] = key.split(" ");
      if (m !== method) continue;
      const patParts = pat.split("/");
      const parts = pathname.split("/");
      if (patParts.length !== parts.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < patParts.length; i++) {
        if (patParts[i].startsWith(":")) params[patParts[i].slice(1)] = decodeURIComponent(parts[i]);
        else if (patParts[i] !== parts[i]) {
          ok = false;
          break;
        }
      }
      if (ok) return { handler: api[key], params };
    }
    return null;
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const p = url.pathname;
    try {
      if (p.startsWith("/api/")) {
        const m = match(req.method, p);
        if (!m) return json(res, 404, { error: `no route ${req.method} ${p}` });
        const body = req.method === "POST" || req.method === "PUT" || req.method === "PATCH" ? await readBody(req) : null;
        const out = await m.handler(url.searchParams, m.params, body);
        return json(res, 200, out);
      }
      if (p.startsWith("/frames/")) return sendFile(req, res, config.framesDir, decodeURIComponent(p.slice("/frames/".length)));
      if (p.startsWith("/output/")) return sendFile(req, res, config.outputDir, decodeURIComponent(p.slice("/output/".length)), { download: url.searchParams.has("download") });
      if (p === "/" || p === "/index.html") {
        // index.html is authored as a fragment (title/style/markup/script) so the same
        // file can be published as a static snapshot; wrap it in a full document here.
        const frag = fs.readFileSync(path.join(here, "index.html"), "utf8");
        const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>${frag}</body></html>`;
        res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
        return res.end(html);
      }
      if (p === "/snapshot.json") return json(res, 200, await buildSnapshotData({ config, brand: brandKit, ix, api }));
      return json(res, 404, { error: "not found" });
    } catch (err) {
      const status = err.status ?? 500;
      if (status >= 500) console.error(err);
      return json(res, status, { error: err.message });
    }
  });
  server.jobs = jobs;
  server.api = api;
  return server;
}

/** Everything the static snapshot needs, with thumbnails inlined (see snapshot.js). */
export async function buildSnapshotData({ config, brand, ix, api }) {
  const status = await api["GET /api/status"]();
  const clips = api["GET /api/clips"](new URLSearchParams());
  const clipDetails = {};
  for (const c of clips) clipDetails[c.id] = api["GET /api/clips/:id"](new URLSearchParams(), { id: String(c.id) });
  const shots = await api["GET /api/shots"](new URLSearchParams("limit=1000&dead=1&ai=0"));
  const plans = api["GET /api/plans"]();
  const planDetails = {};
  for (const pl of plans) planDetails[pl.id] = api["GET /api/plans/:id"](new URLSearchParams(), { id: pl.id });
  return {
    snapshot: true, generated: new Date().toISOString(), status, clips, clipDetails, shots: shots.results, plans, planDetails,
    report: api["GET /api/report"](), unused: api["GET /api/unused"](new URLSearchParams()), brand: api["GET /api/brand"](),
    templates: api["GET /api/templates"](), broll: api["GET /api/broll"](),
    taxonomy: { SYNONYMS, INGREDIENTS, INGREDIENT_SYNONYMS, PROTEINS, STAGES, SHOT_TYPES, CAMERA_MOTION, ACTIONS },
  };
}

export function startUi({ config, brand, ix, port = 4310, host = "127.0.0.1" }) {
  const server = createUiServer({ config, brand, ix });
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, host, () => resolve({ server, url: `http://${host}:${server.address().port}` }));
  });
}
