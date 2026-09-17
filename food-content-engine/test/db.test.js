import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { openIndex } from "../src/db.js";
import { tmpDir } from "./helpers.js";

function seed() {
  const ix = openIndex(path.join(tmpDir(), "index.sqlite"));
  const id = ix.upsertClip({ path: "/x/a.mp4", rel_path: "a.mp4", filename: "a.mp4", hash: "h", size: 1, mtime: 1, duration: 10, width: 1920, height: 1080, fps: 30, codec: "h264", has_audio: true, source_type: "raw", recipe: "grilled-chicken-bowl", session: "s" });
  const ids = ix.replaceShots(id, [
    { idx: 0, start: 0, end: 3, duration: 3, stage: "cooking", shot_type: "close_up", ingredients: ["chicken"], actions: ["grilling"], description: "Chicken thighs grilling on a cast iron pan", keywords: ["sizzle", "char"], quality: 4 },
    { idx: 1, start: 3, end: 6, duration: 3, stage: "plating", shot_type: "overhead", ingredients: ["rice", "chicken"], actions: ["assembling"], description: "Assembling the bowl", quality: 5, hero_worthy: true },
  ]);
  return { ix, id, ids };
}

test("upsert is idempotent and updates in place", () => {
  const { ix, id } = seed();
  const again = ix.upsertClip({ path: "/x/a.mp4", rel_path: "a.mp4", filename: "a.mp4", hash: "h2", size: 2, mtime: 2, duration: 11, width: 1920, height: 1080, fps: 30, codec: "h264", has_audio: true, source_type: "raw", recipe: "grilled-chicken-bowl", session: "s" });
  assert.equal(again, id);
  assert.equal(ix.listClips().length, 1);
  assert.equal(ix.getClip(id).duration, 11);
  ix.close();
});

test("shots round-trip JSON columns and join clip fields", () => {
  const { ix, ids } = seed();
  const s = ix.getShot(ids[1]);
  assert.deepEqual(s.ingredients, ["rice", "chicken"]);
  assert.equal(s.hero_worthy, true);
  assert.equal(s.clip_recipe, "grilled-chicken-bowl");
  assert.equal(ix.allShots().length, 2);
  ix.close();
});

test("full-text search uses porter stemming and ranks", () => {
  const { ix, ids } = seed();
  const hits = ix.ftsSearch(["sizzling"]); // stems to sizzl → matches keyword "sizzle"
  assert.ok(hits.has(ids[0]));
  assert.ok(!hits.has(ids[1]));
  assert.ok(ix.ftsSearch(["grilled"]).has(ids[1]), "recipe name is searchable on every shot of the session");
  assert.equal(ix.ftsSearch(["nonexistentword"]).size, 0);
  ix.close();
});

test("replaceShots clears old FTS rows; usage tracks plans", () => {
  const { ix, id, ids } = seed();
  ix.savePlan({ id: "p1", name: "n", template: "t", platform: "tiktok", segments: [{ shot_id: ids[0], clip_id: id }] });
  assert.equal(ix.usageCounts().get(ids[0]), 1);
  assert.equal(ix.stats().used.n, 1);
  ix.replaceShots(id, [{ idx: 0, start: 0, end: 10, duration: 10, description: "one long shot", ingredients: [], actions: [], keywords: [] }]);
  assert.equal(ix.ftsSearch(["sizzling"]).size, 0);
  assert.equal(ix.getShots(id).length, 1);
  ix.removeClip(id);
  assert.equal(ix.listClips().length, 0);
  ix.close();
});
