import { performance } from "node:perf_hooks";

/** The nine stages, in order. The console draws one "rail" per event from this. */
export const STAGES = [
  { key: "event", label: "Event" },
  { key: "state", label: "State" },
  { key: "logic", label: "Deterministic logic" },
  { key: "retrieval", label: "Retrieval" },
  { key: "model", label: "Model (if needed)" },
  { key: "action", label: "Action" },
  { key: "validation", label: "Validation" },
  { key: "state_update", label: "State update" },
  { key: "next", label: "Next action" },
];

/**
 * Per-event trace: what each stage concluded, how long it took, and what it cost.
 * Stored on the event row (audit) and streamed to the console (observability).
 */
export function createTrace(event) {
  const data = {
    eventId: event.id,
    type: event.type,
    source: event.source,
    at: event.occurredAt,
    headline: null, // "SMS from Maya Thompson (tenant)" — set once State knows who it is
    caseId: null,
    caseTitle: null,
    playbook: null,
    stages: [],
    model: { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, tiers: [] },
    baseline: null,
    outcome: null,
  };
  const started = performance.now();
  let last = started;

  return {
    data,
    setCase(caseRecord, playbook, baseline) {
      data.caseId = caseRecord.id;
      data.caseTitle = caseRecord.title;
      data.playbook = playbook;
      data.baseline = baseline;
    },
    setBaseline(baseline) {
      data.baseline = baseline;
    },
    setHeadline(text) {
      data.headline = text;
    },
    stage(key, status, summary, detail = null) {
      const now = performance.now();
      const meta = STAGES.find((s) => s.key === key);
      data.stages.push({ key, label: meta?.label ?? key, status, summary, detail, ms: Math.round((now - last) * 10) / 10 });
      last = now;
    },
    addModelUsage(result) {
      if (!result) return;
      for (const attempt of result.attempts ?? []) {
        if (["unavailable", "over_budget", "cached"].includes(attempt.outcome)) continue;
        data.model.calls += 1;
        data.model.inputTokens += attempt.inputTokens ?? 0;
        data.model.outputTokens += attempt.outputTokens ?? 0;
        data.model.costUsd += attempt.costUsd ?? 0;
        if (!data.model.tiers.includes(attempt.tier)) data.model.tiers.push(attempt.tier);
      }
    },
    /** Mark the remaining stages as not reached (ignored or failed events). */
    finish(outcome, error = null) {
      for (const stage of STAGES) {
        if (!data.stages.some((s) => s.key === stage.key)) {
          data.stages.push({ key: stage.key, label: stage.label, status: outcome === "failed" ? "error" : "skip", summary: "—", detail: null, ms: 0 });
        }
      }
      data.outcome = outcome;
      data.error = error;
      data.durationMs = Math.round((performance.now() - started) * 10) / 10;
      return data;
    },
  };
}
