// `fce` command-line interface.
import fs from "node:fs";
import path from "node:path";
import { loadConfig, ensureDirs, loadBrandKit, initProject, getPlatform, CONFIG_FILENAME } from "./config.js";
import { openIndex } from "./db.js";
import { ffmpegAvailable } from "./ffmpeg.js";
import { ingest } from "./ingest.js";
import { analyzeAll } from "./analyze.js";
import { resolveMode, usageSummary, hasCredentials } from "./ai.js";
import { parseQuery, searchShots, unusedFootage } from "./search.js";
import { loadTemplates, getTemplate } from "./templates.js";
import { summarizePlan } from "./planner.js";
import { parseInfo } from "./copy.js";
import { producePlan, produceVariants, variantsTable, exportPlanFiles } from "./variants.js";
import { renderPlan } from "./exporters/render.js";
import { runQc, formatQc } from "./qc.js";
import { libraryReport } from "./report.js";
import { needsFromPlan, pickReference, offlinePrompts, claudePrompts, writePromptSheet } from "./broll.js";

export function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, inline] = a.slice(2).split(/=(.*)/s);
      const key = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (inline != null) args.flags[key] = inline;
      else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) args.flags[key] = argv[++i];
      else args.flags[key] = true;
    } else args._.push(a);
  }
  return args;
}

const HELP = `fce — Food Content Engine

Usage: fce <command> [options]

Setup
  init [--library <dir>]             create ${CONFIG_FILENAME} + library folder skeleton here
  status                             show config, ffmpeg, AI mode and index totals

Index
  ingest [--force] [--prune]         scan the library, read metadata, register clips
  analyze [--offline] [--force] [--limit N] [--concurrency N]
                                     split clips into shots, extract keyframes, tag (Claude or naming convention)

Find
  search "<query>" [--limit N] [--unused] [--strict] [--recipe <slug>] [--json]
  unused [--min-quality N] [--recipe <slug>]
  report [--out <file.md>]           library health, coverage per recipe, what to film next

Make
  templates                          list edit templates
  plan --template <id> [--recipe <slug>] [--seed N] [--scope recipe|library] [--info k=v,...] [--render] [--music <file>] [--offline]
  variants [--set default] [--templates a,b,c] --recipe <slug> [--seed N] [--info ...] [--render] [--music <file>] [--offline]
  export <plan-id>                   re-write EDL / CSV / captions from output/<plan-id>/plan.json
  render <plan-id> [--music <file>] [--no-exec]
  qc <plan-id>
  broll [--plan <plan-id>] [--need "<text>" ...] [--offline]

Options common to most commands: --project <dir>
`;

function log(msg) {
  process.stdout.write(msg + "\n");
}

function openProject(flags) {
  const config = loadConfig({ project: flags.project });
  if (!config.configFile) throw new Error(`No ${CONFIG_FILENAME} found. Run "fce init" in your project folder first.`);
  if (flags.offline) config.ai.mode = "offline";
  if (flags.model) config.ai.model = flags.model;
  ensureDirs(config);
  const brand = loadBrandKit(config);
  const ix = openIndex(config.dbPath);
  return { config, brand, ix };
}

function loadPlanFile(config, planId) {
  const file = path.join(config.outputDir, planId, "plan.json");
  if (!fs.existsSync(file)) throw new Error(`No plan at ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function printUsage() {
  const u = usageSummary();
  if (u.requests) log(`claude usage: ${u.requests} requests, ${u.input} in / ${u.output} out tokens, ≈ $${u.estimatedUsd.toFixed(3)}`);
}

export async function main(argv = process.argv.slice(2)) {
  const { _, flags } = parseArgs(argv);
  const cmd = _[0];
  if (!cmd || cmd === "help" || flags.help) {
    log(HELP);
    return 0;
  }

  if (cmd === "init") {
    const root = path.resolve(flags.project ?? process.cwd());
    const { file, config } = initProject(root, { library: flags.library });
    log(`created ${file}`);
    log(`library skeleton at ${path.resolve(root, config.library)}`);
    log("next: drop footage into library/01_raw/<YYYY-MM-DD>_<recipe-slug>/ then run: fce ingest && fce analyze");
    return 0;
  }

  const { config, brand, ix } = openProject(flags);
  try {
    switch (cmd) {
      case "status": {
        const ff = await ffmpegAvailable();
        const st = ix.stats();
        log(`project     ${config.root}`);
        log(`library     ${config.library}`);
        log(`index       ${config.dbPath}`);
        log(`brand kit   ${config.brandKit} (${brand.brand?.name})`);
        log(`templates   ${[...loadTemplates(config).keys()].join(", ")}`);
        log(`ffmpeg      ${ff.ok ? ff.ffmpeg : "NOT FOUND — " + ff.error}`);
        log(`ai mode     ${resolveMode({ ...config, ai: { ...config.ai, mode: config.ai.mode === "claude" && !hasCredentials() ? "auto" : config.ai.mode } })} (model ${config.ai.model}${hasCredentials() ? "" : ", no ANTHROPIC_API_KEY"})`);
        log(`clips       ${st.clips.n} (${Math.round(st.clips.seconds / 60)} min) — ${st.byStatus.map((r) => `${r.status}: ${r.n}`).join(", ") || "none"}`);
        log(`shots       ${st.shots.n}, ${st.shots.dead ?? 0} dead, ${st.shots.hero ?? 0} hero, ${st.shots.hook ?? 0} hook; ${st.used.n} used in ${st.plans.n} plans`);
        return 0;
      }
      case "ingest": {
        const s = await ingest(config, ix, { force: Boolean(flags.force), prune: Boolean(flags.prune), dryRun: Boolean(flags.dryRun), log });
        log(`ingest: ${s.added} added, ${s.updated} updated, ${s.unchanged} unchanged, ${s.failed} failed, ${s.pruned} pruned`);
        for (const d of s.duplicates) log(`  duplicate: ${d.file} == ${d.duplicateOf}`);
        for (const e of s.errors) log(`  error: ${e.file}: ${e.error}`);
        return s.failed ? 1 : 0;
      }
      case "analyze": {
        const mode = resolveMode(config);
        log(`analyze mode: ${mode}${mode === "offline" ? " (tags from the naming convention only; set ANTHROPIC_API_KEY for vision tagging)" : ` (${config.ai.model})`}`);
        const s = await analyzeAll(config, ix, brand, { force: Boolean(flags.force), limit: flags.limit ? Number(flags.limit) : undefined, mode, concurrency: flags.concurrency ? Number(flags.concurrency) : 2, log });
        log(`analyze: ${s.analyzed} clips → ${s.shots} shots (${s.dead} dead), ${s.failed} failed`);
        for (const e of s.errors) log(`  error: ${e.file}: ${e.error}`);
        printUsage();
        return s.failed ? 1 : 0;
      }
      case "search": {
        const query = _.slice(1).join(" ");
        if (!query) throw new Error('search needs a query, e.g. fce search "close-up shots of pouring sauce"');
        const mode = resolveMode(config);
        const { filter } = await parseQuery(query, { config, mode });
        const results = searchShots(ix, filter, { limit: flags.limit ? Number(flags.limit) : 30, unusedOnly: Boolean(flags.unused), strict: Boolean(flags.strict), recipe: flags.recipe });
        if (flags.json) {
          log(JSON.stringify({ query, filter, results }, null, 2));
          return 0;
        }
        log(`filter: ${JSON.stringify(Object.fromEntries(Object.entries(filter).filter(([, v]) => v != null && v !== false && !(Array.isArray(v) && !v.length))))}`);
        log(`${results.length} shots`);
        for (const r of results) {
          log(`  #${String(r.id).padStart(4)} ${String(r.score).padStart(6)}  ${r.matched}/${r.facets}  ${r.in ?? r.start}s-${r.end}s ${String(r.duration.toFixed(1)).padStart(5)}s  ${(r.stage ?? "-").padEnd(11)} ${(r.shot_type ?? "-").padEnd(9)} ${r.clip_filename}`);
          log(`        ${r.description ?? ""}${r.used ? `  [used ${r.used}x]` : ""}`);
        }
        printUsage();
        return 0;
      }
      case "unused": {
        const rows = unusedFootage(ix, { minQuality: flags.minQuality ? Number(flags.minQuality) : 3, recipe: flags.recipe });
        log(`recipe                          unused shots   seconds   hero  hook  clips`);
        for (const r of rows) log(`${r.recipe.padEnd(32)} ${String(r.shots).padStart(12)}   ${String(r.seconds).padStart(7)}   ${String(r.hero).padStart(4)}  ${String(r.hook).padStart(4)}  ${String(r.clips).padStart(5)}`);
        if (!rows.length) log("everything usable has been placed in at least one plan");
        return 0;
      }
      case "report": {
        const { markdown } = libraryReport(ix, brand);
        const out = flags.out ? path.resolve(flags.out) : path.join(config.outputDir, "library-report.md");
        fs.writeFileSync(out, markdown);
        log(markdown);
        log(`written to ${out}`);
        return 0;
      }
      case "templates": {
        for (const t of loadTemplates(config).values()) log(`${t.id.padEnd(26)} ${t.platform.padEnd(15)} ${String(t.targetSeconds).padStart(3)}s  ${t.slots.length} slots  ${t.description ?? ""}`);
        return 0;
      }
      case "plan": {
        if (!flags.template) throw new Error("plan needs --template <id> (see: fce templates)");
        const template = getTemplate(config, flags.template);
        const mode = resolveMode(config);
        const r = await producePlan({ config, brand, ix, template, recipe: flags.recipe ?? null, seed: flags.seed ? Number(flags.seed) : 1, info: parseInfo(flags.info), mode, render: Boolean(flags.render), music: flags.music, scope: flags.scope, log });
        log(summarizePlan(r.plan));
        log(`files: ${r.files.dir}`);
        if (r.qc) log(formatQc(r.qc));
        printUsage();
        return 0;
      }
      case "variants": {
        const mode = resolveMode(config);
        const results = await produceVariants({ config, brand, ix, set: flags.set ?? "default", templates: flags.templates ? String(flags.templates).split(",") : null, recipe: flags.recipe ?? null, seed: flags.seed ? Number(flags.seed) : 1, info: parseInfo(flags.info), mode, render: Boolean(flags.render), music: flags.music, log });
        log(variantsTable(results));
        log(`outputs in ${config.outputDir}`);
        printUsage();
        return 0;
      }
      case "export": {
        const plan = loadPlanFile(config, _[1]);
        const files = exportPlanFiles(config, brand, plan);
        log(`exported ${files.edl}, ${files.csv}, ${files.srt}, ${files.ass}`);
        return 0;
      }
      case "render": {
        const plan = loadPlanFile(config, _[1]);
        const platform = getPlatform(brand, plan.platform);
        const dir = path.join(config.outputDir, plan.id);
        const ass = path.join(dir, "captions.ass");
        const r = await renderPlan({ plan, platform, dir, brand, captionsAss: fs.existsSync(ass) ? ass : null, music: flags.music, execute: !flags.noExec, preset: config.render?.preset, crf: config.render?.crf });
        log(r.rendered ? `rendered ${r.outFile} in ${(r.ms / 1000).toFixed(1)}s` : `wrote ${r.script} (not executed)`);
        return 0;
      }
      case "qc": {
        const plan = loadPlanFile(config, _[1]);
        const platform = getPlatform(brand, plan.platform);
        const dir = path.join(config.outputDir, plan.id);
        const result = await runQc({ file: path.join(dir, `${plan.id}.mp4`), plan, platform, brand, captionsAss: path.join(dir, "captions.ass") });
        fs.writeFileSync(path.join(dir, "qc.json"), JSON.stringify(result, null, 2) + "\n");
        log(formatQc(result));
        return result.passed ? 0 : 1;
      }
      case "broll": {
        const mode = resolveMode(config);
        let needs = [];
        let plan = null;
        if (flags.plan) {
          plan = loadPlanFile(config, flags.plan);
          needs = needsFromPlan(plan);
        }
        const extra = [].concat(flags.need ?? []).filter((x) => x !== true);
        for (const n of extra) needs.push({ need: String(n), seconds: 4 });
        if (!needs.length) throw new Error("nothing to request: pass --plan <id> (uses its gaps) and/or --need \"close-up of steam rising off rice\"");
        const reference = pickReference(ix, { stage: plan?.gaps?.[0]?.prefer?.stages?.[0], recipe: plan?.recipe });
        const requests = mode === "claude" ? await claudePrompts({ config, brand, needs, reference }) : offlinePrompts(needs, brand);
        const out = writePromptSheet(path.join(config.outputDir, "broll"), { requests, reference, brand, needs });
        log(`${requests.length} B-roll request(s) → ${out.md}`);
        printUsage();
        return 0;
      }
      default:
        log(`unknown command "${cmd}"\n`);
        log(HELP);
        return 2;
    }
  } finally {
    ix.close();
  }
}
