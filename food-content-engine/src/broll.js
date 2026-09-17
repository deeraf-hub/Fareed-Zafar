// AI B-roll prompt sheets. The engine never generates video itself; it writes
// prompts that match the brand's look (from brand-kit.json → visualStyle) and
// points at a real reference shot so image/video tools can style-match it.
import fs from "node:fs";
import path from "node:path";
import { structured, textBlock, imageBlock } from "./ai.js";

export const BROLL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["requests"],
  properties: {
    requests: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["need", "image_prompt", "motion_prompt", "negative_prompt", "seconds", "camera", "notes"],
        properties: {
          need: { type: "string" },
          image_prompt: { type: "string", description: "Prompt for a still image generator (Midjourney / Firefly / Ideogram), incl. lens, light, surface, props" },
          motion_prompt: { type: "string", description: "Prompt for an image-to-video tool (Kling / Runway / Veo / Luma): describe motion only" },
          negative_prompt: { type: "string" },
          seconds: { type: "number" },
          camera: { type: "string" },
          notes: { type: "string", description: "Continuity notes: what must match the reference shot" },
        },
      },
    },
  },
};

/** Turn plan gaps into concrete B-roll needs. */
export function needsFromPlan(plan) {
  return (plan.gaps ?? []).map((g) => {
    const p = g.prefer ?? {};
    const what = [
      p.stages?.length ? `${p.stages[0].replace(/_/g, " ")} shot` : "insert shot",
      p.actions?.length ? `of ${p.actions[0].replace(/_/g, " ")}` : null,
      p.shotTypes?.length ? `(${p.shotTypes[0].replace(/_/g, " ")})` : null,
      `for the "${g.slot}" section of ${plan.recipe ?? "a recipe"}`,
    ]
      .filter(Boolean)
      .join(" ");
    return { need: what, seconds: g.neededSeconds, slot: g.slot, platform: plan.platform };
  });
}

/** Best real shot to hand a generator as a style reference. */
export function pickReference(ix, { stage, recipe } = {}) {
  const shots = ix.allShots({ recipe, excludeAi: true }).filter((s) => (s.quality ?? 3) >= 4 || s.hero_worthy);
  const same = stage ? shots.filter((s) => s.stage === stage) : shots;
  const pool = same.length ? same : shots;
  pool.sort((a, b) => (b.quality ?? 0) - (a.quality ?? 0) || (b.hero_worthy ? 1 : 0) - (a.hero_worthy ? 1 : 0));
  return pool[0] ?? null;
}

export function offlinePrompts(needs, brand) {
  const v = brand.visualStyle ?? {};
  return needs.map((n) => ({
    need: n.need,
    image_prompt: `Photorealistic food photography, ${n.need}. ${v.lighting ?? "soft natural light"}; ${v.surfaces ?? "dark surfaces"}; ${v.lens ?? "85mm macro, shallow depth of field"}; palette: ${v.palette ?? "warm neutrals"}; props: ${v.props ?? "minimal"}. Colour grade: ${(brand.colorGrade?.notes ?? "warm, high contrast").replace(/\.$/, "")}. Vertical 9:16 framing, subject in the centre third.`,
    motion_prompt: `Slow ${n.camera ?? "push-in"} on the subject, gentle steam or light movement only, no camera shake, no morphing, hold the last frame.`,
    negative_prompt: `${v.avoid ?? "stock-photo look"}, text, logos, watermark, extra fingers, plastic textures, oversaturated`,
    seconds: Math.max(3, Math.min(6, Math.ceil(n.seconds ?? 4))),
    camera: n.camera ?? "slow push-in",
    notes: "Match the reference shot's lighting direction (key from camera left), surface and bowl colour before generating; grade with the brand LUT after.",
  }));
}

export async function claudePrompts({ config, brand, needs, reference }) {
  const v = brand.visualStyle ?? {};
  const content = [
    textBlock(
      [
        `Brand visual style — lighting: ${v.lighting}; surfaces: ${v.surfaces}; lens: ${v.lens}; palette: ${v.palette}; props: ${v.props}; avoid: ${v.avoid}.`,
        `Colour grade: ${brand.colorGrade?.notes ?? ""}`,
        `Rules for AI B-roll: allowed for ${(brand.aiBroll?.allowedFor ?? []).join(", ")}; never for ${(brand.aiBroll?.neverFor ?? []).join(", ")}.`,
        "",
        "Write one request per need. Prompts must be concrete (lens, light direction, surface, props, framing), 9:16 unless stated, and must blend with real footage: no perfect symmetry, slight imperfections, realistic steam and oil sheen.",
        "",
        "Needs:",
        ...needs.map((n, i) => `${i + 1}. ${n.need} (${n.seconds ?? 4}s, ${n.platform ?? "9:16"})`),
      ].join("\n"),
    ),
  ];
  if (reference?.frames?.[1] && fs.existsSync(reference.frames[1])) {
    content.push(textBlock(`Reference frame from a real shot in the library (${reference.clip_filename}, ${reference.stage}). Match its look.`));
    content.push(imageBlock(reference.frames[1]));
  }
  const { data } = await structured({ config, system: "You are a food-photography art director writing generation prompts that must cut seamlessly into real footage.", content, schema: BROLL_SCHEMA, maxTokens: 6000, label: "b-roll prompts" });
  return data.requests;
}

export function writePromptSheet(dir, { requests, reference, brand, needs }) {
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const json = path.join(dir, `broll-requests-${stamp}.json`);
  const md = path.join(dir, `broll-requests-${stamp}.md`);
  fs.writeFileSync(json, JSON.stringify({ generated: new Date().toISOString(), reference: reference ? { shot_id: reference.id, file: reference.clip_filename, frame: reference.frames?.[1] } : null, requests }, null, 2) + "\n");
  const L = [`# AI B-roll requests — ${stamp}`, ""];
  L.push(`Brand rule: AI inserts ≤ ${(brand.aiBroll?.maxShareOfRuntime ?? 0.2) * 100}% of runtime, never for ${(brand.aiBroll?.neverFor ?? []).join(", ")}.`, "");
  if (reference) L.push(`Style reference: \`${reference.clip_filename}\` shot ${reference.idx} (${reference.stage}) — frame: \`${reference.frames?.[1] ?? "n/a"}\`. Upload this frame as the image reference / style reference in the generator.`, "");
  L.push("Workflow: still image first (Midjourney / Firefly / Ideogram) → pick the best of 4 → image-to-video (Kling / Runway Gen-4 / Veo / Luma) with the motion prompt → grade with the brand LUT → drop into `04_assets/ai-broll/` → `fce ingest && fce analyze`.", "");
  requests.forEach((r, i) => {
    L.push(`## ${i + 1}. ${r.need}`, "", `- Length: ${r.seconds}s · Camera: ${r.camera}`, "", "**Image prompt**", "", "```", r.image_prompt, "```", "", "**Motion prompt (image → video)**", "", "```", r.motion_prompt, "```", "", "**Negative prompt**", "", "```", r.negative_prompt, "```", "", `Continuity: ${r.notes}`, "");
  });
  fs.writeFileSync(md, L.join("\n"));
  return { json, md };
}
