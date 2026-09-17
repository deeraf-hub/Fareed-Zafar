import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { structured, setClientFactory, resolveMode, AiRefusal, usageSummary, resetUsage } from "../src/ai.js";
import { tagWithClaude, tagOffline, TAG_SCHEMA } from "../src/analyze.js";
import { parseQuery } from "../src/search.js";
import { tmpDir, BRAND } from "./helpers.js";

function fakeClient(handler) {
  return { beta: { messages: { create: async (req) => handler(req) } } };
}

test("resolveMode honours config and credentials", () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  setClientFactory(null);
  assert.equal(resolveMode({ ai: { mode: "auto" } }), "offline");
  assert.throws(() => resolveMode({ ai: { mode: "claude" } }), /ANTHROPIC_API_KEY/);
  setClientFactory(() => fakeClient(() => ({})));
  assert.equal(resolveMode({ ai: { mode: "auto" } }), "claude");
  assert.equal(resolveMode({ ai: { mode: "offline" } }), "offline");
  setClientFactory(null);
  if (saved) process.env.ANTHROPIC_API_KEY = saved;
});

test("structured() sends schema + fallbacks and parses JSON text; refusals throw", async () => {
  let seen;
  setClientFactory(() =>
    fakeClient((req) => {
      seen = req;
      return { stop_reason: "end_turn", model: "claude-opus-5", content: [{ type: "text", text: JSON.stringify({ ok: true }) }], usage: { input_tokens: 10, output_tokens: 5 } };
    }),
  );
  resetUsage();
  const r = await structured({ config: { ai: { model: "claude-opus-5", effort: "low" } }, system: "s", content: [{ type: "text", text: "hi" }], schema: { type: "object" }, label: "t" });
  assert.deepEqual(r.data, { ok: true });
  assert.equal(seen.model, "claude-opus-5");
  assert.equal(seen.fallbacks, "default");
  assert.ok(seen.betas.includes("server-side-fallback-2026-07-01"));
  assert.deepEqual(seen.output_config.format, { type: "json_schema", schema: { type: "object" } });
  assert.equal(seen.output_config.effort, "low");
  assert.equal(usageSummary().requests, 1);
  setClientFactory(() => fakeClient(() => ({ stop_reason: "refusal", stop_details: { category: "x", explanation: "nope" }, content: [] })));
  await assert.rejects(() => structured({ config: { ai: {} }, content: [], schema: {} }), AiRefusal);
  setClientFactory(() => fakeClient(() => ({ stop_reason: "max_tokens", content: [{ type: "text", text: "{" }] })));
  await assert.rejects(() => structured({ config: { ai: {} }, content: [], schema: {} }), /cut off/);
  setClientFactory(null);
});

test("tagWithClaude batches frames per request and merges shot tags", async () => {
  const dir = tmpDir();
  const frames = [0, 1, 2, 3].map((i) => {
    const f = path.join(dir, `f${i}.jpg`);
    fs.writeFileSync(f, Buffer.from("ffd8ffd9", "hex"));
    return f;
  });
  const shots = [
    { idx: 0, start: 0, end: 3, duration: 3, motion: 4, frames: [frames[0], frames[1]] },
    { idx: 1, start: 3, end: 6, duration: 3, motion: 0.1, frames: [frames[2], frames[3]] },
  ];
  const requests = [];
  setClientFactory(() =>
    fakeClient((req) => {
      requests.push(req);
      const images = req.messages[0].content.filter((b) => b.type === "image").length;
      const shotIdx = requests.length - 1;
      return {
        stop_reason: "end_turn", model: "claude-opus-5", usage: { input_tokens: 1, output_tokens: 1 },
        content: [{ type: "text", text: JSON.stringify({ clip: { dish: "Bowl", cuisine: null, protein: "chicken", confidence: 0.9 - shotIdx * 0.5 }, shots: [{ shot_index: shotIdx, shot_type: "close_up", camera_motion: "static", stage: "cooking", description: `${images} images`, ingredients: ["chicken"], actions: ["grilling"], keywords: [], quality: 4, hero_worthy: false, hook_worthy: false, has_face: false, has_hands: true, lighting: "natural", caption_suggestion: "Grill it" }] }) }],
      };
    }),
  );
  const config = { ai: { model: "claude-opus-5", maxImagesPerRequest: 2 } };
  const clip = { filename: "20260910_bowl_cooking_chicken-grilling_closeup_t01.mp4", rel_path: "01_raw/2026-09-10_bowl/20260910_bowl_cooking_chicken-grilling_closeup_t01.mp4", recipe: "bowl", duration: 6 };
  const tags = await tagWithClaude(config, BRAND, clip, shots);
  assert.equal(requests.length, 2, "two shots × two frames with a 2-image cap → two requests");
  assert.equal(tags.shots.length, 2);
  assert.equal(tags.clip.confidence, 0.9);
  assert.match(requests[0].system, /shot_type must be one of/);
  assert.ok(requests[0].messages[0].content.some((b) => b.type === "text" && /very low|high/.test(b.text)));
  assert.ok(TAG_SCHEMA.properties.shots.items.required.includes("hook_worthy"));
  setClientFactory(null);
});

test("parseQuery uses Claude when in claude mode", async () => {
  setClientFactory(() => fakeClient(() => ({ stop_reason: "end_turn", model: "claude-opus-5", usage: {}, content: [{ type: "text", text: JSON.stringify({ ingredients: ["cheese"], actions: ["lifting"], shot_types: [], stages: [], camera_motion: [], dish: null, hero_only: false, hook_only: true, min_quality: null, has_face: null, terms: ["cheese pull"], min_duration: null, max_duration: null }) }] })));
  const { filter, mode } = await parseQuery("cheese pull moments", { config: { ai: {} }, mode: "claude" });
  assert.equal(mode, "claude");
  assert.deepEqual(filter.terms, ["cheese pull"]);
  setClientFactory(null);
});

test("tagOffline never guesses actions from the recipe name", () => {
  const clip = { rel_path: "01_raw/2026-09-10_grilled-chicken-bowl/20260910_grilled-chicken-bowl_cooking_rice-stirring_medium_t01.mp4", filename: "20260910_grilled-chicken-bowl_cooking_rice-stirring_medium_t01.mp4", recipe: "grilled-chicken-bowl", session: "2026-09-10_grilled-chicken-bowl" };
  const t = tagOffline(clip, [{ idx: 0, start: 0, end: 4, duration: 4, motion: 3 }]);
  assert.deepEqual(t.shots[0].actions, ["stirring"]);
  assert.deepEqual(t.shots[0].ingredients, ["rice"]);
  assert.equal(t.shots[0].caption_suggestion, "Stir the rice");
  assert.equal(t.clip.protein, "chicken");
});
