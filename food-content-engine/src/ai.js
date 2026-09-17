// Claude access layer. Every AI call in the engine goes through `structured()`
// so there is exactly one place that knows about models, output schemas,
// refusal handling and cost accounting. Tests inject a fake client with
// `setClientFactory()`; when no credentials exist the engine runs OFFLINE.

import fs from "node:fs";

let clientFactory = null;
const usageLog = [];

/** Test hook: supply a function that returns an Anthropic-compatible client. */
export function setClientFactory(fn) {
  clientFactory = fn;
}

export function hasCredentials() {
  return Boolean(clientFactory || process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

/** "claude" or "offline", honouring config.ai.mode (auto | claude | offline). */
export function resolveMode(config) {
  const wanted = config.ai?.mode ?? "auto";
  if (wanted === "offline") return "offline";
  if (wanted === "claude") {
    if (!hasCredentials()) throw new Error("ai.mode is 'claude' but ANTHROPIC_API_KEY is not set. Set it or use --offline.");
    return "claude";
  }
  return hasCredentials() ? "claude" : "offline";
}

async function getClient() {
  if (clientFactory) return clientFactory();
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  // Vision requests with dozens of frames can take a while; give them room.
  return new Anthropic({ maxRetries: 3, timeout: 10 * 60 * 1000 });
}

export class AiRefusal extends Error {
  constructor(details) {
    super(`Claude declined this request${details?.category ? ` (${details.category})` : ""}${details?.explanation ? `: ${details.explanation}` : ""}`);
    this.details = details;
  }
}

/**
 * One structured-output call. Returns { data, usage, model }.
 * `content` is a user-message content array (text + image blocks).
 */
export async function structured({ config, system, content, schema, maxTokens = 16000, effort, label = "request" }) {
  const client = await getClient();
  const model = config.ai?.model ?? "claude-opus-5";
  const res = await client.beta.messages.create({
    model,
    max_tokens: maxTokens,
    // If a safety classifier declines the request, re-run it server-side on
    // Anthropic's recommended fallback model instead of failing the batch.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema }, effort: effort ?? config.ai?.effort ?? "medium" },
    system,
    messages: [{ role: "user", content }],
  });
  if (res.stop_reason === "refusal") throw new AiRefusal(res.stop_details);
  if (res.stop_reason === "max_tokens") throw new Error(`Claude output was cut off (max_tokens=${maxTokens}) during ${label}; lower ai.maxImagesPerRequest.`);
  const text = (res.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("");
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`Claude returned non-JSON output during ${label}: ${text.slice(0, 200)}`);
  }
  recordUsage(label, res.model ?? model, res.usage);
  return { data, usage: res.usage, model: res.model ?? model };
}

export function imageBlock(filePath) {
  const data = fs.readFileSync(filePath).toString("base64");
  const ext = filePath.toLowerCase().split(".").pop();
  const media_type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return { type: "image", source: { type: "base64", media_type, data } };
}

export function textBlock(text) {
  return { type: "text", text };
}

// ---- cost accounting --------------------------------------------------------

// USD per million tokens (input, output). Used only for the estimate printed
// after a run; the invoice is what counts.
const PRICES = {
  "claude-opus-5": [5, 25],
  "claude-opus-4-8": [5, 25],
  "claude-sonnet-5": [2, 10],
  "claude-haiku-4-5": [1, 5],
  "claude-fable-5-1": [10, 50],
};

function recordUsage(label, model, usage) {
  if (!usage) return;
  usageLog.push({ label, model, input: usage.input_tokens ?? 0, output: usage.output_tokens ?? 0, cacheRead: usage.cache_read_input_tokens ?? 0 });
}

export function usageSummary() {
  const totals = { requests: usageLog.length, input: 0, output: 0, cacheRead: 0, estimatedUsd: 0 };
  for (const u of usageLog) {
    totals.input += u.input;
    totals.output += u.output;
    totals.cacheRead += u.cacheRead;
    const key = Object.keys(PRICES).find((k) => u.model.startsWith(k));
    if (key) {
      const [i, o] = PRICES[key];
      totals.estimatedUsd += (u.input * i + u.output * o) / 1e6 + (u.cacheRead * i * 0.1) / 1e6;
    }
  }
  totals.estimatedUsd = Math.round(totals.estimatedUsd * 10000) / 10000;
  return totals;
}

export function resetUsage() {
  usageLog.length = 0;
}
