/**
 * Terminal walkthrough: plays a demo story through the real pipeline and prints what
 * Mortar decided at every step — no browser, no API keys.
 *
 *   npm run demo:cli                    the 11:30 PM leak
 *   npm run demo:cli -- leadgen         leak | sensitive | leasing | leadgen
 *   npm run demo:cli -- leak --all      also print the dimmed system events (action results)
 */
import { loadConfig } from "../src/config.js";
import { createApp } from "../src/app.js";
import { simulatedClock, formatDayTime } from "../src/core/clock.js";
import { openStore } from "../src/core/store.js";
import { silentLogger } from "../src/core/logger.js";
import { seed } from "../src/demo/seed.js";
import { STORIES, storyById } from "../src/demo/stories.js";
import { kpis } from "../src/http/snapshot.js";

const args = process.argv.slice(2);
const story = storyById(args.find((a) => !a.startsWith("--")) ?? "leak");
if (!story) {
  console.error(`Unknown story. Pick one of: ${STORIES.map((s) => s.id).join(", ")}`);
  process.exit(1);
}
const showAll = args.includes("--all");

const tty = process.stdout.isTTY;
const paint = (code) => (text) => (tty ? `\x1b[${code}m${text}\x1b[0m` : String(text));
const [bold, dim, cyan, violet, amber, green] = [paint(1), paint(2), paint(36), paint(35), paint(33), paint(32)];

const config = { ...loadConfig(["--demo"]), dbPath: ":memory:" };
const clock = simulatedClock(story.start);
const store = openStore(":memory:");
seed(store, clock.now());
const app = createApp({ config, clock, store, log: silentLogger });
const tz = config.timezone;

console.log(`\n${bold(`MORTAR · ${story.title}`)}  ${dim(`(${story.steps.length} steps · simulated systems and models)`)}\n`);

const printed = new Set();
for (const [i, step] of story.steps.entries()) {
  console.log(`${bold(cyan(`▶ ${i + 1}/${story.steps.length}  ${step.title}`))}`);
  console.log(`  ${dim(step.say)}`);
  await step.run(app);
  await app.settle();

  const fresh = store
    .listEvents({ limit: 500 })
    .filter((e) => e.trace && !printed.has(e.id))
    .reverse();
  for (const e of fresh) {
    printed.add(e.id);
    const t = e.trace;
    const system = t.type.startsWith("action.");
    if (system && !showAll) continue;
    const s = (key) => t.stages.find((x) => x.key === key);
    const model = s("model");
    const tokens = t.model.inputTokens + t.model.outputTokens;
    console.log(`\n  ${dim(formatDayTime(new Date(t.at), tz))}  ${bold(t.headline ?? s("event")?.summary)}${t.caseId ? dim(`  ${t.caseId}`) : ""}`);
    if (system) continue;
    const row = (label, value, color = (x) => x) => value && value !== "—" && console.log(`    ${dim(label.padEnd(10))} ${color(value)}`);
    row("logic", s("logic")?.summary);
    row("model", model?.summary, model?.status === "frontier" ? violet : model?.status === "local" ? cyan : dim);
    row("action", s("action")?.summary);
    row("checks", s("validation")?.summary, /approval|block/.test(s("validation")?.summary ?? "") ? amber : (x) => x);
    row("next", s("next")?.summary);
    row("cost", `${tokens} model tokens · naive design ${t.baseline ? t.baseline.inputTokens + t.baseline.outputTokens : 0} · ${t.durationMs} ms`, dim);
  }
  console.log("");
}

const k = kpis(app);
console.log(bold("Totals"));
console.log(`  ${green(`${k.decidedByRulesPct}%`)} of ${k.decisionPoints} decision points decided by rules alone`);
console.log(`  model calls: ${k.modelCalls.local} local · ${k.modelCalls.frontier} frontier   (naive design: ${k.naiveCalls} frontier calls)`);
console.log(`  tokens: ${k.tokens.used.toLocaleString("en-US")} vs ${k.tokens.naive.toLocaleString("en-US")} naive  ${green(`−${k.tokens.savedPct}%`)}`);
console.log(`  outbox: ${Object.entries(k.outbox).map(([status, n]) => `${n} ${status}`).join(" · ")}   approvals waiting: ${k.pendingApprovals}\n`);
app.stop();
