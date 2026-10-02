import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ProviderError } from "./errors.js";
import { costUsd } from "../tokens.js";

/**
 * Frontier tier: Claude through the official Anthropic SDK.
 *
 * - Model: FRONTIER_MODEL pins one (do that in production and upgrade deliberately,
 *   after `npm run eval`). Unset, the newest model in FRONTIER_MODEL_FAMILY that supports
 *   structured outputs and effort is discovered from the Models API (newest first).
 * - Structured outputs: `output_config.format` from the task's zod schema; the SDK
 *   parses and validates the reply into `parsed_output`.
 * - Effort is set per task (most frontier tasks here are short judgment calls → "low").
 * - The system prompt is marked for prompt caching (stable instructions first).
 * - Server-side refusal fallback ("default") is on, so a safety-classifier decline is
 *   retried on Anthropic's recommended fallback model instead of failing the task.
 * - The SDK retries once; after that the router decides what happens next.
 */
export function anthropicProvider({ model, family = "opus", timeoutMs, apiKey, price, client = new Anthropic({ apiKey, maxRetries: 1, timeout: timeoutMs }) }) {
  let resolved = model || null;
  let lookup = null;
  let lookupFailed = null; // { at, message } — don't hammer the Models API from health checks

  function resolveModel() {
    if (resolved) return Promise.resolve(resolved);
    if (lookupFailed && Date.now() - lookupFailed.at < 60_000) return Promise.reject(new ProviderError(lookupFailed.message));
    lookup ??= discover()
      .then((id) => (resolved = id))
      .catch((err) => {
        lookupFailed = { at: Date.now(), message: err.message };
        throw err instanceof ProviderError ? err : toProviderError(err);
      })
      .finally(() => {
        lookup = null;
      });
    return lookup;
  }

  async function discover() {
    for await (const m of client.models.list()) {
      const caps = m.capabilities ?? {};
      if (m.id.includes(family) && caps.structured_outputs?.supported !== false && caps.effort?.supported !== false) return m.id;
    }
    throw new ProviderError(`No "${family}" model with structured outputs is available to this API key — set FRONTIER_MODEL`);
  }

  return {
    name: "anthropic",
    tier: "frontier",
    get model() {
      return resolved ?? `auto (newest ${family})`;
    },

    async complete({ system, prompt, schema, maxTokens, effort }) {
      const started = Date.now();
      const modelId = await resolveModel();
      let message;
      try {
        message = await client.beta.messages.parse({
          model: modelId,
          max_tokens: maxTokens,
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: prompt }],
          output_config: { effort, format: betaZodOutputFormat(schema) },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        });
      } catch (err) {
        throw toProviderError(err);
      }

      if (message.stop_reason === "refusal") {
        throw new ProviderError(`Declined (${message.stop_details?.category ?? "unspecified"})`, { kind: "refusal" });
      }
      if (message.stop_reason === "max_tokens") {
        throw new ProviderError("Output truncated at max_tokens", { kind: "invalid_output" });
      }

      const usage = message.usage ?? {};
      const tokens = {
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
      };
      return {
        output: message.parsed_output,
        text: JSON.stringify(message.parsed_output),
        model: message.model ?? modelId, // may be the fallback model
        inputTokens: tokens.inputTokens + tokens.cacheReadTokens + tokens.cacheWriteTokens,
        outputTokens: tokens.outputTokens,
        cachedTokens: tokens.cacheReadTokens,
        costUsd: costUsd(tokens, price),
        latencyMs: Date.now() - started,
        estimated: false,
      };
    },

    async health() {
      if (!apiKey) return { ok: false, detail: "ANTHROPIC_API_KEY is not set" };
      try {
        const id = await resolveModel();
        return { ok: true, detail: `${id} via Anthropic API${model ? "" : ` (newest ${family}, discovered at startup — pin it with FRONTIER_MODEL)`}` };
      } catch (err) {
        return { ok: false, detail: err.message };
      }
    },
  };
}

/** Typed SDK errors → router-level error kinds. Most specific class first. */
function toProviderError(err) {
  if (err instanceof Anthropic.APIConnectionError) return new ProviderError(`Connection failed: ${err.message}`);
  if (err instanceof Anthropic.RateLimitError) return new ProviderError("Rate limited (429)", { status: 429 });
  if (err instanceof Anthropic.InternalServerError) return new ProviderError(`Server error ${err.status}`, { status: err.status });
  if (err instanceof Anthropic.APIError) return new ProviderError(`API error ${err.status}: ${err.message}`, { status: err.status });
  // AnthropicError raised by parse() when the reply doesn't satisfy the schema.
  if (err instanceof Anthropic.AnthropicError) return new ProviderError(err.message, { kind: "invalid_output" });
  return new ProviderError(err.message ?? String(err));
}
