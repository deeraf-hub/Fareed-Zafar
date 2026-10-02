import { readFileSync } from "node:fs";
import { learningCycle, PRIOR_WEIGHTS } from "./learning.js";

const HISTORY = JSON.parse(readFileSync(new URL("../../../data/leadgen-history.json", import.meta.url), "utf8"));

/**
 * Nightly (n8n cron → POST /api/leadgen/learn) or on demand: refit the lead scorer on
 * past campaign history + live outcomes, promote the new weights only if they beat the
 * current ones on held-out data, and keep a log of every cycle for review.
 */
export function runLearningCycle(store, now = new Date()) {
  const live = store.getKV("leadgen:outcomes", []);
  const samples = [...HISTORY.samples, ...live.map(({ x, y }) => ({ x, y }))];
  const current = store.getKV("leadgen:weights", PRIOR_WEIGHTS);
  const result = learningCycle(samples, current);
  const entry = { at: now.toISOString(), promoted: result.promoted, version: result.weights.version, liveSamples: live.length, ...result.report };
  store.tx(() => {
    if (result.promoted) store.setKV("leadgen:weights", { ...result.weights, trainedAt: now.toISOString() });
    const log = store.getKV("leadgen:learning-log", []);
    log.push(entry);
    store.setKV("leadgen:learning-log", log.slice(-50));
  });
  return entry;
}

/** Seed the subject-line bandit with posteriors from past campaigns. */
export function seedLeadgen(store) {
  if (!store.getKV("leadgen:bandit")) store.setKV("leadgen:bandit", HISTORY.bandit);
}
