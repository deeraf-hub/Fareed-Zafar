// Configuration loader for the Food Content Engine.
//
// A "project" is any folder containing an `fce.config.json` (created by `fce init`).
// Everything the engine produces (index database, keyframes, proxies, renders)
// lives under the project's work/output directories so the footage library is
// never modified in place.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ENGINE_ROOT = path.resolve(here, "..");
export const CONFIG_FILENAME = "fce.config.json";

export const DEFAULT_CONFIG = {
  library: "./library",
  workDir: "./.fce",
  outputDir: "./output",
  brandKit: path.join(ENGINE_ROOT, "brand", "brand-kit.json"),
  templatesDir: path.join(ENGINE_ROOT, "templates"),
  extensions: [".mp4", ".mov", ".m4v", ".mxf", ".mkv", ".avi", ".webm"],
  ai: {
    mode: "auto", // auto | claude | offline
    model: "claude-opus-5",
    effort: "medium",
    maxFramesPerShot: 3,
    frameWidth: 768,
    maxImagesPerRequest: 36,
  },
  analysis: {
    sceneThreshold: 0.35,
    minShotSeconds: 0.8,
    maxShotSeconds: 10,
    motionSampleFps: 2,
    deadMotionThreshold: 0.6,
  },
  render: {
    preset: "medium", // x264 preset: ultrafast … veryslow
    crf: 20,
  },
  transcription: {
    // Optional external transcriber, e.g. whisper.cpp or openai-whisper CLI.
    // Placeholders: {input} {outdir} {basename}
    // Example: "whisper {input} --model small --output_format srt --output_dir {outdir}"
    command: null,
  },
};

function deepMerge(base, extra) {
  if (!extra || typeof extra !== "object") return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(extra)) {
    if (v && typeof v === "object" && !Array.isArray(v) && base && typeof base[k] === "object" && !Array.isArray(base[k])) {
      out[k] = deepMerge(base[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function findProjectRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, CONFIG_FILENAME))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function loadConfig({ project, overrides = {} } = {}) {
  const root = project ? path.resolve(project) : findProjectRoot() ?? process.cwd();
  const file = path.join(root, CONFIG_FILENAME);
  let fileConfig = {};
  if (fs.existsSync(file)) {
    fileConfig = JSON.parse(fs.readFileSync(file, "utf8"));
  }
  const merged = deepMerge(deepMerge(DEFAULT_CONFIG, fileConfig), overrides);
  const resolve = (p) => (path.isAbsolute(p) ? p : path.resolve(root, p));
  const config = {
    ...merged,
    root,
    configFile: fs.existsSync(file) ? file : null,
    library: resolve(merged.library),
    workDir: resolve(merged.workDir),
    outputDir: resolve(merged.outputDir),
    brandKit: resolve(merged.brandKit),
    templatesDir: resolve(merged.templatesDir),
  };
  config.dbPath = path.join(config.workDir, "index.sqlite");
  config.framesDir = path.join(config.workDir, "frames");
  config.cacheDir = path.join(config.workDir, "cache");
  if (process.env.FCE_AI_MODE) config.ai.mode = process.env.FCE_AI_MODE;
  if (process.env.FCE_MODEL) config.ai.model = process.env.FCE_MODEL;
  return config;
}

export function ensureDirs(config) {
  for (const d of [config.workDir, config.framesDir, config.cacheDir, config.outputDir]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

export function loadBrandKit(config) {
  const raw = JSON.parse(fs.readFileSync(config.brandKit, "utf8"));
  raw._path = config.brandKit;
  raw._dir = path.dirname(config.brandKit);
  return raw;
}

export function getPlatform(brand, id) {
  const p = brand.platforms?.[id];
  if (!p) {
    const known = Object.keys(brand.platforms ?? {}).join(", ");
    throw new Error(`Unknown platform "${id}". Known platforms: ${known}`);
  }
  return { id, ...p };
}

/** Write a fresh project config + the recommended folder skeleton. */
export function initProject(root, { library } = {}) {
  fs.mkdirSync(root, { recursive: true });
  const file = path.join(root, CONFIG_FILENAME);
  if (fs.existsSync(file)) throw new Error(`${CONFIG_FILENAME} already exists in ${root}`);
  const cfg = {
    library: library ?? "./library",
    workDir: "./.fce",
    outputDir: "./output",
    brandKit: path.relative(root, DEFAULT_CONFIG.brandKit) || DEFAULT_CONFIG.brandKit,
    templatesDir: path.relative(root, DEFAULT_CONFIG.templatesDir) || DEFAULT_CONFIG.templatesDir,
    ai: { ...DEFAULT_CONFIG.ai },
    analysis: { ...DEFAULT_CONFIG.analysis },
    render: { ...DEFAULT_CONFIG.render },
    transcription: { ...DEFAULT_CONFIG.transcription },
  };
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + "\n");
  const lib = path.resolve(root, cfg.library);
  for (const d of LIBRARY_SKELETON) fs.mkdirSync(path.join(lib, d), { recursive: true });
  fs.writeFileSync(
    path.join(lib, "README.txt"),
    [
      "Food Content Engine library layout",
      "",
      "01_raw/<YYYY-MM-DD>_<recipe-slug>/   raw camera files for one filming session",
      "02_selects/                        hand-picked keepers (optional, same naming)",
      "03_edited/<platform>/              finished exports (indexed as reference, never re-cut)",
      "04_assets/ai-broll/                AI generated inserts (flagged, limited by brand rule)",
      "04_assets/music/  04_assets/sfx/   licensed audio",
      "04_assets/graphics/                logos, lower thirds, end cards",
      "",
      "File naming: YYYYMMDD_<recipe-slug>_<stage>_<subject>_<shot>_<take>.mp4",
      "Example:     20260910_grilled-chicken-bowl_cooking_chicken-grilling_closeup_t02.mp4",
      "See docs/03-footage-organization-system.md for the full convention.",
      "",
    ].join("\n"),
  );
  return { file, config: cfg };
}

export const LIBRARY_SKELETON = [
  "01_raw",
  "02_selects",
  "03_edited/instagram_reel",
  "03_edited/tiktok",
  "03_edited/youtube_short",
  "03_edited/youtube",
  "04_assets/ai-broll",
  "04_assets/music",
  "04_assets/sfx",
  "04_assets/graphics",
];
