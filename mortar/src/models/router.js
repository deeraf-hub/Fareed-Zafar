import { shortHash } from "../core/ids.js";
import { ProviderError } from "./providers/errors.js";

/**
 * Model router.
 *
 * Playbooks only call the router after their deterministic rules have decided a
 * model is genuinely needed. The router then picks the cheapest tier that can do the
 * job reliably and escalates only when it must:
 *
 *   for tier in task.tiers (e.g. local → frontier):
 *     skip if the provider is missing, its circuit is open, or the frontier budget is spent
 *     call it with the task's JSON schema → validate with zod → one repair attempt
 *     below the task's confidence floor → keep as a fallback candidate, try the next tier
 *     success → record in the ledger, cache, return
 *   nothing worked → { ok:false } and the playbook takes its deterministic fallback
 *
 * Every attempt (including deliberate skips) lands in the model ledger with tokens,
 * cost and latency, which is what the console's cost panel reads.
 */
export function createModelRouter({ store, clock, providers, tasks, log, config }) {
  const breakers = new Map();
  const cache = new Map();
  const CACHE_LIMIT = 500;

  async function run(taskName, input, { caseId = null, eventId = null, tiers } = {}) {
    const task = tasks.get(taskName);
    const prompt = task.prompt(input);
    const cacheKey = task.cacheable ? `${task.name}:${shortHash(prompt)}` : null;
    const attempts = [];

    if (cacheKey && cache.has(cacheKey)) {
      const hit = cache.get(cacheKey);
      record({ task, tier: hit.tier, provider: hit.provider, model: hit.model, outcome: "cached", caseId, eventId });
      return { ...hit, cached: true, inputTokens: 0, outputTokens: 0, costUsd: 0, latencyMs: 0, attempts: [{ tier: hit.tier, outcome: "cached" }] };
    }

    let candidate = null; // best low-confidence answer, used only if no tier does better

    for (const tier of tiers ?? task.tiers) {
      const provider = providers[tier];
      const base = { task, tier, provider: provider?.name ?? "none", model: provider?.model ?? "-", caseId, eventId };

      if (!provider) {
        attempts.push(skip(base, "unavailable", "no provider configured"));
        continue;
      }
      if (isOpen(provider)) {
        attempts.push(skip(base, "unavailable", "circuit open after repeated failures"));
        continue;
      }
      if (tier === "frontier" && overBudget()) {
        attempts.push(skip(base, "over_budget", `daily frontier budget of $${config.frontier.dailyBudgetUsd} reached`));
        continue;
      }

      let result;
      try {
        result = await callWithRepair(provider, task, input, prompt);
      } catch (err) {
        const kind = err instanceof ProviderError ? err.kind : "error";
        if (kind === "error") trip(provider); // refusals and bad JSON don't mean the provider is down
        attempts.push(note(base, kind, { error: err.message }));
        log.warn("model call failed", { task: task.name, tier, provider: provider.name, error: err.message });
        continue;
      }
      reset(provider);

      const usage = pickUsage(result.res);
      if (!result.valid.ok) {
        attempts.push(note(base, "invalid_output", { ...usage, error: result.valid.error }));
        continue;
      }

      const output = result.valid.value;
      if (task.minConfidence !== null && typeof output.confidence === "number" && output.confidence < task.minConfidence) {
        attempts.push(note(base, "low_confidence", { ...usage, error: `confidence ${output.confidence} < ${task.minConfidence}` }));
        candidate ??= { output, base, usage };
        continue;
      }

      attempts.push(note(base, "ok", usage));
      const answer = { ok: true, output, tier, provider: provider.name, model: usage.model, simulated: Boolean(provider.simulated), ...usage };
      if (cacheKey) remember(cacheKey, answer);
      return { ...answer, attempts };
    }

    if (candidate) {
      return {
        ok: true,
        lowConfidence: true,
        output: candidate.output,
        tier: candidate.base.tier,
        provider: candidate.base.provider,
        simulated: Boolean(providers[candidate.base.tier]?.simulated),
        ...candidate.usage,
        attempts,
      };
    }
    return { ok: false, attempts, inputTokens: 0, outputTokens: 0, costUsd: 0 };
  }

  async function callWithRepair(provider, task, input, prompt) {
    const maxTokens = provider.tier === "frontier" ? task.frontierMaxTokens : task.maxOutputTokens;
    const request = { task, input, system: task.system, prompt, schema: task.schema, jsonSchema: task.jsonSchema, maxTokens, effort: task.effort };
    const first = await provider.complete(request);
    let valid = validate(task, first);
    if (valid.ok || provider.simulated) return { res: first, valid };

    // One repair round: show the model exactly what was wrong.
    const second = await provider.complete({
      ...request,
      prompt: `${prompt}\n\n## Your previous answer was rejected\n${valid.error}\nReturn only JSON that matches the schema.`,
    });
    valid = validate(task, second);
    return { res: sumUsage(first, second), valid };
  }

  function validate(task, res) {
    let value = res.output;
    if (value === undefined || value === null) {
      try {
        value = JSON.parse(stripFences(res.text));
      } catch {
        return { ok: false, error: "reply was not valid JSON" };
      }
    }
    const parsed = task.schema.safeParse(value);
    return parsed.success
      ? { ok: true, value: parsed.data }
      : { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ") };
  }

  // ── Circuit breaker (per provider, wall-clock based) ─────────────────────────

  function isOpen(provider) {
    const b = breakers.get(provider.name);
    return Boolean(b && b.openUntil > Date.now());
  }
  function trip(provider) {
    const b = breakers.get(provider.name) ?? { failures: 0, openUntil: 0 };
    b.failures += 1;
    if (b.failures >= config.circuitFailures) {
      b.openUntil = Date.now() + config.circuitCooldownMs;
      b.failures = 0;
      log.warn("model circuit opened", { provider: provider.name, cooldownMs: config.circuitCooldownMs });
    }
    breakers.set(provider.name, b);
  }
  function reset(provider) {
    breakers.delete(provider.name);
  }

  function overBudget() {
    const since = new Date(clock.now().getTime() - 24 * 3600_000).toISOString();
    return store.frontierSpendSince(since) >= config.frontier.dailyBudgetUsd;
  }

  // ── Ledger helpers ───────────────────────────────────────────────────────────

  function record({ task, tier, provider, model, outcome, caseId, eventId, inputTokens = 0, outputTokens = 0, cachedTokens = 0, costUsd = 0, latencyMs = 0, estimated = false, error = null }) {
    store.recordModelCall({
      at: clock.now().toISOString(),
      eventId,
      caseId,
      task: task.name,
      tier,
      provider,
      model,
      outcome,
      inputTokens,
      outputTokens,
      cachedTokens,
      costUsd,
      latencyMs,
      estimated,
      error,
    });
  }

  function skip(base, outcome, reason) {
    record({ ...base, outcome, error: reason });
    return { tier: base.tier, provider: base.provider, outcome, error: reason };
  }

  function note(base, outcome, usage = {}) {
    record({ ...base, outcome, ...usage, model: usage.model ?? base.model });
    return { tier: base.tier, provider: base.provider, model: usage.model ?? base.model, outcome, ...usage };
  }

  function remember(key, answer) {
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
    cache.set(key, answer);
  }

  return {
    run,
    providers,
    /** Provider health for the console header. */
    async status() {
      const out = {};
      for (const tier of ["local", "frontier"]) {
        const p = providers[tier];
        if (!p) {
          out[tier] = { available: false, provider: "none", model: "-", detail: "not configured" };
          continue;
        }
        const health = await p.health();
        out[tier] = { available: health.ok && !isOpen(p), provider: p.name, model: p.model, simulated: Boolean(p.simulated), detail: health.detail };
      }
      return out;
    },
  };
}

function pickUsage(res) {
  return {
    model: res.model,
    inputTokens: res.inputTokens ?? 0,
    outputTokens: res.outputTokens ?? 0,
    cachedTokens: res.cachedTokens ?? 0,
    costUsd: res.costUsd ?? 0,
    latencyMs: res.latencyMs ?? 0,
    estimated: Boolean(res.estimated),
  };
}

function sumUsage(a, b) {
  return {
    ...b,
    inputTokens: (a.inputTokens ?? 0) + (b.inputTokens ?? 0),
    outputTokens: (a.outputTokens ?? 0) + (b.outputTokens ?? 0),
    cachedTokens: (a.cachedTokens ?? 0) + (b.cachedTokens ?? 0),
    costUsd: (a.costUsd ?? 0) + (b.costUsd ?? 0),
    latencyMs: (a.latencyMs ?? 0) + (b.latencyMs ?? 0),
  };
}

function stripFences(text) {
  return String(text ?? "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}
