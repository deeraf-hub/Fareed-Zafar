// Library scanner: finds video files, reads their metadata, derives recipe and
// session from the folder/file naming convention and registers them in the index.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { probe } from "./ffmpeg.js";

const SOURCE_BY_FOLDER = [
  [/^01[_-]?raw/i, "raw"],
  [/^02[_-]?selects?/i, "select"],
  [/^03[_-]?edited|^exports?$|^finals?$/i, "edited"],
  [/^04[_-]?assets?/i, "asset"],
];

export function slugify(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Parse the naming convention:
 *   folder: 01_raw/<YYYY-MM-DD>_<recipe-slug>/
 *   file:   YYYYMMDD_<recipe-slug>_<stage>_<subject>_<shot>_<take>.ext
 * Anything that does not follow it degrades gracefully to "parent folder = recipe".
 */
export function parseNaming(relPath) {
  const parts = relPath.split(/[\\/]/);
  const filename = parts[parts.length - 1];
  const base = filename.replace(/\.[^.]+$/, "");
  const folders = parts.slice(0, -1);
  const top = folders[0] ?? "";
  let source_type = "raw";
  for (const [re, t] of SOURCE_BY_FOLDER) if (re.test(top)) source_type = t;
  const ai_generated = folders.some((f) => /ai[-_ ]?b-?roll|ai[-_ ]?generated|generated/i.test(f));

  let session = null;
  let recipe = null;
  let date = null;
  const sessionFolder = [...folders].reverse().find((f) => /^\d{4}-\d{2}-\d{2}[_-]/.test(f));
  if (sessionFolder) {
    session = sessionFolder;
    date = sessionFolder.slice(0, 10);
    recipe = slugify(sessionFolder.slice(11));
  }
  const tokens = base.split("_");
  let stage = null;
  let subject = null;
  let shot = null;
  let take = null;
  if (/^\d{8}$/.test(tokens[0]) && tokens.length >= 3) {
    date = date ?? `${tokens[0].slice(0, 4)}-${tokens[0].slice(4, 6)}-${tokens[0].slice(6, 8)}`;
    recipe = recipe ?? slugify(tokens[1]);
    stage = tokens[2] ?? null;
    subject = tokens[3] ?? null;
    shot = tokens[4] ?? null;
    take = tokens[5] ?? null;
  }
  if (!recipe) {
    const parent = folders[folders.length - 1];
    if (parent && !SOURCE_BY_FOLDER.some(([re]) => re.test(parent))) recipe = slugify(parent);
  }
  if (source_type === "edited" && folders.length >= 2) {
    // 03_edited/<platform>/<file> — the recipe is only known from the filename.
    if (!/^\d{8}$/.test(tokens[0])) recipe = slugify(tokens[0]);
  }
  return { filename, source_type, ai_generated, session, recipe: recipe || null, date, stage, subject, shot, take };
}

export function partialHash(file, size) {
  const h = crypto.createHash("sha1");
  const fd = fs.openSync(file, "r");
  try {
    const chunk = 2 * 1024 * 1024;
    const buf = Buffer.alloc(Math.min(chunk, size));
    fs.readSync(fd, buf, 0, buf.length, 0);
    h.update(buf);
    if (size > chunk) {
      const tail = Buffer.alloc(Math.min(chunk, size - chunk));
      fs.readSync(fd, tail, 0, tail.length, size - tail.length);
      h.update(tail);
    }
  } finally {
    fs.closeSync(fd);
  }
  h.update(String(size));
  return h.digest("hex");
}

export function* walk(dir, extensions) {
  const exts = new Set(extensions.map((e) => e.toLowerCase()));
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (exts.has(path.extname(e.name).toLowerCase())) yield p;
    }
  }
}

export async function ingest(config, ix, { force = false, prune = false, dryRun = false, log = () => {} } = {}) {
  const summary = { added: 0, updated: 0, unchanged: 0, failed: 0, pruned: 0, duplicates: [], errors: [] };
  if (!fs.existsSync(config.library)) throw new Error(`Library folder not found: ${config.library}`);
  const seen = new Set();
  const byHash = new Map();
  for (const c of ix.listClips()) if (c.hash) byHash.set(c.hash, c.path);
  const files = [...walk(config.library, config.extensions)].sort();
  for (const file of files) {
    seen.add(file);
    const st = fs.statSync(file);
    const existing = ix.getClipByPath(file);
    if (existing && !force && existing.size === st.size && Math.abs(existing.mtime - st.mtimeMs) < 1) {
      summary.unchanged++;
      continue;
    }
    const rel = path.relative(config.library, file);
    try {
      const meta = await probe(file);
      const naming = parseNaming(rel);
      const hash = partialHash(file, st.size);
      const dupOf = byHash.get(hash);
      if (dupOf && dupOf !== file) summary.duplicates.push({ file: rel, duplicateOf: path.relative(config.library, dupOf) });
      byHash.set(hash, file);
      const clip = {
        path: file,
        rel_path: rel,
        filename: naming.filename,
        hash,
        size: st.size,
        mtime: st.mtimeMs,
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        fps: meta.fps,
        codec: meta.codec,
        has_audio: meta.hasAudio,
        media_created: meta.mediaCreated ?? new Date(st.mtimeMs).toISOString(),
        source_type: naming.source_type,
        recipe: naming.recipe,
        session: naming.session,
        ai_generated: naming.ai_generated,
        status: "ingested",
      };
      log(`${existing ? "update" : "add"}  ${rel}  (${meta.duration.toFixed(1)}s ${meta.width}x${meta.height})`);
      if (!dryRun) ix.upsertClip(clip);
      if (existing) summary.updated++;
      else summary.added++;
    } catch (err) {
      summary.failed++;
      summary.errors.push({ file: rel, error: err.message.split("\n")[0] });
      log(`FAIL  ${rel}: ${err.message.split("\n")[0]}`);
    }
  }
  if (prune) {
    for (const c of ix.listClips()) {
      if (!seen.has(c.path) && !fs.existsSync(c.path)) {
        log(`prune ${c.rel_path}`);
        if (!dryRun) ix.removeClip(c.id);
        summary.pruned++;
      }
    }
  }
  return summary;
}
