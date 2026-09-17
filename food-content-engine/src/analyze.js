// Shot analysis: scene detection → keyframes → motion score → tags.
// Tags come from Claude (vision) when credentials exist, otherwise from the
// naming convention. Both produce the same shape so downstream code never cares.

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { detectScenes, buildShots, extractFrame, motionScore, round3 } from "./ffmpeg.js";
import { structured, imageBlock, textBlock, resolveMode } from "./ai.js";
import {
  SHOT_TYPES, CAMERA_MOTION, STAGES, ACTIONS, LIGHTING, ACTION_VERBS, extractTags, titleCase,
} from "./taxonomy.js";
import { parseNaming } from "./ingest.js";

// ---- output schema for Claude ---------------------------------------------

const nullable = (t) => ({ anyOf: [{ type: t }, { type: "null" }] });

export const TAG_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["clip", "shots"],
  properties: {
    clip: {
      type: "object",
      additionalProperties: false,
      required: ["dish", "cuisine", "protein", "confidence"],
      properties: {
        dish: nullable("string"),
        cuisine: nullable("string"),
        protein: nullable("string"),
        confidence: { type: "number", description: "0..1 confidence in the dish identification" },
      },
    },
    shots: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "shot_index", "shot_type", "camera_motion", "stage", "description", "ingredients", "actions", "keywords",
          "quality", "hero_worthy", "hook_worthy", "has_face", "has_hands", "lighting", "caption_suggestion",
        ],
        properties: {
          shot_index: { type: "integer" },
          shot_type: { type: "string", enum: SHOT_TYPES },
          camera_motion: { type: "string", enum: CAMERA_MOTION },
          stage: { type: "string", enum: STAGES },
          description: { type: "string", description: "One concrete sentence describing what is visible." },
          ingredients: { type: "array", items: { type: "string" }, description: "snake_case ingredient names visible in the shot" },
          actions: { type: "array", items: { type: "string", enum: ACTIONS } },
          keywords: { type: "array", items: { type: "string" }, description: "5-10 search keywords (textures, colours, props, moods)" },
          quality: { type: "integer", description: "Technical quality 1 (unusable) to 5 (flawless): focus, exposure, stability, composition" },
          hero_worthy: { type: "boolean", description: "Finished dish looking its absolute best; could be a thumbnail" },
          hook_worthy: { type: "boolean", description: "Stops the scroll within one second: pour, sizzle, cheese pull, knife through, reveal" },
          has_face: { type: "boolean" },
          has_hands: { type: "boolean" },
          lighting: { type: "string", enum: LIGHTING },
          caption_suggestion: { type: "string", description: "Max 6 words, imperative, in the brand voice" },
        },
      },
    },
  },
};

export function tagSystemPrompt(brand) {
  return [
    `You are the footage librarian for ${brand.brand?.name ?? "a food and fitness brand"} (${brand.brand?.niche ?? "recipe videos"}).`,
    "You will receive keyframes from one raw cooking clip, grouped by shot. Tag every shot for a searchable footage database that editors use to build new videos from old footage.",
    "",
    "Rules:",
    `- shot_type must be one of: ${SHOT_TYPES.join(", ")}.`,
    `- camera_motion must be one of: ${CAMERA_MOTION.join(", ")}.`,
    `- stage must be one of: ${STAGES.join(", ")}. "hero" = the finished dish presented as the star; "ingredients" = raw components laid out; "meal_prep" = portioning into containers.`,
    `- actions must come from: ${ACTIONS.join(", ")}. Include only actions actually visible.`,
    "- ingredients: snake_case, singular where natural (chicken, bell_pepper, soy_sauce). Only what is visible; never guess hidden ingredients.",
    "- description: one factual sentence about what is on screen. No marketing language.",
    "- quality: judge focus, exposure, stability and composition only.",
    "- hero_worthy and hook_worthy are strict: fewer than one shot in five should qualify.",
    `- caption_suggestion: short, imperative, ${brand.voice?.captionRules?.join("; ") ?? "no emojis"}.`,
    "- Return exactly one entry per shot index you were given, in order.",
  ].join("\n");
}

// ---- offline tagger --------------------------------------------------------

export function tagOffline(clip, shots) {
  const naming = parseNaming(clip.rel_path ?? clip.filename);
  // Shot-level hints come from the descriptive part of the filename only.
  // The recipe/session name is used for the dish and as an ingredient fallback,
  // otherwise "grilled-chicken-bowl" would tag every shot of the session as grilling.
  const conventional = Boolean(naming.stage || naming.subject);
  const primary = extractTags(conventional ? [naming.stage, naming.subject, naming.shot].filter(Boolean).join(" ") : clip.filename);
  const recipeHints = extractTags([clip.recipe, clip.session].filter(Boolean).join(" "));
  const subject = naming.subject ? titleCase(naming.subject) : titleCase(clip.recipe ?? clip.filename.replace(/\.[^.]+$/, ""));
  const stage = primary.stages[0] ?? null;
  const ingredients = primary.ingredients.length ? primary.ingredients : stage === "hero" || stage === "ingredients" || stage === "plating" ? recipeHints.ingredients : [];
  const actions = primary.actions;
  const shotType = primary.shot_types[0] ?? null;
  return {
    clip: {
      dish: clip.recipe ? titleCase(clip.recipe) : null,
      cuisine: null,
      protein: recipeHints.proteins[0] ?? primary.proteins[0] ?? null,
      confidence: clip.recipe ? 0.6 : 0.2,
    },
    shots: shots.map((s) => {
      const hook = primary.hook || primary.hero || actions.some((a) => ["pouring", "drizzling", "cutting", "sizzling", "steam_rising", "cracking", "flipping"].includes(a));
      const verb = actions[0] ? ACTION_VERBS[actions[0]] : null;
      // Object of the verb: the first ingredient, else whatever is left of the
      // subject once the action words are removed ("packing-containers" → "containers").
      const subjectRest = (naming.subject ?? "")
        .split(/[-\s]+/)
        .filter((w) => w && !actions.some((a) => a.startsWith(w.slice(0, 4))) && !/^(the|a|an|of|and|with|into)$/.test(w))
        .join(" ");
      const ingredient = ingredients[0] ? ingredients[0].replace(/_/g, " ") : subjectRest || null;
      const caption = verb
        ? `${verb}${ingredient && !/first bite|taste test|let it rest|watch the steam|hear that sizzle/i.test(verb) ? " the " + ingredient : ""}`
        : stage === "hero" ? "The final result" : stage === "ingredients" ? "What you need" : stage === "eating" ? "First bite" : subject;
      const camera = primary.camera_motion[0] ?? (s.motion != null && s.motion < 0.6 ? "static" : null);
      return {
        shot_index: s.idx,
        shot_type: shotType,
        camera_motion: camera,
        stage,
        description: `${subject}${stage ? ` (${stage.replace(/_/g, " ")})` : ""}${shotType ? `, ${shotType.replace(/_/g, " ")} shot` : ""}${actions.length ? `, ${actions.map((a) => a.replace(/_/g, " ")).join(" and ")}` : ""}.`,
        ingredients,
        actions,
        keywords: [...new Set([...(naming.subject ?? "").split(/[-\s]+/), ...(naming.shot ?? "").split(/[-\s]+/)].filter((w) => w && w.length > 2))],
        quality: s.dead ? 2 : 3,
        hero_worthy: primary.hero || stage === "hero",
        hook_worthy: hook,
        has_face: stage === "talking_head" || stage === "eating",
        has_hands: ["prep", "cooking", "plating", "meal_prep"].includes(stage),
        lighting: null,
        caption_suggestion: caption.slice(0, 40),
      };
    }),
  };
}

// ---- Claude tagger ---------------------------------------------------------

export async function tagWithClaude(config, brand, clip, shots, { log = () => {} } = {}) {
  const maxImages = config.ai.maxImagesPerRequest ?? 36;
  const chunks = [];
  let current = [];
  let count = 0;
  for (const s of shots) {
    const n = (s.frames ?? []).length;
    if (current.length && count + n > maxImages) {
      chunks.push(current);
      current = [];
      count = 0;
    }
    current.push(s);
    count += n;
  }
  if (current.length) chunks.push(current);

  const naming = parseNaming(clip.rel_path ?? clip.filename);
  const merged = { clip: null, shots: [] };
  for (const [i, chunk] of chunks.entries()) {
    const content = [
      textBlock(
        [
          `Clip: ${clip.filename}`,
          clip.recipe ? `Recipe folder: ${clip.recipe}` : null,
          naming.stage ? `Filename hints: stage=${naming.stage}${naming.subject ? `, subject=${naming.subject}` : ""}${naming.shot ? `, shot=${naming.shot}` : ""} (hints only; trust the images)` : null,
          `Duration: ${round3(clip.duration)}s, ${chunk.length} shots in this batch${chunks.length > 1 ? ` (batch ${i + 1} of ${chunks.length})` : ""}.`,
          "For each shot below, the frames are sampled from the start, middle and end of the shot.",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    ];
    for (const s of chunk) {
      content.push(textBlock(`Shot ${s.idx}: ${s.start}s to ${s.end}s (${s.duration}s)${s.motion != null ? `, on-screen motion ${s.motion < 0.6 ? "very low" : s.motion < 3 ? "moderate" : "high"}` : ""}`));
      for (const f of s.frames ?? []) content.push(imageBlock(f));
    }
    const { data, usage } = await structured({
      config,
      system: tagSystemPrompt(brand),
      content,
      schema: TAG_SCHEMA,
      label: `tag ${clip.filename}`,
    });
    log(`  claude: ${chunk.length} shots, ${usage?.input_tokens ?? "?"} in / ${usage?.output_tokens ?? "?"} out tokens`);
    if (!merged.clip || (data.clip?.confidence ?? 0) > (merged.clip.confidence ?? 0)) merged.clip = data.clip;
    merged.shots.push(...(data.shots ?? []));
  }
  return merged;
}

// ---- transcription (optional external CLI) ---------------------------------

export async function transcribe(config, clip) {
  const cmd = config.transcription?.command;
  if (!cmd) return null;
  const outdir = path.join(config.cacheDir, "transcripts", String(clip.id));
  fs.mkdirSync(outdir, { recursive: true });
  const basename = path.basename(clip.path, path.extname(clip.path));
  const line = cmd.replace(/\{input\}/g, JSON.stringify(clip.path)).replace(/\{outdir\}/g, JSON.stringify(outdir)).replace(/\{basename\}/g, JSON.stringify(basename));
  await new Promise((resolve, reject) => {
    const child = spawn(line, { shell: true, stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`transcriber exited ${code}: ${err.slice(-300)}`))));
  });
  const srt = fs.readdirSync(outdir).find((f) => f.endsWith(".srt"));
  if (!srt) return null;
  const srtPath = path.join(outdir, srt);
  const text = fs
    .readFileSync(srtPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !/^\d+$/.test(l) && !/-->/.test(l))
    .join(" ");
  return { srtPath, text };
}

// ---- per-clip pipeline -----------------------------------------------------

export async function analyzeClip(config, ix, brand, clip, { mode, force = false, log = () => {} } = {}) {
  const a = config.analysis;
  const cuts = await detectScenes(clip.path, { threshold: a.sceneThreshold });
  const shots = buildShots(cuts, clip.duration, { minShot: a.minShotSeconds, maxShot: a.maxShotSeconds });
  const frameDir = path.join(config.framesDir, String(clip.id));
  for (const s of shots) {
    const positions = s.duration < 1.5 ? [0.5] : [0.15, 0.5, 0.85].slice(0, Math.max(1, config.ai.maxFramesPerShot ?? 3));
    s.frames = [];
    for (const [k, p] of positions.entries()) {
      const out = path.join(frameDir, `s${String(s.idx).padStart(3, "0")}_f${k}.jpg`);
      if (force || !fs.existsSync(out)) await extractFrame(clip.path, s.start + s.duration * p, out, { width: config.ai.frameWidth ?? 768 });
      s.frames.push(out);
    }
    s.motion = await motionScore(clip.path, s.start, s.end, { sampleFps: a.motionSampleFps });
    s.dead = s.motion != null && s.motion < a.deadMotionThreshold && s.duration >= 1.5;
  }

  if (clip.has_audio && config.transcription?.command) {
    try {
      const t = await transcribe(config, clip);
      if (t) ix.setTranscript(clip.id, t.srtPath, t.text);
    } catch (err) {
      log(`  transcription failed: ${err.message}`);
    }
  }

  const tags = mode === "claude" ? await tagWithClaude(config, brand, clip, shots, { log }) : tagOffline(clip, shots);
  const byIdx = new Map((tags.shots ?? []).map((t) => [t.shot_index, t]));
  const rows = shots.map((s) => {
    const t = byIdx.get(s.idx) ?? {};
    return {
      ...s,
      ...t,
      dish: tags.clip?.dish ?? null,
      quality: t.quality ?? 3,
      raw_json: mode === "claude" ? t : null,
    };
  });
  ix.replaceShots(clip.id, rows);
  ix.setClipStatus(clip.id, "analyzed", {
    analysis_mode: mode,
    dish: tags.clip?.dish ?? null,
    cuisine: tags.clip?.cuisine ?? null,
    protein: tags.clip?.protein ?? null,
    analyzed_at: new Date().toISOString(),
    error: null,
  });
  return { shots: rows.length, dead: rows.filter((r) => r.dead).length };
}

export async function analyzeAll(config, ix, brand, { force = false, limit, mode, concurrency = 2, log = () => {} } = {}) {
  mode = mode ?? resolveMode(config);
  const clips = ix.listClips(force ? {} : { status: "ingested" });
  const todo = limit ? clips.slice(0, limit) : clips;
  const summary = { mode, analyzed: 0, failed: 0, shots: 0, dead: 0, errors: [] };
  let cursor = 0;
  const worker = async () => {
    while (cursor < todo.length) {
      const clip = todo[cursor++];
      log(`analyze ${clip.rel_path}`);
      try {
        const r = await analyzeClip(config, ix, brand, clip, { mode, force, log });
        summary.analyzed++;
        summary.shots += r.shots;
        summary.dead += r.dead;
        log(`  ${r.shots} shots (${r.dead} dead)`);
      } catch (err) {
        summary.failed++;
        summary.errors.push({ file: clip.rel_path, error: err.message.split("\n")[0] });
        ix.setClipStatus(clip.id, "error", { error: err.message.slice(0, 500) });
        log(`  FAIL ${err.message.split("\n")[0]}`);
      }
    }
  };
  await Promise.all(Array.from({ length: mode === "claude" ? Math.max(1, concurrency) : 1 }, worker));
  return summary;
}
