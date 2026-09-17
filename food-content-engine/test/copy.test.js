import test from "node:test";
import assert from "node:assert/strict";
import { offlineCopy, applyCopy, parseInfo, dishName } from "../src/copy.js";
import { BRAND } from "./helpers.js";

const plan = {
  recipe: "grilled-chicken-bowl", seed: 1, templateName: "t", platform: "tiktok", totalSeconds: 6,
  segments: [
    { index: 0, slot: "hook", captionKey: "{{hook}}", caption_suggestion: "The final result", ingredients: ["chicken"], stage: "hero" },
    { index: 1, slot: "cook", captionKey: "{{step}}", caption_suggestion: "Grill the chicken", ingredients: ["chicken"], stage: "cooking" },
    { index: 2, slot: "ingredients", captionKey: "{{ingredients}}", caption_suggestion: "", ingredients: ["rice", "broccoli", "soy_sauce", "ginger"], stage: "ingredients" },
    { index: 3, slot: "cta", captionKey: "{{cta}}", caption_suggestion: "", ingredients: [], stage: "hero" },
  ],
};

test("offline copy fills placeholders from brand formulas, info and shot suggestions", () => {
  const copy = offlineCopy(plan, BRAND, parseInfo("protein_grams=42,calories=520,minutes=20"));
  applyCopy(plan, copy);
  assert.equal(plan.segments[0].caption, "42g protein Grilled Chicken Bowl");
  assert.equal(plan.segments[1].caption, "Grill the chicken");
  assert.equal(plan.segments[2].caption, "Rice · Broccoli · Soy Sauce");
  assert.equal(plan.segments[3].caption, "Save this");
  assert.equal(plan.copy.title, "Grilled Chicken Bowl (42g protein)");
  assert.match(plan.copy.description, /42g protein · 520 kcal/);
});

test("hook formulas needing unknown facts are skipped", () => {
  const copy = offlineCopy(plan, BRAND, {});
  assert.equal(copy.hook, "The Grilled Chicken Bowl I eat every day");
});

test("dishName cleans slugs and honours overrides", () => {
  assert.equal(dishName({ recipe: "salmon-teriyaki-mealprep" }), "Salmon Teriyaki");
  assert.equal(dishName({ recipe: "x" }, { dish: "Custom" }), "Custom");
  assert.deepEqual(parseInfo("a=1,b=two words,c==x"), { a: "1", b: "two words", c: "=x" });
});
