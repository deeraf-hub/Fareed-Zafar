// SQLite index of the footage library (clips → shots → tags) with an FTS5
// full-text table for keyword search. Uses Node's built-in `node:sqlite`,
// so there is nothing native to compile.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS clips (
  id INTEGER PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  rel_path TEXT,
  filename TEXT,
  hash TEXT,
  size INTEGER,
  mtime REAL,
  duration REAL,
  width INTEGER,
  height INTEGER,
  fps REAL,
  codec TEXT,
  has_audio INTEGER,
  media_created TEXT,
  source_type TEXT,
  recipe TEXT,
  session TEXT,
  ai_generated INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ingested',
  analysis_mode TEXT,
  dish TEXT,
  cuisine TEXT,
  protein TEXT,
  error TEXT,
  ingested_at TEXT,
  analyzed_at TEXT
);
CREATE INDEX IF NOT EXISTS clips_recipe ON clips(recipe);
CREATE INDEX IF NOT EXISTS clips_status ON clips(status);

CREATE TABLE IF NOT EXISTS shots (
  id INTEGER PRIMARY KEY,
  clip_id INTEGER NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  start REAL,
  end REAL,
  duration REAL,
  motion REAL,
  dead INTEGER DEFAULT 0,
  frames TEXT,
  shot_type TEXT,
  camera_motion TEXT,
  stage TEXT,
  dish TEXT,
  description TEXT,
  ingredients TEXT,
  actions TEXT,
  keywords TEXT,
  quality INTEGER,
  hero_worthy INTEGER DEFAULT 0,
  hook_worthy INTEGER DEFAULT 0,
  has_face INTEGER DEFAULT 0,
  has_hands INTEGER DEFAULT 0,
  lighting TEXT,
  caption_suggestion TEXT,
  raw_json TEXT,
  UNIQUE(clip_id, idx)
);
CREATE INDEX IF NOT EXISTS shots_clip ON shots(clip_id);
CREATE INDEX IF NOT EXISTS shots_stage ON shots(stage);

CREATE VIRTUAL TABLE IF NOT EXISTS shots_fts USING fts5(
  description, keywords, ingredients, actions, dish, stage, shot_type, filename, recipe, transcript,
  tokenize = 'porter unicode61'
);

CREATE TABLE IF NOT EXISTS transcripts (
  clip_id INTEGER PRIMARY KEY REFERENCES clips(id) ON DELETE CASCADE,
  srt_path TEXT,
  text TEXT
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT,
  template_id TEXT,
  platform TEXT,
  recipe TEXT,
  created_at TEXT,
  json TEXT
);

CREATE TABLE IF NOT EXISTS usage (
  id INTEGER PRIMARY KEY,
  shot_id INTEGER NOT NULL,
  clip_id INTEGER NOT NULL,
  plan_id TEXT NOT NULL,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS usage_shot ON usage(shot_id);
`;

const JSON_COLS = ["ingredients", "actions", "keywords", "frames"];

export function parseShotRow(row) {
  if (!row) return row;
  const out = { ...row };
  for (const c of JSON_COLS) {
    if (typeof out[c] === "string") {
      try {
        out[c] = JSON.parse(out[c]);
      } catch {
        out[c] = [];
      }
    } else if (out[c] == null) out[c] = [];
  }
  for (const b of ["hero_worthy", "hook_worthy", "has_face", "has_hands", "dead", "ai_generated", "has_audio"]) {
    if (b in out) out[b] = Boolean(out[b]);
  }
  return out;
}

export function openIndex(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  return new Index(db, dbPath);
}

export class Index {
  constructor(db, dbPath) {
    this.db = db;
    this.path = dbPath;
  }

  close() {
    this.db.close();
  }

  // ---- clips ---------------------------------------------------------------

  upsertClip(c) {
    const now = new Date().toISOString();
    const existing = this.getClipByPath(c.path);
    if (existing) {
      this.db
        .prepare(
          `UPDATE clips SET rel_path=?, filename=?, hash=?, size=?, mtime=?, duration=?, width=?, height=?, fps=?, codec=?,
           has_audio=?, media_created=?, source_type=?, recipe=?, session=?, ai_generated=?, status=?, error=NULL WHERE id=?`,
        )
        .run(
          c.rel_path, c.filename, c.hash, c.size, c.mtime, c.duration, c.width, c.height, c.fps, c.codec,
          c.has_audio ? 1 : 0, c.media_created ?? null, c.source_type, c.recipe ?? null, c.session ?? null,
          c.ai_generated ? 1 : 0, c.status ?? "ingested", existing.id,
        );
      return existing.id;
    }
    const r = this.db
      .prepare(
        `INSERT INTO clips (path, rel_path, filename, hash, size, mtime, duration, width, height, fps, codec, has_audio,
          media_created, source_type, recipe, session, ai_generated, status, ingested_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        c.path, c.rel_path, c.filename, c.hash, c.size, c.mtime, c.duration, c.width, c.height, c.fps, c.codec,
        c.has_audio ? 1 : 0, c.media_created ?? null, c.source_type, c.recipe ?? null, c.session ?? null,
        c.ai_generated ? 1 : 0, c.status ?? "ingested", now,
      );
    return Number(r.lastInsertRowid);
  }

  getClip(id) {
    return parseShotRow(this.db.prepare("SELECT * FROM clips WHERE id = ?").get(id));
  }

  getClipByPath(p) {
    return parseShotRow(this.db.prepare("SELECT * FROM clips WHERE path = ?").get(p));
  }

  listClips({ status, recipe, sourceType, limit } = {}) {
    const where = [];
    const params = [];
    if (status) {
      where.push("status = ?");
      params.push(status);
    }
    if (recipe) {
      where.push("recipe = ?");
      params.push(recipe);
    }
    if (sourceType) {
      where.push("source_type = ?");
      params.push(sourceType);
    }
    const sql = `SELECT * FROM clips ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY id ${limit ? "LIMIT " + Number(limit) : ""}`;
    return this.db.prepare(sql).all(...params).map(parseShotRow);
  }

  setClipStatus(id, status, extra = {}) {
    const sets = ["status = ?"];
    const params = [status];
    for (const k of ["analysis_mode", "dish", "cuisine", "protein", "error", "analyzed_at"]) {
      if (k in extra) {
        sets.push(`${k} = ?`);
        params.push(extra[k]);
      }
    }
    params.push(id);
    this.db.prepare(`UPDATE clips SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  }

  removeClip(id) {
    const shots = this.db.prepare("SELECT id FROM shots WHERE clip_id = ?").all(id);
    for (const s of shots) this.db.prepare("DELETE FROM shots_fts WHERE rowid = ?").run(s.id);
    this.db.prepare("DELETE FROM clips WHERE id = ?").run(id);
  }

  // ---- shots ---------------------------------------------------------------

  replaceShots(clipId, shots) {
    const clip = this.getClip(clipId);
    const transcript = this.getTranscript(clipId)?.text ?? "";
    const old = this.db.prepare("SELECT id FROM shots WHERE clip_id = ?").all(clipId);
    for (const s of old) this.db.prepare("DELETE FROM shots_fts WHERE rowid = ?").run(s.id);
    this.db.prepare("DELETE FROM shots WHERE clip_id = ?").run(clipId);
    const ins = this.db.prepare(
      `INSERT INTO shots (clip_id, idx, start, end, duration, motion, dead, frames, shot_type, camera_motion, stage, dish,
        description, ingredients, actions, keywords, quality, hero_worthy, hook_worthy, has_face, has_hands, lighting,
        caption_suggestion, raw_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    );
    const fts = this.db.prepare(
      `INSERT INTO shots_fts (rowid, description, keywords, ingredients, actions, dish, stage, shot_type, filename, recipe, transcript)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    );
    const ids = [];
    for (const s of shots) {
      const r = ins.run(
        clipId, s.idx, s.start, s.end, s.duration, s.motion ?? null, s.dead ? 1 : 0, JSON.stringify(s.frames ?? []),
        s.shot_type ?? null, s.camera_motion ?? null, s.stage ?? null, s.dish ?? null, s.description ?? null,
        JSON.stringify(s.ingredients ?? []), JSON.stringify(s.actions ?? []), JSON.stringify(s.keywords ?? []),
        s.quality ?? null, s.hero_worthy ? 1 : 0, s.hook_worthy ? 1 : 0, s.has_face ? 1 : 0, s.has_hands ? 1 : 0,
        s.lighting ?? null, s.caption_suggestion ?? null, s.raw_json ? JSON.stringify(s.raw_json) : null,
      );
      const id = Number(r.lastInsertRowid);
      ids.push(id);
      const words = (arr) => (arr ?? []).map((x) => String(x).replace(/_/g, " ")).join(" ");
      fts.run(
        id, s.description ?? "", words(s.keywords), words(s.ingredients), words(s.actions), s.dish ?? "",
        (s.stage ?? "").replace(/_/g, " "), (s.shot_type ?? "").replace(/_/g, " "),
        (clip?.filename ?? "").replace(/[_\-.]+/g, " "), (clip?.recipe ?? "").replace(/[_\-]+/g, " "), transcript,
      );
    }
    return ids;
  }

  /** Edit a shot's tags in place (keeps the FTS row in sync). Returns the joined row. */
  updateShot(id, patch) {
    const allowed = ["stage", "shot_type", "camera_motion", "quality", "hero_worthy", "hook_worthy", "has_face", "has_hands", "dead", "lighting", "ingredients", "actions", "keywords", "description", "caption_suggestion"];
    const sets = [];
    const params = [];
    for (const k of allowed) {
      if (!(k in patch)) continue;
      let v = patch[k];
      if (JSON_COLS.includes(k)) v = JSON.stringify(Array.isArray(v) ? v : []);
      else if (["hero_worthy", "hook_worthy", "has_face", "has_hands", "dead"].includes(k)) v = v ? 1 : 0;
      else if (k === "quality") v = v == null ? null : Math.max(1, Math.min(5, Number(v)));
      sets.push(`${k} = ?`);
      params.push(v);
    }
    if (!sets.length) return this.getShot(id);
    params.push(id);
    this.db.prepare(`UPDATE shots SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    const s = this.getShot(id);
    if (!s) return null;
    const clip = this.getClip(s.clip_id);
    const transcript = this.getTranscript(s.clip_id)?.text ?? "";
    const words = (arr) => (arr ?? []).map((x) => String(x).replace(/_/g, " ")).join(" ");
    this.db.prepare("DELETE FROM shots_fts WHERE rowid = ?").run(id);
    this.db
      .prepare(
        `INSERT INTO shots_fts (rowid, description, keywords, ingredients, actions, dish, stage, shot_type, filename, recipe, transcript)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        id, s.description ?? "", words(s.keywords), words(s.ingredients), words(s.actions), s.dish ?? "",
        (s.stage ?? "").replace(/_/g, " "), (s.shot_type ?? "").replace(/_/g, " "),
        (clip?.filename ?? "").replace(/[_\-.]+/g, " "), (clip?.recipe ?? "").replace(/[_\-]+/g, " "), transcript,
      );
    return s;
  }

  getShots(clipId) {
    return this.db.prepare("SELECT * FROM shots WHERE clip_id = ? ORDER BY idx").all(clipId).map(parseShotRow);
  }

  getShot(id) {
    return parseShotRow(this.db.prepare(SHOT_JOIN + " WHERE s.id = ?").get(id));
  }

  /** All shots joined with their clip (fields prefixed clip_*). */
  allShots({ recipe, sourceType, excludeAi = false, includeDead = false } = {}) {
    const where = [];
    const params = [];
    if (recipe) {
      where.push("c.recipe = ?");
      params.push(recipe);
    }
    if (sourceType) {
      where.push("c.source_type = ?");
      params.push(sourceType);
    }
    if (excludeAi) where.push("c.ai_generated = 0");
    if (!includeDead) where.push("s.dead = 0");
    const sql = `${SHOT_JOIN} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY c.id, s.idx`;
    return this.db.prepare(sql).all(...params).map(parseShotRow);
  }

  /** FTS5 match → Map(shotId → bm25 rank, lower is better). */
  ftsSearch(terms) {
    const clean = terms.map((t) => String(t).replace(/[^\p{L}\p{N} ]/gu, " ").trim()).filter(Boolean);
    if (!clean.length) return new Map();
    const query = clean.map((t) => `"${t}"`).join(" OR ");
    const rows = this.db
      .prepare("SELECT rowid AS id, bm25(shots_fts) AS rank FROM shots_fts WHERE shots_fts MATCH ? ORDER BY rank LIMIT 2000")
      .all(query);
    return new Map(rows.map((r) => [r.id, r.rank]));
  }

  // ---- transcripts ---------------------------------------------------------

  setTranscript(clipId, srtPath, text) {
    this.db
      .prepare("INSERT INTO transcripts (clip_id, srt_path, text) VALUES (?,?,?) ON CONFLICT(clip_id) DO UPDATE SET srt_path=excluded.srt_path, text=excluded.text")
      .run(clipId, srtPath, text);
  }

  getTranscript(clipId) {
    return this.db.prepare("SELECT * FROM transcripts WHERE clip_id = ?").get(clipId) ?? null;
  }

  // ---- plans & usage -------------------------------------------------------

  savePlan(plan) {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO plans (id, name, template_id, platform, recipe, created_at, json) VALUES (?,?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name, json=excluded.json`,
      )
      .run(plan.id, plan.name, plan.template, plan.platform, plan.recipe ?? null, now, JSON.stringify(plan));
    this.db.prepare("DELETE FROM usage WHERE plan_id = ?").run(plan.id);
    const ins = this.db.prepare("INSERT INTO usage (shot_id, clip_id, plan_id, created_at) VALUES (?,?,?,?)");
    for (const seg of plan.segments) ins.run(seg.shot_id, seg.clip_id, plan.id, now);
  }

  getPlan(id) {
    const row = this.db.prepare("SELECT json FROM plans WHERE id = ?").get(id);
    return row ? JSON.parse(row.json) : null;
  }

  listPlans() {
    return this.db.prepare("SELECT id, name, template_id, platform, recipe, created_at FROM plans ORDER BY created_at DESC").all();
  }

  usageCounts() {
    const rows = this.db.prepare("SELECT shot_id, COUNT(*) AS n FROM usage GROUP BY shot_id").all();
    return new Map(rows.map((r) => [r.shot_id, r.n]));
  }

  // ---- stats ---------------------------------------------------------------

  stats() {
    const one = (sql, ...p) => this.db.prepare(sql).get(...p);
    const all = (sql, ...p) => this.db.prepare(sql).all(...p);
    return {
      clips: one("SELECT COUNT(*) AS n, COALESCE(SUM(duration),0) AS seconds FROM clips"),
      byStatus: all("SELECT status, COUNT(*) AS n FROM clips GROUP BY status"),
      bySource: all("SELECT source_type, COUNT(*) AS n, COALESCE(SUM(duration),0) AS seconds FROM clips GROUP BY source_type"),
      byRecipe: all("SELECT recipe, COUNT(*) AS clips, COALESCE(SUM(duration),0) AS seconds FROM clips GROUP BY recipe ORDER BY clips DESC"),
      shots: one("SELECT COUNT(*) AS n, COALESCE(SUM(duration),0) AS seconds, SUM(dead) AS dead, SUM(hero_worthy) AS hero, SUM(hook_worthy) AS hook FROM shots"),
      byStage: all("SELECT stage, COUNT(*) AS n FROM shots GROUP BY stage ORDER BY n DESC"),
      byShotType: all("SELECT shot_type, COUNT(*) AS n FROM shots GROUP BY shot_type ORDER BY n DESC"),
      used: one("SELECT COUNT(DISTINCT shot_id) AS n FROM usage"),
      plans: one("SELECT COUNT(*) AS n FROM plans"),
    };
  }
}

const SHOT_JOIN = `
SELECT s.*, c.path AS clip_path, c.filename AS clip_filename, c.recipe AS clip_recipe, c.session AS clip_session,
       c.source_type AS clip_source_type, c.ai_generated AS clip_ai_generated, c.has_audio AS clip_has_audio,
       c.fps AS clip_fps, c.width AS clip_width, c.height AS clip_height, c.duration AS clip_duration, c.dish AS clip_dish
FROM shots s JOIN clips c ON c.id = s.clip_id`;
