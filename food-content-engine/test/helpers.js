import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function tmpDir(prefix = "fce-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Minimal shot rows shaped like Index.allShots() output. */
export function shot(overrides = {}) {
  return {
    id: 1, clip_id: 1, idx: 0, start: 0, end: 5, duration: 5, motion: 4, dead: false, frames: [],
    shot_type: "close_up", camera_motion: "static", stage: "cooking", dish: "Grilled Chicken Bowl", description: "",
    ingredients: ["chicken"], actions: ["grilling"], keywords: [], quality: 4, hero_worthy: false, hook_worthy: false,
    has_face: false, has_hands: true, lighting: "natural", caption_suggestion: "Grill the chicken",
    clip_path: "/lib/a.mp4", clip_filename: "a.mp4", clip_recipe: "grilled-chicken-bowl", clip_session: "s",
    clip_source_type: "raw", clip_ai_generated: false, clip_has_audio: true, clip_fps: 30, clip_width: 1920, clip_height: 1080, clip_duration: 10, clip_dish: null,
    ...overrides,
  };
}

/** Fake index for planner tests. */
export function fakeIndex(shots, usage = new Map()) {
  return { allShots: () => shots, usageCounts: () => usage, savePlan: () => {} };
}

export const BRAND = {
  brand: { name: "Test Brand", niche: "test", promise: "fast" },
  voice: { captionRules: ["short"], hookFormulas: ["{{protein_grams}}g protein {{dish}}", "The {{dish}} I eat every day"], ctas: ["Save this"] },
  colors: { captionText: "#FFFFFF", captionHighlight: "#FFD23F", captionOutline: "#000000" },
  fonts: { caption: { family: "DejaVu Sans", weight: 700 } },
  captions: { fontSizePct: 5, outlinePx: 3, shadowPx: 0, maxCharsPerLine: 22, maxLines: 2, marginBottomPct: 20, highlightKeywords: true },
  pacing: { default: { minShot: 0.8, maxShot: 3.0 } },
  aiBroll: { maxShareOfRuntime: 0.2 },
  platforms: {
    tiktok: { label: "TikTok", width: 1080, height: 1920, fps: 30, maxSeconds: 180, idealSeconds: [15, 60], maxFileMB: 287, safeZone: { top: 150, bottom: 400, left: 60, right: 130 }, loudnessLUFS: -14, loudnessTolerance: 2, truePeakMax: -1 },
    instagram_reel: { label: "Reel", width: 1080, height: 1920, fps: 30, maxSeconds: 90, idealSeconds: [15, 45], maxFileMB: 250, safeZone: { top: 220, bottom: 330, left: 60, right: 120 }, loudnessLUFS: -14, loudnessTolerance: 2, truePeakMax: -1 },
  },
  variantSets: { default: ["t1"] },
};
