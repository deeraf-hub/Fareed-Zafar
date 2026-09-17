import test from "node:test";
import assert from "node:assert/strict";
import { buildPlan, slotScore, mulberry32 } from "../src/planner.js";
import { shot, fakeIndex, BRAND } from "./helpers.js";

const TEMPLATE = {
  id: "t1",
  name: "Test 12s",
  platform: "tiktok",
  targetSeconds: 12,
  pacing: { minShot: 0.8, maxShot: 3 },
  slots: [
    { id: "hook", seconds: 2, count: 1, prefer: { heroWorthy: true, stages: ["hero"] }, sameRecipe: true, caption: "{{hook}}" },
    { id: "cook", seconds: 6, count: 3, prefer: { stages: ["cooking"] }, diversify: "actions", caption: "{{step}}" },
    { id: "plating", seconds: 2, count: 1, prefer: { stages: ["plating"] }, sameRecipe: true, caption: "{{step}}" },
    { id: "cta", seconds: 2, count: 1, prefer: { heroWorthy: true, stages: ["hero", "eating"] }, sameRecipe: true, caption: "{{cta}}" },
  ],
};

function library() {
  return [
    shot({ id: 1, clip_id: 1, stage: "hero", hero_worthy: true, hook_worthy: true, actions: [], duration: 6, end: 6, quality: 5, clip_filename: "hero.mp4" }),
    shot({ id: 2, clip_id: 2, stage: "cooking", actions: ["grilling"], duration: 8, end: 8, clip_filename: "grill.mp4" }),
    shot({ id: 3, clip_id: 3, stage: "cooking", actions: ["pouring"], ingredients: ["sauce"], duration: 4, end: 4, clip_filename: "pour.mp4" }),
    shot({ id: 4, clip_id: 4, stage: "cooking", actions: ["grilling"], duration: 4, end: 4, clip_filename: "grill2.mp4" }),
    shot({ id: 5, clip_id: 5, stage: "plating", actions: ["assembling"], duration: 4, end: 4, clip_filename: "plate.mp4" }),
    shot({ id: 6, clip_id: 6, stage: "eating", actions: ["biting"], duration: 3, end: 3, has_face: true, clip_filename: "bite.mp4" }),
    shot({ id: 7, clip_id: 7, stage: "hero", hero_worthy: true, duration: 4, end: 4, clip_recipe: "other-recipe", clip_filename: "other-hero.mp4" }),
  ];
}

test("fills every slot with matching stages and reserves scarce shots for their slot", () => {
  const plan = buildPlan({ ix: fakeIndex(library()), config: {}, brand: BRAND, template: TEMPLATE, recipe: "grilled-chicken-bowl", seed: 1 });
  assert.equal(plan.gaps.length, 0, JSON.stringify(plan.gaps));
  const bySlot = Object.groupBy(plan.segments, (s) => s.slot);
  assert.equal(bySlot.hook[0].stage, "hero");
  assert.ok(bySlot.cook.every((s) => s.stage === "cooking"), "cook slot only used cooking shots");
  assert.equal(bySlot.plating[0].stage, "plating");
  assert.ok(["hero", "eating"].includes(bySlot.cta[0].stage));
  assert.ok(Math.abs(plan.totalSeconds - 12) < 0.5);
});

test("first pass never fills a stage-specific slot with the wrong stage, even when short", () => {
  const shots = library().filter((s) => s.stage !== "cooking" || s.id === 2); // one cooking shot only
  const plan = buildPlan({ ix: fakeIndex(shots), config: {}, brand: BRAND, template: TEMPLATE, recipe: "grilled-chicken-bowl", seed: 1 });
  const bySlot = Object.groupBy(plan.segments, (s) => s.slot);
  assert.equal(bySlot.plating[0].stage, "plating", "plating shot reserved for the plating slot");
  assert.ok(bySlot.hook[0].hero_worthy);
  assert.ok(plan.gaps.some((g) => g.slot === "cook") || bySlot.cook.length >= 2);
});

test("diversify=actions prefers different actions across a slot", () => {
  const plan = buildPlan({ ix: fakeIndex(library()), config: {}, brand: BRAND, template: TEMPLATE, recipe: "grilled-chicken-bowl", seed: 3 });
  const cook = plan.segments.filter((s) => s.slot === "cook");
  const actions = cook.map((s) => s.actions[0]);
  assert.ok(actions.includes("pouring"), "the single pouring shot should be picked for variety");
});

test("windows from the same take never overlap and pacing limits are respected", () => {
  const plan = buildPlan({ ix: fakeIndex(library()), config: {}, brand: BRAND, template: TEMPLATE, recipe: "grilled-chicken-bowl", seed: 2 });
  const segs = plan.segments;
  for (const s of segs) assert.ok(s.duration <= 3.001 && s.duration >= 0.8, `bad duration ${s.duration}`);
  for (let i = 0; i < segs.length; i++)
    for (let j = i + 1; j < segs.length; j++)
      if (segs[i].shot_id === segs[j].shot_id) assert.ok(segs[i].out <= segs[j].in + 0.001 || segs[j].out <= segs[i].in + 0.001, "overlapping windows");
});

test("sameRecipe slots never borrow from other recipes; library scope can", () => {
  const shots = library().filter((s) => s.id !== 1 && s.id !== 6); // no own hero/eating shots
  const plan = buildPlan({ ix: fakeIndex(shots), config: {}, brand: BRAND, template: TEMPLATE, recipe: "grilled-chicken-bowl", seed: 1 });
  assert.ok(plan.segments.every((s) => s.recipe === "grilled-chicken-bowl"), "recipe scope never borrows another recipe's footage");
  const hook = plan.segments.find((s) => s.slot === "hook");
  assert.ok(!hook || !hook.hero_worthy, "the other recipe's hero shot must not be used for the hook");
  const libPlan = buildPlan({ ix: fakeIndex(shots), config: {}, brand: BRAND, template: { ...TEMPLATE, slots: TEMPLATE.slots.map((s) => ({ ...s, sameRecipe: false })) }, recipe: "grilled-chicken-bowl", scope: "library", seed: 1 });
  assert.ok(libPlan.segments.some((s) => s.recipe === "other-recipe"));
});

test("same seed → same plan; different seed can differ; unused shots are preferred", () => {
  const a = buildPlan({ ix: fakeIndex(library()), config: {}, brand: BRAND, template: TEMPLATE, recipe: "grilled-chicken-bowl", seed: 5 });
  const b = buildPlan({ ix: fakeIndex(library()), config: {}, brand: BRAND, template: TEMPLATE, recipe: "grilled-chicken-bowl", seed: 5 });
  assert.deepEqual(a.segments.map((s) => [s.shot_id, s.in]), b.segments.map((s) => [s.shot_id, s.in]));
  const used = new Map([[2, 3], [4, 3]]);
  const c = buildPlan({ ix: fakeIndex(library(), used), config: {}, brand: BRAND, template: TEMPLATE, recipe: "grilled-chicken-bowl", seed: 5 });
  assert.equal(c.segments.filter((s) => s.slot === "cook")[0].shot_id, 3, "unused pouring shot should lead the cook slot");
});

test("slotScore basics and PRNG determinism", () => {
  const cookSlot = TEMPLATE.slots[1];
  assert.ok(slotScore(shot({ stage: "cooking" }), cookSlot) > slotScore(shot({ stage: "plating" }), cookSlot));
  assert.ok(slotScore(shot({ dead: true }), cookSlot) < slotScore(shot(), cookSlot));
  assert.equal(slotScore(shot({ clip_recipe: "x" }), { ...cookSlot, sameRecipe: true }, { recipe: "y" }), -Infinity);
  const r1 = mulberry32(42);
  const r2 = mulberry32(42);
  assert.equal(r1(), r2());
});
