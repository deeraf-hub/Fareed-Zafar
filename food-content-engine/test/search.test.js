import test from "node:test";
import assert from "node:assert/strict";
import { parseQueryOffline, scoreShot, searchShots, unusedFootage } from "../src/search.js";
import { shot } from "./helpers.js";

test("parseQueryOffline maps natural language to a filter", () => {
  const f = parseQueryOffline("best hero shots of salmon under 4s");
  assert.deepEqual(f.ingredients, ["salmon"]);
  assert.equal(f.hero_only, true);
  assert.equal(f.min_quality, 4);
  assert.equal(f.max_duration, 4);
  const g = parseQueryOffline("hands only overhead ingredient flat lay");
  assert.equal(g.has_face, false);
  assert.deepEqual(g.shot_types, ["overhead"]);
});

test("scoreShot: shots matching more facets rank first, non-matching are dropped", () => {
  const f = parseQueryOffline("chicken recipes with grilling shots");
  const both = scoreShot(shot(), f);
  const chickenOnly = scoreShot(shot({ actions: ["slicing"], stage: "prep" }), f);
  const none = scoreShot(shot({ ingredients: ["salmon"], actions: ["searing"], clip_recipe: "salmon-bowl", dish: "Salmon", clip_dish: null }), f);
  assert.equal(both.matched, 2);
  assert.equal(chickenOnly.matched, 1);
  assert.ok(both.score > chickenOnly.score);
  assert.equal(none, null);
});

test("scoreShot hard filters", () => {
  const f = { ...parseQueryOffline("chicken"), has_face: true };
  assert.equal(scoreShot(shot({ has_face: false }), f), null);
  assert.ok(scoreShot(shot({ has_face: true }), f));
  assert.equal(scoreShot(shot({ quality: 2 }), { ...parseQueryOffline("chicken"), min_quality: 4 }), null);
});

test("searchShots respects unusedOnly, strict and limit; unusedFootage groups the backlog", () => {
  const shots = [shot({ id: 1 }), shot({ id: 2, actions: ["slicing"], stage: "prep" }), shot({ id: 3, clip_id: 2, clip_recipe: "salmon", dish: null, ingredients: ["salmon"], actions: ["searing"], quality: 5 })];
  const used = new Map([[1, 2]]);
  const ix = { allShots: () => shots, usageCounts: () => used, ftsSearch: () => new Map() };
  const f = parseQueryOffline("chicken grilling");
  assert.deepEqual(searchShots(ix, f).map((s) => s.id), [1, 2]);
  assert.deepEqual(searchShots(ix, f, { unusedOnly: true }).map((s) => s.id), [2]);
  assert.deepEqual(searchShots(ix, f, { strict: true }).map((s) => s.id), [1]);
  assert.equal(searchShots(ix, f, { limit: 1 }).length, 1);
  const backlog = unusedFootage(ix);
  assert.deepEqual(backlog.map((b) => b.recipe).sort(), ["grilled-chicken-bowl", "salmon"]);
  assert.equal(backlog.find((b) => b.recipe === "grilled-chicken-bowl").shots, 1);
});
