// One recipe → many outputs. Runs the planner, copy, exporters (and optionally
// the renderer + QC) for every template in a variant set.
import fs from "node:fs";
import path from "node:path";
import { getTemplate } from "./templates.js";
import { buildPlan, writePlan, planDir } from "./planner.js";
import { offlineCopy, claudeCopy, applyCopy } from "./copy.js";
import { toEDL } from "./exporters/edl.js";
import { toCSV } from "./exporters/csv.js";
import { writeCaptionFiles } from "./exporters/captions.js";
import { renderPlan } from "./exporters/render.js";
import { runQc } from "./qc.js";
import { getPlatform } from "./config.js";

/** plan → plan.json, EDL, CSV, captions (SRT + ASS). */
export function exportPlanFiles(config, brand, plan) {
  const dir = writePlan(config, plan);
  const platform = getPlatform(brand, plan.platform);
  fs.writeFileSync(path.join(dir, `${plan.id}.edl`), toEDL(plan));
  fs.writeFileSync(path.join(dir, "shotlist.csv"), toCSV(plan));
  const caps = writeCaptionFiles(dir, plan, brand, platform);
  if (plan.copy) {
    fs.writeFileSync(
      path.join(dir, "post-copy.md"),
      [`# ${plan.copy.title ?? plan.name}`, "", `**Hook:** ${plan.copy.hook ?? ""}`, `**CTA:** ${plan.copy.cta ?? ""}`, "", plan.copy.description ?? "", "", (plan.copy.hashtags ?? []).join(" "), ""].join("\n"),
    );
  }
  return { dir, edl: path.join(dir, `${plan.id}.edl`), csv: path.join(dir, "shotlist.csv"), ...caps };
}

export async function producePlan({ config, brand, ix, template, recipe, seed, info = {}, mode = "offline", render = false, music = null, scope, log = () => {} }) {
  const plan = buildPlan({ ix, config, brand, template, recipe, seed, scope });
  const copy = mode === "claude" ? await claudeCopy({ config, brand, plan, info }) : offlineCopy(plan, brand, info);
  applyCopy(plan, copy);
  ix.savePlan(plan);
  const files = exportPlanFiles(config, brand, plan);
  const result = { plan, files, render: null, qc: null };
  if (render && plan.segments.length) {
    const platform = getPlatform(brand, plan.platform);
    log(`render ${plan.id} (${plan.segments.length} segments, ${plan.totalSeconds}s)`);
    result.render = await renderPlan({ plan, platform, dir: files.dir, brand, captionsAss: files.ass, music, preset: config.render?.preset, crf: config.render?.crf });
    result.qc = await runQc({ file: result.render.outFile, plan, platform, brand, captionsAss: files.ass });
    fs.writeFileSync(path.join(files.dir, "qc.json"), JSON.stringify(result.qc, null, 2) + "\n");
  }
  return result;
}

export async function produceVariants({ config, brand, ix, set = "default", templates, recipe, seed = 1, info, mode, render, music, log = () => {} }) {
  const ids = templates?.length ? templates : brand.variantSets?.[set];
  if (!ids?.length) throw new Error(`Variant set "${set}" is empty or undefined in the brand kit`);
  const results = [];
  for (const [i, id] of ids.entries()) {
    const template = getTemplate(config, id);
    log(`variant ${i + 1}/${ids.length}: ${template.name}`);
    const r = await producePlan({ config, brand, ix, template, recipe, seed: Number(seed) + i, info, mode, render, music, log });
    results.push(r);
  }
  return results;
}

export function variantsTable(results) {
  const rows = [["template", "platform", "length", "segments", "gaps", "render", "qc"]];
  for (const r of results) {
    rows.push([
      r.plan.template,
      r.plan.platform,
      `${r.plan.totalSeconds}s/${r.plan.targetSeconds}s`,
      String(r.plan.segments.length),
      String(r.plan.gaps.length),
      r.render ? path.basename(r.render.outFile) : "-",
      r.qc ? (r.qc.passed ? "pass" : "FAIL") + ` (${r.qc.checks.filter((c) => c.status === "warn").length} warn)` : "-",
    ]);
  }
  const widths = rows[0].map((_, c) => Math.max(...rows.map((r) => r[c].length)));
  return rows.map((r) => r.map((cell, c) => cell.padEnd(widths[c])).join("  ")).join("\n");
}
