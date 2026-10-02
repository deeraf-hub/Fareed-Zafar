import { fetchJson, ProviderError } from "./errors.js";

/**
 * Any OpenAI-compatible /v1/chat/completions server: vLLM, llama.cpp `llama-server`,
 * LM Studio, or a hosted open-model endpoint. JSON-schema-constrained output via
 * `response_format: { type: "json_schema" }`, which all three servers support.
 * OPENAI_COMPAT_MODEL picks the model; unset, the first one the server lists is used.
 */
export function openAICompatibleProvider({ url, model, apiKey, timeoutMs, tier = "local" }) {
  const base = url.replace(/\/$/, "");
  const headers = { "content-type": "application/json" };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  let resolved = model || null;

  async function listed() {
    const models = await fetchJson(`${base}/v1/models`, { method: "GET", headers, timeoutMs: 3000 });
    return (models.data ?? []).map((m) => m.id);
  }

  async function resolveModel() {
    if (resolved) return resolved;
    const [first] = await listed();
    if (!first) throw new ProviderError(`${new URL(url).host} lists no models`);
    return (resolved = first);
  }

  return {
    name: "openai-compatible",
    tier,
    get model() {
      return resolved ?? "auto (first listed)";
    },

    async complete({ system, prompt, jsonSchema, maxTokens, task }) {
      const started = Date.now();
      const modelId = await resolveModel();
      const body = await fetchJson(`${base}/v1/chat/completions`, {
        method: "POST",
        headers,
        timeoutMs,
        body: JSON.stringify({
          model: modelId,
          temperature: 0,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: task.name.replace(/[^a-zA-Z0-9_-]/g, "_"), schema: jsonSchema, strict: true },
          },
        }),
      });
      const text = body.choices?.[0]?.message?.content ?? "";
      if (!text) throw new ProviderError("Empty completion", { kind: "invalid_output" });
      return {
        text,
        model: body.model ?? modelId,
        inputTokens: body.usage?.prompt_tokens ?? 0,
        outputTokens: body.usage?.completion_tokens ?? 0,
        cachedTokens: body.usage?.prompt_tokens_details?.cached_tokens ?? 0,
        costUsd: 0,
        latencyMs: Date.now() - started,
        estimated: false,
      };
    },

    async health() {
      let ids;
      try {
        ids = await listed();
      } catch (err) {
        return { ok: false, detail: `Not reachable at ${url}: ${err.message}` };
      }
      if (!model) {
        if (!ids.length) return { ok: false, detail: `${new URL(url).host} lists no models` };
        resolved ??= ids[0];
        return { ok: true, detail: `${resolved} via ${new URL(url).host} (first listed — pin it with OPENAI_COMPAT_MODEL)` };
      }
      return ids.includes(model)
        ? { ok: true, detail: `${model} via ${new URL(url).host}` }
        : { ok: false, detail: `Server reachable; model "${model}" not listed (${ids.slice(0, 3).join(", ")})` };
    },
  };
}
