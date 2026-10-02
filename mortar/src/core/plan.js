/**
 * A Plan is what a playbook returns from the Action step: the complete, declarative
 * description of what should happen — nothing has happened yet. The pipeline
 * validates it, then commits it in one transaction.
 *
 *   status / priority / title     state transition (checked against the state machine)
 *   facts / flags / external      shallow-merged into the case
 *   actions                       outbound side effects (→ policy → outbox)
 *   timers / cancelTimers         the follow-through ("what happens next, and when")
 *   log                           timeline entries
 *   partyUpdates                  { partyId, fields?, attributes } — contact details + long-term memory
 *   kv                            learning state: { key, append } · { key, increment: [path], by } · { key, set }
 *   decisions                     short human-readable bullets for the trace
 */
export function emptyPlan() {
  return { facts: {}, flags: {}, external: {}, actions: [], timers: [], cancelTimers: [], log: [], partyUpdates: [], kv: [], decisions: [] };
}

/** Compose plan fragments (later fragments win on scalar fields). Null fragments are skipped. */
export function mergePlans(...fragments) {
  const plan = emptyPlan();
  for (const f of fragments) {
    if (!f) continue;
    for (const key of ["status", "priority", "title", "close"]) if (f[key] !== undefined) plan[key] = f[key];
    Object.assign(plan.facts, f.facts);
    Object.assign(plan.flags, f.flags);
    Object.assign(plan.external, f.external);
    for (const key of ["actions", "timers", "log", "partyUpdates", "kv", "decisions"]) if (f[key]) plan[key].push(...f[key]);
    if (f.cancelTimers === "all" || plan.cancelTimers === "all") plan.cancelTimers = "all";
    else if (f.cancelTimers) plan.cancelTimers.push(...f.cancelTimers);
  }
  return plan;
}
