import { STAGES } from "../core/trace.js";

/**
 * What the console shows, assembled from the store. The headline numbers compare
 * Mortar with the naive design — every decision point sent, with the full customer
 * history, to a frontier model — using the baseline each trace computed at the time.
 */

const USED = new Set(["ok", "low_confidence", "invalid_output", "refusal", "error"]);

export function kpis(app) {
  const { store } = app;
  const events = store.listEvents({ limit: 10000 });
  const decisions = events.filter((e) => e.trace && e.status === "processed" && e.trace.baseline);
  const withModel = decisions.filter((e) => e.trace.model.calls > 0);
  const calls = store.modelTotals().filter((t) => USED.has(t.outcome));
  const sum = (rows, f) => rows.reduce((n, r) => n + f(r), 0);

  const used = { tokens: sum(calls, (t) => t.inputTokens + t.outputTokens), costUsd: sum(calls, (t) => t.costUsd) };
  const naive = { tokens: sum(decisions, (e) => e.trace.baseline.inputTokens + e.trace.baseline.outputTokens), costUsd: sum(decisions, (e) => e.trace.baseline.costUsd) };
  const openCases = store.listCases({ openOnly: true, limit: 1000 });
  const pending = store.listApprovals({ status: "pending" });
  const outbox = store.outboxStats();
  const p1 = openCases.concat(store.listCases({ limit: 200 })).filter((c) => c.priority === "P1");
  const firstResponse = p1.length ? store.listEvents({ caseId: p1[0].id, limit: 500 }).at(-1)?.trace?.durationMs ?? null : null;

  return {
    events: events.length,
    decisionPoints: decisions.length,
    decidedByRules: decisions.length - withModel.length,
    decidedByRulesPct: decisions.length ? Math.round(((decisions.length - withModel.length) / decisions.length) * 100) : 0,
    modelCalls: {
      local: sum(calls.filter((c) => c.tier === "local"), (t) => t.calls),
      frontier: sum(calls.filter((c) => c.tier === "frontier"), (t) => t.calls),
    },
    naiveCalls: decisions.length,
    tokens: { used: used.tokens, naive: naive.tokens, savedPct: naive.tokens ? Math.max(0, Math.round((1 - used.tokens / naive.tokens) * 1000) / 10) : 0 },
    costUsd: { used: round(used.costUsd), naive: round(naive.costUsd) },
    openCases: openCases.length,
    awaitingHuman: pending.length + openCases.filter((c) => c.flags.needsHuman).length,
    pendingApprovals: pending.length,
    outbox,
    deadLetters: outbox.dead ?? 0,
    p1FirstResponseMs: firstResponse,
  };
}

export async function snapshot(app, { stories }) {
  const { store, world } = app;
  const cases = store.listCases({ limit: 200 }).map((c) => ({
    id: c.id,
    playbook: c.playbook,
    status: c.status,
    statusLabel: app.playbooks.byName[c.playbook]?.machine.labels[c.status] ?? c.status,
    priority: c.priority,
    title: c.title,
    summary: c.summary,
    updatedAt: c.updatedAt,
    closed: Boolean(c.closedAt),
    flags: c.flags,
  }));
  return {
    now: app.clock.now().toISOString(),
    timezone: app.config.timezone,
    simulatedClock: Boolean(app.clock.simulated),
    demo: app.config.demo,
    providers: await app.router.status(),
    connectors: app.modes,
    kpis: kpis(app),
    cases,
    approvals: store.listApprovals({ status: "pending" }),
    traces: store
      .listEvents({ limit: 60 })
      .filter((e) => e.trace)
      .map((e) => e.trace),
    stages: STAGES,
    outbox: store.listActions({ limit: 80 }),
    modelCalls: store.listModelCalls({ limit: 80 }),
    tasks: app.tasks.list().map((t) => ({ name: t.name, tiers: t.tiers, why: t.why })),
    machines: Object.fromEntries(app.playbooks.list.map((p) => [p.name, { mainPath: p.machine.mainPath, labels: p.machine.labels }])),
    world: {
      messages: world.state.messages.slice(-250),
      calls: world.state.calls.slice(-60),
      workOrders: world.state.workOrders,
      fubPeople: world.state.fubPeople,
      fubTasks: world.state.fubTasks.slice(-30),
      fubAppointments: world.state.fubAppointments,
      fubNotes: world.state.fubNotes.length,
      enrichment: store.getKV("leadgen:spend", { enrichmentUsd: 0, lookups: 0 }),
    },
    directory: store.listParties().map((p) => ({ id: p.id, role: p.role, name: p.name, phone: p.phone, email: p.email, title: p.attributes?.title ?? null })),
    lines: store.getKV("lines", {}),
    learning: { weights: store.getKV("leadgen:weights", null), log: store.getKV("leadgen:learning-log", []).slice(-3) },
    stories,
  };
}

export function caseDetail(app, id) {
  const { store } = app;
  const c = store.getCase(id);
  if (!c) throw new Error(`case ${id} not found`);
  const playbook = app.playbooks.byName[c.playbook];
  return {
    case: { ...c, statusLabel: playbook.machine.labels[c.status] ?? c.status },
    machine: { mainPath: playbook.machine.mainPath, labels: playbook.machine.labels },
    party: store.getParty(c.partyId),
    property: store.getProperty(c.propertyId),
    log: store.getLog(c.id),
    timers: store.listTimers(c.id),
    actions: store.listActions({ caseId: c.id }),
    approvals: store.listApprovals({ caseId: c.id }),
    modelCalls: store.listModelCalls({ caseId: c.id }),
    traces: store
      .listEvents({ caseId: c.id, limit: 200 })
      .filter((e) => e.trace)
      .map((e) => e.trace),
  };
}

const round = (n) => Math.round(n * 10000) / 10000;
