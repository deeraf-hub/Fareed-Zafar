import { kpis } from "./snapshot.js";

/**
 * Prometheus exposition (GET /metrics). Scrape it with Prometheus/Grafana Agent or
 * CloudWatch's Prometheus integration; alert on dead letters, pending approvals that
 * age, open circuit breakers, and frontier spend.
 */
export function metricsText(app) {
  const { store } = app;
  const lines = [];
  const metric = (name, help, type, samples) => {
    lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} ${type}`);
    for (const [labels, value] of samples) lines.push(`${name}${labels ? `{${labels}}` : ""} ${value}`);
  };
  const esc = (v) => String(v).replace(/"/g, '\\"');

  const byType = new Map();
  for (const e of store.listEvents({ limit: 100000 })) {
    const key = `type="${esc(e.type)}",outcome="${e.status}"`;
    byType.set(key, (byType.get(key) ?? 0) + 1);
  }
  metric("mortar_events_total", "Events by type and outcome", "counter", [...byType]);

  const totals = store.modelTotals();
  metric("mortar_model_calls_total", "Model calls by tier and outcome (skips included)", "counter", totals.map((t) => [`tier="${t.tier}",outcome="${t.outcome}"`, t.calls]));
  metric("mortar_model_tokens_total", "Tokens sent to/received from models", "counter", totals.flatMap((t) => [[`tier="${t.tier}",direction="input"`, t.inputTokens], [`tier="${t.tier}",direction="output"`, t.outputTokens]]));
  metric("mortar_model_cost_usd_total", "Model spend in USD", "counter", totals.filter((t) => t.costUsd).map((t) => [`tier="${t.tier}",outcome="${t.outcome}"`, t.costUsd.toFixed(6)]));

  const k = kpis(app);
  metric("mortar_decisions_by_rules_ratio", "Share of decision points resolved without any model call", "gauge", [["", (k.decidedByRulesPct / 100).toFixed(3)]]);
  metric("mortar_tokens_saved_ratio", "Tokens saved versus a send-everything-to-the-LLM baseline", "gauge", [["", (k.tokens.savedPct / 100).toFixed(3)]]);
  metric("mortar_outbox_actions", "Outbox actions by status", "gauge", Object.entries(k.outbox).map(([status, n]) => [`status="${status}"`, n]));
  metric("mortar_approvals_pending", "Actions waiting for a person", "gauge", [["", k.pendingApprovals]]);
  metric("mortar_cases_open", "Open cases", "gauge", [["", k.openCases]]);
  return lines.join("\n") + "\n";
}
