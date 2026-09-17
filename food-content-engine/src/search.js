// Natural-language footage search.
//   "Show me all chicken recipes with grilling shots"
//   "Find close-up shots of pouring sauce"
// A query becomes a structured filter (Claude when available, taxonomy
// matching offline), the filter becomes SQL + FTS, and results are ranked by
// how many facets they satisfy, technical quality and whether they are unused.

import { structured, textBlock } from "./ai.js";
import { extractTags, SHOT_TYPES, CAMERA_MOTION, STAGES, ACTIONS, normalizeText } from "./taxonomy.js";

const STOPWORDS = new Set(
  "show me all find get give the a an of with for and or in on at to from that this those these shots shot clips clip footage video videos recipe recipes any some every please i want need looking".split(" "),
);

export const FILTER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ingredients", "actions", "shot_types", "stages", "camera_motion", "dish", "hero_only", "hook_only", "min_quality", "has_face", "terms", "min_duration", "max_duration"],
  properties: {
    ingredients: { type: "array", items: { type: "string" } },
    actions: { type: "array", items: { type: "string", enum: ACTIONS } },
    shot_types: { type: "array", items: { type: "string", enum: SHOT_TYPES } },
    stages: { type: "array", items: { type: "string", enum: STAGES } },
    camera_motion: { type: "array", items: { type: "string", enum: CAMERA_MOTION } },
    dish: { anyOf: [{ type: "string" }, { type: "null" }], description: "Dish or recipe name if the query names one" },
    hero_only: { type: "boolean" },
    hook_only: { type: "boolean" },
    min_quality: { anyOf: [{ type: "integer" }, { type: "null" }] },
    has_face: { anyOf: [{ type: "boolean" }, { type: "null" }] },
    terms: { type: "array", items: { type: "string" }, description: "Free-text keywords not covered by the structured fields" },
    min_duration: { anyOf: [{ type: "number" }, { type: "null" }] },
    max_duration: { anyOf: [{ type: "number" }, { type: "null" }] },
  },
};

export function emptyFilter() {
  return {
    ingredients: [], actions: [], shot_types: [], stages: [], camera_motion: [], dish: null,
    hero_only: false, hook_only: false, min_quality: null, has_face: null, terms: [], min_duration: null, max_duration: null,
  };
}

export function parseQueryOffline(query) {
  const f = emptyFilter();
  const tags = extractTags(query);
  f.ingredients = tags.ingredients;
  f.actions = tags.actions;
  f.shot_types = tags.shot_types;
  f.stages = tags.stages;
  f.camera_motion = tags.camera_motion;
  f.hero_only = tags.hero;
  f.hook_only = tags.hook;
  const q = normalizeText(query);
  const face = /\b(face|talking|to camera|reaction)\b/.test(q);
  if (face) f.has_face = true;
  if (/\bno (face|people|person)\b|\bhands only\b/.test(q)) f.has_face = false;
  const qm = q.match(/\b(best|top|high quality|quality)\b/);
  if (qm) f.min_quality = 4;
  const dm = q.match(/\b(under|less than|shorter than|max)\s+(\d+(?:\.\d+)?)\s*s/);
  if (dm) f.max_duration = Number(dm[2]);
  const dm2 = q.match(/\b(over|longer than|at least|min)\s+(\d+(?:\.\d+)?)\s*s/);
  if (dm2) f.min_duration = Number(dm2[2]);
  const known = new Set([...f.ingredients, ...f.actions, ...f.shot_types, ...f.stages, ...f.camera_motion].flatMap((t) => t.split("_")));
  f.terms = q
    .split(" ")
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !known.has(w) && !/^\d+s?$/.test(w));
  return f;
}

export async function parseQuery(query, { config, mode }) {
  if (mode !== "claude") return { filter: parseQueryOffline(query), mode: "offline" };
  const { data } = await structured({
    config,
    system: [
      "Convert a footage search request from a video editor into a structured filter for a cooking-footage database.",
      `Allowed actions: ${ACTIONS.join(", ")}. Allowed shot_types: ${SHOT_TYPES.join(", ")}. Allowed stages: ${STAGES.join(", ")}. Allowed camera_motion: ${CAMERA_MOTION.join(", ")}.`,
      "Ingredients are snake_case nouns. Put anything else useful (textures, colours, props, moods, 'steam', 'cheese pull') in terms.",
      "Only set hero_only / hook_only when the request clearly asks for finished-dish beauty shots or scroll-stopping openers.",
    ].join("\n"),
    content: [textBlock(query)],
    schema: FILTER_SCHEMA,
    maxTokens: 2000,
    effort: "low",
    label: "parse query",
  });
  return { filter: { ...emptyFilter(), ...data }, mode: "claude" };
}

// ---- ranking ---------------------------------------------------------------

function overlap(list, wanted) {
  if (!wanted?.length) return null;
  const have = new Set((list ?? []).map((x) => String(x).toLowerCase()));
  return wanted.filter((w) => have.has(String(w).toLowerCase())).length;
}

/**
 * Score one shot against a filter. Returns { score, matched, facets } where
 * `facets` is the number of facets the filter asked for and `matched` how
 * many this shot satisfied. Shots matching zero facets are dropped.
 */
export function scoreShot(shot, filter, { ftsRank = null, used = 0 } = {}) {
  let facets = 0;
  let matched = 0;
  let score = 0;
  const facet = (hits, weight) => {
    facets++;
    if (hits) {
      matched++;
      score += weight * hits;
    }
  };
  if (filter.ingredients?.length) {
    const dishHit = filter.ingredients.some((i) => (shot.dish ?? shot.clip_dish ?? shot.clip_recipe ?? "").toLowerCase().includes(String(i).toLowerCase().replace(/_/g, " ")) || (shot.clip_recipe ?? "").includes(String(i).toLowerCase()));
    facet((overlap(shot.ingredients, filter.ingredients) || 0) + (dishHit ? 0.5 : 0), 10);
  }
  if (filter.actions?.length) facet(overlap(shot.actions, filter.actions), 10);
  if (filter.shot_types?.length) facet(filter.shot_types.includes(shot.shot_type) ? 1 : 0, 6);
  if (filter.stages?.length) facet(filter.stages.includes(shot.stage) ? 1 : 0, 6);
  if (filter.camera_motion?.length) facet(filter.camera_motion.includes(shot.camera_motion) ? 1 : 0, 4);
  if (filter.dish) facet((shot.dish ?? shot.clip_dish ?? shot.clip_recipe ?? "").toLowerCase().includes(filter.dish.toLowerCase().replace(/_/g, " ")) || (shot.clip_recipe ?? "").includes(filter.dish.toLowerCase().replace(/\s+/g, "-")) ? 1 : 0, 8);
  if (filter.hero_only) facet(shot.hero_worthy ? 1 : 0, 6);
  if (filter.hook_only) facet(shot.hook_worthy ? 1 : 0, 6);
  if (filter.terms?.length) facet(ftsRank != null ? 1 : 0, 4);
  if (filter.has_face === true && !shot.has_face) return null;
  if (filter.has_face === false && shot.has_face) return null;
  if (filter.min_quality && (shot.quality ?? 0) < filter.min_quality) return null;
  if (filter.min_duration && shot.duration < filter.min_duration) return null;
  if (filter.max_duration && shot.duration > filter.max_duration) return null;
  if (facets > 0 && matched === 0) return null;
  score += (shot.quality ?? 3) * 1.5;
  if (shot.hero_worthy) score += 1;
  if (shot.hook_worthy) score += 1;
  if (used === 0) score += 2;
  if (ftsRank != null) score += Math.min(3, -ftsRank * 100);
  if (shot.dead) score -= 8;
  return { score: Math.round(score * 100) / 100, matched, facets };
}

export function searchShots(ix, filter, { limit = 30, unusedOnly = false, recipe, strict = false, excludeAi = false, includeDead = false } = {}) {
  const fts = filter.terms?.length ? ix.ftsSearch(filter.terms) : new Map();
  const used = ix.usageCounts();
  const candidates = ix.allShots({ recipe, excludeAi, includeDead });
  const results = [];
  for (const shot of candidates) {
    const u = used.get(shot.id) ?? 0;
    if (unusedOnly && u > 0) continue;
    const s = scoreShot(shot, filter, { ftsRank: fts.get(shot.id) ?? null, used: u });
    if (!s) continue;
    if (strict && s.matched < s.facets) continue;
    results.push({ ...shot, score: s.score, matched: s.matched, facets: s.facets, used: u });
  }
  results.sort((a, b) => b.matched - a.matched || b.score - a.score || a.id - b.id);
  return results.slice(0, limit);
}

/** Shots never placed in any plan, grouped by recipe → the repurposing backlog. */
export function unusedFootage(ix, { minQuality = 3, recipe } = {}) {
  const used = ix.usageCounts();
  const groups = new Map();
  for (const shot of ix.allShots({ recipe })) {
    if (used.has(shot.id)) continue;
    if ((shot.quality ?? 3) < minQuality) continue;
    const key = shot.clip_recipe ?? "(no recipe)";
    if (!groups.has(key)) groups.set(key, { recipe: key, shots: 0, seconds: 0, hero: 0, hook: 0, stages: {}, clips: new Set() });
    const g = groups.get(key);
    g.shots++;
    g.seconds += shot.duration;
    if (shot.hero_worthy) g.hero++;
    if (shot.hook_worthy) g.hook++;
    g.stages[shot.stage ?? "untagged"] = (g.stages[shot.stage ?? "untagged"] ?? 0) + 1;
    g.clips.add(shot.clip_id);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, clips: g.clips.size, seconds: Math.round(g.seconds) }))
    .sort((a, b) => b.seconds - a.seconds);
}
