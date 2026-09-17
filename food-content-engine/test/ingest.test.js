import test from "node:test";
import assert from "node:assert/strict";
import { parseNaming, slugify } from "../src/ingest.js";

test("parseNaming: full convention", () => {
  const n = parseNaming("01_raw/2026-09-10_grilled-chicken-bowl/20260910_grilled-chicken-bowl_cooking_chicken-grilling_closeup_t02.mp4");
  assert.equal(n.source_type, "raw");
  assert.equal(n.recipe, "grilled-chicken-bowl");
  assert.equal(n.session, "2026-09-10_grilled-chicken-bowl");
  assert.equal(n.date, "2026-09-10");
  assert.equal(n.stage, "cooking");
  assert.equal(n.subject, "chicken-grilling");
  assert.equal(n.shot, "closeup");
  assert.equal(n.take, "t02");
  assert.equal(n.ai_generated, false);
});

test("parseNaming: edited exports, AI assets and unconventional names degrade gracefully", () => {
  assert.equal(parseNaming("03_edited/tiktok/grilled-chicken-bowl_v1.mp4").source_type, "edited");
  assert.equal(parseNaming("03_edited/tiktok/grilled-chicken-bowl_v1.mp4").recipe, "grilled-chicken-bowl");
  const ai = parseNaming("04_assets/ai-broll/steam-rising.mp4");
  assert.equal(ai.source_type, "asset");
  assert.equal(ai.ai_generated, true);
  const raw = parseNaming("Random Folder/IMG_0001.MOV");
  assert.equal(raw.recipe, "random-folder");
  assert.equal(raw.stage, null);
});

test("slugify", () => {
  assert.equal(slugify("Grilled Chicken Bowl (v2)!"), "grilled-chicken-bowl-v2");
});
