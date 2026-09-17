import test from "node:test";
import assert from "node:assert/strict";
import { extractTags, normalizeText, ACTION_VERBS, ACTIONS } from "../src/taxonomy.js";

test("extractTags reads the naming convention", () => {
  const t = extractTags("20260910_grilled-chicken-bowl_cooking_chicken-grilling_closeup_t02.mp4");
  assert.deepEqual(t.actions, ["grilling"]);
  assert.deepEqual(t.ingredients, ["chicken"]);
  assert.deepEqual(t.shot_types, ["close_up"]);
  assert.deepEqual(t.stages, ["cooking"]);
});

test("extractTags understands the brief's example searches", () => {
  const a = extractTags("Show me all chicken recipes with grilling shots");
  assert.deepEqual([a.ingredients, a.actions], [["chicken"], ["grilling"]]);
  const b = extractTags("Find close-up shots of pouring sauce");
  assert.deepEqual([b.shot_types, b.actions, b.ingredients], [["close_up"], ["pouring"], ["sauce"]]);
});

test("multi-word phrases win over single words and synonyms map to canonical tags", () => {
  const t = extractTags("top down flat lay, bbq prawns, air fryer");
  assert.ok(t.shot_types.includes("overhead"));
  assert.ok(t.stages.includes("ingredients"));
  assert.ok(t.actions.includes("grilling"));
  assert.ok(t.actions.includes("air_frying"));
  assert.ok(t.ingredients.includes("shrimp"));
});

test("normalizeText strips extensions, separators and punctuation", () => {
  assert.equal(normalizeText("Chicken_Grill-Closeup.mp4"), "chicken grill closeup");
  assert.equal(normalizeText("flat lays, hands only!"), "flat lays hands only");
});

test("every action has an imperative verb for captions", () => {
  for (const a of ACTIONS) assert.ok(ACTION_VERBS[a], `missing verb for ${a}`);
});
