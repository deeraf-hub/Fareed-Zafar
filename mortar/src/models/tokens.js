/**
 * Token and cost accounting.
 *
 * Real providers report exact usage; these estimates are used for the simulated
 * provider and for the "naive baseline" — what a send-everything-to-the-LLM design
 * would have spent on the same event — so the savings shown are computed, not claimed.
 */

/** ~4 characters per token for English text. Good enough for budgets and baselines. */
export function estimateTokens(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return Math.ceil(text.length / 4);
}

/**
 * Frontier price in USD per 1M tokens. It is configuration (FRONTIER_USD_PER_MTOK_IN /
 * _OUT), not a per-model table, so switching models never silently breaks cost tracking
 * or the daily budget. The default is a conservative Opus-tier list price; set it to your
 * model's current price. Cache reads bill at 10% of input, 5-minute cache writes at 125%.
 * Local models have no marginal per-token cost.
 */
export const DEFAULT_FRONTIER_PRICE = Object.freeze({ input: 5, output: 25 });

export function costUsd({ inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheWriteTokens = 0 }, price = DEFAULT_FRONTIER_PRICE) {
  return (inputTokens * price.input + outputTokens * price.output + (cacheReadTokens * 0.1 + cacheWriteTokens * 1.25) * price.input) / 1e6;
}

/**
 * The naive design this project argues against:
 *   Trigger → send the customer's whole history + the new event to a frontier model → act.
 * Estimated from what is actually in the store at that moment.
 */
export const NAIVE_SYSTEM_PROMPT_TOKENS = 700;
export const NAIVE_OUTPUT_TOKENS = 350;

export function naiveBaseline({ history = [], party = null, property = null, unit = null, event = null, price = DEFAULT_FRONTIER_PRICE }) {
  const inputTokens =
    NAIVE_SYSTEM_PROMPT_TOKENS + estimateTokens(history) + estimateTokens(party) + estimateTokens(property) + estimateTokens(unit) + estimateTokens(event);
  return {
    inputTokens,
    outputTokens: NAIVE_OUTPUT_TOKENS,
    costUsd: costUsd({ inputTokens, outputTokens: NAIVE_OUTPUT_TOKENS }, price),
  };
}
