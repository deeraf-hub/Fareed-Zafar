// Caption copy: fills the {{placeholders}} in a template with lines in the
// brand voice. Claude writes them when available; offline uses the shot's own
// caption suggestion plus the brand kit's hook / CTA formulas.
import { structured, textBlock } from "./ai.js";
import { titleCase } from "./taxonomy.js";

export const COPY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["hook", "cta", "title", "description", "hashtags", "captions"],
  properties: {
    hook: { type: "string", description: "Opening on-screen line, max 6 words" },
    cta: { type: "string", description: "Closing on-screen line, max 6 words" },
    title: { type: "string", description: "Post title / first line of the caption, max 60 chars" },
    description: { type: "string", description: "Post description: 2-3 short lines incl. macros if provided; no hashtags" },
    hashtags: { type: "array", items: { type: "string" } },
    captions: {
      type: "array",
      description: "One on-screen caption per segment index, in order",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["segment", "text"],
        properties: { segment: { type: "integer" }, text: { type: "string" } },
      },
    },
  },
};

function fill(str, vars) {
  return String(str).replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] != null && vars[k] !== "" ? vars[k] : ""));
}

function pick(arr, seed) {
  if (!arr?.length) return "";
  const n = typeof seed === "number" ? seed - 1 : String(seed).length;
  return arr[Math.abs(n) % arr.length];
}

/** Human-readable dish name from the recipe slug or the analyzer's guess. */
export function dishName(plan, info = {}) {
  if (info.dish) return info.dish;
  if (!plan.recipe) return "this recipe";
  // "salmon-teriyaki-mealprep-v2" → "Salmon Teriyaki"
  const cleaned = plan.recipe
    .split("-")
    .filter((t) => !/^(mealprep|meal|prep|v\d+|take\d*|final|edit|reel|tiktok|short|version)$/i.test(t))
    .join(" ");
  return titleCase(cleaned || plan.recipe);
}

export function offlineCopy(plan, brand, info = {}) {
  const dish = dishName(plan, info);
  const vars = {
    dish,
    protein: info.protein ?? "protein",
    protein_grams: info.protein_grams,
    calories: info.calories,
    minutes: info.minutes,
    portions: info.portions ?? 4,
  };
  // Only formulas whose every placeholder has a value; never ship "{{protein_grams}}g" or "g protein".
  const formulas = (brand.voice?.hookFormulas ?? []).filter((f) => [...String(f).matchAll(/\{\{(\w+)\}\}/g)].every((m) => vars[m[1]] != null && vars[m[1]] !== ""));
  const hook = info.hook ?? (formulas.length ? fill(pick(formulas, plan.seed), vars) : `${dish} in ${info.minutes ?? 20} min`);
  const cta = info.cta ?? pick(brand.voice?.ctas ?? ["Save this for later"], plan.seed);
  const macros = info.protein_grams || info.calories
    ? [info.protein_grams ? `${info.protein_grams}g protein` : null, info.calories ? `${info.calories} kcal` : null].filter(Boolean).join(" · ")
    : "Macros in the caption";
  const captions = plan.segments.map((s) => {
    const ingredientLine = (s.ingredients ?? []).slice(0, 3).map((i) => i.replace(/_/g, " ")).join(" · ");
    const slotVars = {
      ...vars,
      hook,
      cta,
      step: s.caption_suggestion || titleCase(s.stage ?? ""),
      ingredients: ingredientLine ? titleCase(ingredientLine) : "What you need",
      reaction: "That first bite",
      macro_hook: info.protein_grams ? `${info.protein_grams}g protein per serving` : `High protein ${dish}`,
      protein_line: s.ingredients?.[0] ? `${titleCase(s.ingredients[0])}${info.protein_grams ? ` · ${info.protein_grams}g protein` : ""}` : "Lean protein first",
      macros,
      ingredient_hook: s.ingredients?.[0] ? `Do this with ${s.ingredients[0].replace(/_/g, " ")}` : hook,
      ingredient_fact: s.caption_suggestion || (s.ingredients?.[0] ? titleCase(s.ingredients[0]) : ""),
      mealprep_hook: `Meal prep ${vars.portions} ${dish}`,
      portion_line: `${vars.portions} portions, ${info.minutes ?? 30} min`,
      storage_tip: "Keeps 4 days in the fridge",
    };
    return { segment: s.index, text: fill(s.captionKey ?? "", slotVars).trim() || s.caption_suggestion || "" };
  });
  return {
    hook,
    cta,
    title: `${dish}${info.protein_grams ? ` (${info.protein_grams}g protein)` : ""}`,
    description: [`${dish} — ${brand.brand?.promise ?? "quick, high protein"}.`, macros !== "Macros in the caption" ? macros : null, "Full recipe below."].filter(Boolean).join("\n"),
    hashtags: ["#mealprep", "#highprotein", "#easyrecipes", `#${(plan.recipe ?? "recipe").replace(/-/g, "")}`],
    captions,
    mode: "offline",
  };
}

export async function claudeCopy({ config, brand, plan, info = {} }) {
  const dish = dishName(plan, info);
  const segLines = plan.segments.map((s) => `${s.index}. [${s.slot}] ${s.duration}s — ${s.description ?? ""} | actions: ${(s.actions ?? []).join(", ") || "-"} | ingredients: ${(s.ingredients ?? []).join(", ") || "-"} | placeholder: ${s.captionKey ?? "-"}`);
  const { data } = await structured({
    config,
    system: [
      `You write on-screen captions and post copy for ${brand.brand?.name ?? "a food brand"} (${brand.brand?.niche ?? ""}). Audience: ${brand.brand?.audience ?? ""}.`,
      `Voice: ${brand.voice?.tone ?? "confident, warm"}. Caption rules: ${(brand.voice?.captionRules ?? []).join("; ")}.`,
      `Hook formulas you may adapt: ${(brand.voice?.hookFormulas ?? []).join(" | ")}. CTAs: ${(brand.voice?.ctas ?? []).join(" | ")}.`,
      "Write exactly one caption per segment. Placeholder names tell you the job of the line: hook = scroll-stopper, step = what the viewer sees, ingredients = list what is on screen, cta = closing line, macros = the numbers, ingredient_fact = a short useful fact.",
      "Never invent nutrition numbers; use only the values provided. Consecutive segments of the same slot may share a caption when the line needs more time on screen.",
    ].join("\n"),
    content: [
      textBlock(
        [
          `Dish: ${dish}`,
          `Template: ${plan.templateName} for ${plan.platform}, ${plan.totalSeconds}s`,
          Object.keys(info).length ? `Known facts: ${JSON.stringify(info)}` : "No nutrition facts provided.",
          "",
          "Segments:",
          ...segLines,
        ].join("\n"),
      ),
    ],
    schema: COPY_SCHEMA,
    maxTokens: 4000,
    effort: "medium",
    label: "caption copy",
  });
  return { ...data, mode: "claude" };
}

export function applyCopy(plan, copy) {
  const byIndex = new Map((copy.captions ?? []).map((c) => [c.segment, c.text]));
  for (const s of plan.segments) {
    const t = byIndex.get(s.index);
    s.caption = t != null && t !== "" ? t : s.caption_suggestion ?? "";
  }
  plan.copy = { hook: copy.hook, cta: copy.cta, title: copy.title, description: copy.description, hashtags: copy.hashtags, mode: copy.mode };
  return plan;
}

export function parseInfo(str) {
  // "protein_grams=42,calories=520,minutes=20,portions=4,dish=Grilled Chicken Bowl"
  const info = {};
  for (const part of String(str ?? "").split(",")) {
    const [k, ...rest] = part.split("=");
    if (k && rest.length) info[k.trim()] = rest.join("=").trim();
  }
  return info;
}
