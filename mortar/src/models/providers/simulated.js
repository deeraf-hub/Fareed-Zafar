import { costUsd, estimateTokens } from "../tokens.js";

/**
 * Offline stand-in for a model tier, so the whole system runs with no GPU and no API
 * key (demo, CI, evals). Each task supplies its own `simulate(input)` heuristic,
 * kept next to the real prompt so the difference is obvious. Every result is
 * flagged `estimated: true` and the console labels the tier "simulated".
 */
export function simulatedProvider({ tier, model = `${tier}-sim`, price }) {
  return {
    name: "simulated",
    tier,
    model,
    simulated: true,

    async complete({ task, input, system, prompt }) {
      const output = task.simulate(input, { tier });
      const text = JSON.stringify(output);
      const inputTokens = estimateTokens(system) + estimateTokens(prompt);
      const outputTokens = estimateTokens(text);
      return {
        output,
        text,
        model,
        inputTokens,
        outputTokens,
        cachedTokens: 0,
        costUsd: tier === "frontier" ? costUsd({ inputTokens, outputTokens }, price) : 0,
        latencyMs: 0,
        estimated: true,
      };
    },

    async health() {
      return { ok: true, detail: `simulated ${tier} model (set ${tier === "local" ? "LOCAL_MODEL_PROVIDER" : "FRONTIER_PROVIDER"} for a real one)` };
    },
  };
}
