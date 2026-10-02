import { fetchJson, ProviderError } from "./errors.js";

/**
 * Local model via Ollama's native API.
 *
 * Structured output: the JSON schema goes in `format`, so decoding is grammar-
 * constrained to the schema. Temperature 0 for repeatable extraction and
 * classification. `think: false` keeps reasoning models fast and terse for these
 * narrow jobs. Token counts come straight from Ollama.
 *
 * OLLAMA_MODEL picks the model; unset, the first installed chat model is used
 * (embedding models are skipped), so `ollama pull <model>` is the only setup step.
 */
export function ollamaProvider({ url, model, timeoutMs }) {
  let resolved = model || null;

  async function installed() {
    const tags = await fetchJson(`${url}/api/tags`, { method: "GET", timeoutMs: 3000 });
    return (tags.models ?? []).map((m) => m.name);
  }

  function firstChatModel(names) {
    const chat = names.filter((name) => !/embed/i.test(name));
    if (!chat.length) throw new ProviderError("Ollama is running but no chat model is pulled (ollama pull <model>)");
    return chat[0];
  }

  async function resolveModel() {
    return (resolved ??= firstChatModel(await installed()));
  }

  return {
    name: "ollama",
    tier: "local",
    get model() {
      return resolved ?? "auto (first installed)";
    },

    async complete({ system, prompt, jsonSchema, maxTokens }) {
      const started = Date.now();
      const modelId = await resolveModel();
      const body = await fetchJson(`${url}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        timeoutMs,
        body: JSON.stringify({
          model: modelId,
          stream: false,
          think: false,
          format: jsonSchema,
          keep_alive: "30m",
          options: { temperature: 0, num_predict: maxTokens, num_ctx: 4096 },
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
      });
      const text = body.message?.content ?? "";
      if (!text) throw new ProviderError("Ollama returned an empty message", { kind: "invalid_output" });
      return {
        text,
        model: body.model ?? modelId,
        inputTokens: body.prompt_eval_count ?? 0,
        outputTokens: body.eval_count ?? 0,
        cachedTokens: 0,
        costUsd: 0,
        latencyMs: Date.now() - started,
        estimated: false,
      };
    },

    async health() {
      let names;
      try {
        names = await installed();
      } catch (err) {
        return { ok: false, detail: `Ollama not reachable at ${url}: ${err.message}` };
      }
      if (!model) {
        try {
          resolved ??= firstChatModel(names);
          return { ok: true, detail: `${resolved} via Ollama (first installed — pin it with OLLAMA_MODEL)` };
        } catch (err) {
          return { ok: false, detail: err.message };
        }
      }
      return names.some((n) => n === model || n === `${model}:latest`)
        ? { ok: true, detail: `${model} via Ollama` }
        : { ok: false, detail: `Ollama is running but "${model}" is not pulled (ollama pull ${model})` };
    },
  };
}
