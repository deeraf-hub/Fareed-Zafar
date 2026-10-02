/**
 * Mortar evals — does the agent decide correctly, and what does it cost to decide?
 *
 *   npm run eval                                   rules + the model tiers your .env configures
 *   npm run eval -- --suite triage                 one suite (triage | holdout | replies)
 *   npm run eval -- --json                         machine-readable output (CI)
 *   LOCAL_MODEL_PROVIDER=ollama npm run eval       measure a real local model on the same set
 *
 * The harness calls the production decision functions (assessMessage, resolveSeverity,
 * decideVendor, decideNeighbor, decideResident, …) and the real model router, so it
 * scores exactly what the running system would do — not a re-implementation.
 *
 * Gates (exit code 1 when broken, so CI can block a rule or model change):
 *   - emergency recall is 100% on the development set: every P1 is treated as P1
 *   - zero unsafe misses: no reply that still needs action is read as "all clear"
 * The holdout set is report-only: it was never used to tune the rules, so it estimates
 * how they generalize. Gating on it would just turn it into a second development set.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { loadConfig } from "../src/config.js";
import { createApp } from "../src/app.js";
import { openStore } from "../src/core/store.js";
import { simulatedClock } from "../src/core/clock.js";
import { silentLogger } from "../src/core/logger.js";
import { naiveBaseline } from "../src/models/tokens.js";
import { assessMessage, needsTriageModel } from "../src/playbooks/maintenance/rules.js";
import { resolveSeverity } from "../src/playbooks/maintenance/intake.js";
import { decideVendor, decideNeighbor, decideResident } from "../src/playbooks/maintenance/decide.js";
import { resolveVendorStatus } from "../src/playbooks/maintenance/dispatch.js";
import { neighborFinding, residentReplyRoute } from "../src/playbooks/maintenance/follow-through.js";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => args[args.indexOf(`--${name}`) + 1];
const suites = flag("suite") ? [option("suite")] : ["triage", "holdout", "replies"];
const json = flag("json");

const load = (name) => JSON.parse(readFileSync(new URL(`./datasets/${name}.json`, import.meta.url), "utf8")).cases;

// A real router with whatever tiers are configured, writing to a throwaway ledger.
const config = { ...loadConfig(["--demo"]), dbPath: ":memory:" };
const app = createApp({ config, store: openStore(":memory:"), clock: simulatedClock("2026-10-08T04:30:00Z"), log: silentLogger });
const status = await app.router.status();
const run = async (need) => {
  const res = await app.router.run(need.task, need.input);
  return { res, tokens: (res.inputTokens ?? 0) + (res.outputTokens ?? 0), costUsd: res.costUsd ?? 0, tier: res.ok ? res.tier : "fallback" };
};

const HOME = { type: "stacked building", floor: 2, unit_above: "yes" };
const CASE_SUMMARY = "P1 Water leak — Maple Court 2B · vendor on site · unit above (3B) asked to check for leaks";
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 100);
const naiveTokens = (text) => {
  const b = naiveBaseline({ event: { text } });
  return { tokens: b.inputTokens + b.outputTokens, costUsd: b.costUsd };
};

// ── Suite 1: maintenance triage ──────────────────────────────────────────────

const RANK = { non_maintenance: 0, P3: 1, P2: 2, P1: 3 };

async function triageSuite(dataset, { gated }) {
  const rows = [];
  for (const c of load(dataset)) {
    const a = assessMessage(c.text, { outsideTempF: c.weatherF ?? null });
    const model = needsTriageModel(a) ? await run({ task: "maintenance.triage", input: { text: c.text, home: HOME } }) : null;
    const r = resolveSeverity(a, model?.res);
    const predicted = r.nonMaintenance ? "non_maintenance" : r.severity;
    rows.push({ id: c.id, text: c.text, expected: c.expected, predicted, by: model ? model.tier : "rules", rule: a.rulesFired.find((x) => !x.match(/^[a-z]+[A-Z]/)) ?? null, tokens: model?.tokens ?? 0, costUsd: model?.costUsd ?? 0, naive: naiveTokens(c.text) });
  }

  const p1 = rows.filter((r) => r.expected === "P1");
  const predictedP1 = rows.filter((r) => r.predicted === "P1");
  const metrics = {
    cases: rows.length,
    emergencyRecall: { hit: p1.filter((r) => r.predicted === "P1").length, of: p1.length },
    emergencyPrecision: { hit: predictedP1.filter((r) => r.expected === "P1").length, of: predictedP1.length },
    accuracy: { hit: rows.filter((r) => r.predicted === r.expected).length, of: rows.length },
    underTriage: rows.filter((r) => RANK[r.predicted] < RANK[r.expected]).length,
    overTriage: rows.filter((r) => RANK[r.predicted] > RANK[r.expected]).length,
    decidedByRules: { hit: rows.filter((r) => r.by === "rules").length, of: rows.length },
    tokens: { used: sum(rows, "tokens"), naive: rows.reduce((n, r) => n + r.naive.tokens, 0) },
    costUsd: { used: sum(rows, "costUsd"), naive: rows.reduce((n, r) => n + r.naive.costUsd, 0) },
  };
  const gates = [{ name: "emergency recall is 100%", ok: metrics.emergencyRecall.hit === metrics.emergencyRecall.of, reportOnly: !gated }];
  const name = gated ? "Maintenance triage — development set" : "Maintenance triage — holdout (never tuned on, report only)";
  return { name, rows, metrics, gates, misses: rows.filter((r) => r.predicted !== r.expected) };
}

// ── Suite 2: replies inside an open case ─────────────────────────────────────

const UNSAFE = {
  vendor: (e, p) => (e === "declined" && p !== "declined") || (e === "mitigated" && p === "completed"),
  neighbor: (e, p) => ["leak_found", "possible_leak"].includes(e) && p === "no_leak",
  resident: (e, p) => ["still_leaking", "forward"].includes(e) && ["stopped", "thanks", "log"].includes(p),
};

async function readReply(c) {
  if (c.kind === "vendor") {
    const keypad = Boolean(c.digits);
    const d = decideVendor({
      event: { type: keypad ? "call.gather" : "message.received", payload: keypad ? { digits: c.digits } : { text: c.text } },
      sender: { name: "Hill Country Plumbing" },
      case: { facts: { category: "water_leak" } },
      unit: { label: "2B" },
      property: { address: "4100 Maple Ave" },
    });
    const model = d.needs.length ? await run(d.needs[0]) : null;
    return { predicted: resolveVendorStatus(d.parsed, model?.res.ok ? model.res.output : null) ?? "unreadable", model };
  }
  if (c.kind === "neighbor") {
    const d = decideNeighbor({ event: { payload: { text: c.text } }, case: { summary: CASE_SUMMARY } });
    const model = d.needs?.length ? await run(d.needs[0]) : null;
    return { predicted: neighborFinding(d.finding, model?.res.ok ? model.res.output : null), model };
  }
  const d = decideResident({ event: { payload: { text: c.text } }, isNew: false, case: { priority: "P1", facts: { checkin: { asked: true } }, summary: CASE_SUMMARY } });
  if (d.kind === "pleasantry") return { predicted: "thanks", model: null };
  if (d.kind === "checkin_reply") return { predicted: d.answer, model: null };
  if (["wants_human", "new_problem", "severity_increase"].includes(d.kind)) return { predicted: "forward", model: null };
  const model = await run(d.needs[0]);
  return { predicted: residentReplyRoute(model.res.ok ? model.res.output : null), model };
}

async function repliesSuite() {
  const rows = [];
  for (const c of load("replies")) {
    const { predicted, model } = await readReply(c);
    rows.push({ id: c.id, kind: c.kind, text: c.text ?? `keypad ${c.digits}`, expected: c.expected, predicted, by: model ? model.tier : "rules", unsafe: UNSAFE[c.kind](c.expected, predicted), tokens: model?.tokens ?? 0, costUsd: model?.costUsd ?? 0, naive: naiveTokens(c.text ?? c.digits) });
  }
  const byKind = Object.fromEntries(
    ["vendor", "neighbor", "resident"].map((k) => {
      const of = rows.filter((r) => r.kind === k);
      return [k, { hit: of.filter((r) => r.predicted === r.expected).length, of: of.length }];
    })
  );
  const metrics = {
    cases: rows.length,
    accuracy: { hit: rows.filter((r) => r.predicted === r.expected).length, of: rows.length },
    byKind,
    unsafeMisses: rows.filter((r) => r.unsafe).length,
    decidedByRules: { hit: rows.filter((r) => r.by === "rules").length, of: rows.length },
    tokens: { used: sum(rows, "tokens"), naive: rows.reduce((n, r) => n + r.naive.tokens, 0) },
    costUsd: { used: sum(rows, "costUsd"), naive: rows.reduce((n, r) => n + r.naive.costUsd, 0) },
  };
  const gates = [{ name: "zero unsafe misses", ok: metrics.unsafeMisses === 0 }];
  return { name: "Replies in an open case", rows, metrics, gates, misses: rows.filter((r) => r.predicted !== r.expected) };
}

function sum(rows, key) {
  return rows.reduce((n, r) => n + r[key], 0);
}

// ── Report ───────────────────────────────────────────────────────────────────

const results = [];
const SUITES = {
  triage: () => triageSuite("triage", { gated: true }),
  holdout: () => triageSuite("triage-holdout", { gated: false }),
  replies: () => repliesSuite(),
};
for (const s of suites) {
  if (!SUITES[s]) throw new Error(`unknown suite "${s}" (triage | holdout | replies)`);
  results.push(await SUITES[s]());
}
const tiers = { local: describeTier(status.local), frontier: describeTier(status.frontier) };
const passed = results.every((r) => r.gates.every((g) => g.ok || g.reportOnly));

mkdirSync(new URL("./results/", import.meta.url), { recursive: true });
writeFileSync(new URL("./results/latest.json", import.meta.url), JSON.stringify({ at: new Date().toISOString(), tiers, passed, results }, null, 2));

if (json) {
  console.log(JSON.stringify({ tiers, passed, results: results.map(({ rows, ...r }) => r) }, null, 2));
} else {
  const simulated = status.local.simulated || status.frontier.simulated;
  console.log(`\nMortar evals · local model: ${tiers.local} · frontier model: ${tiers.frontier}`);
  if (simulated) console.log("(simulated tiers are heuristic stand-ins; rule-decided results are exact. Set LOCAL_MODEL_PROVIDER / ANTHROPIC_API_KEY to measure real models.)");
  for (const r of results) printSuite(r);
  console.log(`\n${passed ? "✓ all gates passed" : "✗ a gate failed"} · full results: evals/results/latest.json\n`);
}
app.stop();
process.exit(passed ? 0 : 1);

function describeTier(t) {
  if (!t.available) return `off (${t.detail})`;
  return t.simulated ? "simulated" : `${t.provider} · ${t.model}`;
}

function printSuite(r) {
  const m = r.metrics;
  const ratio = (x) => `${String(`${x.hit}/${x.of}`).padStart(7)}  ${String(pct(x.hit, x.of)).padStart(5)}%`;
  const line = (label, value) => console.log(`  ${label.padEnd(30)}${value}`);
  console.log(`\n${r.name} — ${m.cases} cases`);
  if (m.emergencyRecall) line("Emergency recall (P1 caught)", ratio(m.emergencyRecall));
  if (m.emergencyPrecision) line("Emergency precision", ratio(m.emergencyPrecision));
  line("Exact accuracy", ratio(m.accuracy));
  if (m.byKind) for (const [k, v] of Object.entries(m.byKind)) line(`  ${k}`, ratio(v));
  if (m.underTriage !== undefined) line("Under-triage (dangerous)", String(m.underTriage).padStart(7));
  if (m.overTriage !== undefined) line("Over-triage (costly)", String(m.overTriage).padStart(7));
  if (m.unsafeMisses !== undefined) line("Unsafe misses", String(m.unsafeMisses).padStart(7));
  line("Decided by rules alone", ratio(m.decidedByRules));
  line("Model tokens", `${m.tokens.used.toLocaleString("en-US").padStart(7)}  vs ${m.tokens.naive.toLocaleString("en-US")} naive (−${pct(m.tokens.naive - m.tokens.used, m.tokens.naive)}%)`);
  line("Model spend", `${("$" + m.costUsd.used.toFixed(4)).padStart(7)}  vs $${m.costUsd.naive.toFixed(4)} naive`);
  for (const g of r.gates) line(`${g.reportOnly ? "Check" : "Gate"}: ${g.name}`, g.ok ? "      ✓" : g.reportOnly ? "      ✗ (report only)" : "      ✗ FAILED");
  if (r.misses.length) {
    console.log("  Misses:");
    for (const x of r.misses) console.log(`    ${x.id}  expected ${x.expected}, got ${x.predicted}${x.unsafe ? " (UNSAFE)" : ""} · by ${x.by}${x.rule ? ` (${x.rule})` : ""} · “${x.text.length > 70 ? `${x.text.slice(0, 70)}…` : x.text}”`);
  }
}
