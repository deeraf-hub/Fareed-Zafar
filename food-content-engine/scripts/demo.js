// End-to-end demo on synthetic footage (no API key, no real videos needed):
//   npm run demo
// Creates ./demo/, generates a small library with ffmpeg, indexes it offline,
// searches it, builds every variant for one recipe, renders them, runs QC and
// writes the library report. Takes about a minute.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDemoLibrary } from "./synth.js";
import { main } from "../src/cli.js";

process.removeAllListeners("warning");
process.on("warning", (w) => {
  if (w.name !== "ExperimentalWarning") console.error(w);
});

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "demo");
const step = (title) => console.log(`\n=== ${title} ===`);

if (!fs.existsSync(path.join(root, "fce.config.json"))) {
  step("fce init");
  await main(["init", "--project", root]);
  const cfgFile = path.join(root, "fce.config.json");
  const cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
  cfg.render = { preset: "veryfast", crf: 23 }; // demo speed over quality
  fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2) + "\n");
}
step("generating synthetic footage");
const made = await buildDemoLibrary(path.join(root, "library"));
console.log(`${made.length} clips in ${path.join(root, "library", "01_raw")}`);

const run = (...args) => main([...args, "--project", root]);
step("fce ingest");
await run("ingest");
step("fce analyze --offline");
await run("analyze", "--offline");
step('fce search "chicken recipes with grilling shots"');
await run("search", "chicken recipes with grilling shots", "--limit", "5");
step('fce search "close-up shots of pouring sauce"');
await run("search", "close-up shots of pouring sauce", "--limit", "5");
step("fce variants --recipe grilled-chicken-bowl --render");
await run("variants", "--recipe", "grilled-chicken-bowl", "--info", "protein_grams=42,calories=520,minutes=20,portions=4", "--render", "--offline");
step("fce plan meal-prep for the salmon recipe");
await run("plan", "--template", "meal-prep-batch-40s", "--recipe", "salmon-teriyaki-mealprep", "--render", "--offline");
step("fce broll for the gaps in that plan");
await run("broll", "--plan", "salmon-teriyaki-mealprep__meal-prep-batch-40s__s1", "--need", "extreme close-up of teriyaki glaze bubbling", "--offline");
step("fce unused");
await run("unused");
step("fce report");
await run("report");
step("fce status");
await run("status");
console.log(`\nDemo outputs: ${path.join(root, "output")}`);
