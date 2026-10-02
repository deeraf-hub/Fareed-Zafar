import { ConflictError } from "./store.js";
import { mergePlans } from "./plan.js";
import { createTrace } from "./trace.js";
import { isSystemEvent } from "./events.js";
import { naiveBaseline } from "../models/tokens.js";
import { formatDayTime } from "./clock.js";

/**
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │  THE PIPELINE — every event, from every system, takes the same nine steps:   │
 * │                                                                              │
 * │  1 Event         normalized, deduplicated, persisted (before we do anything) │
 * │  2 State         who is this, which case — directory + case store, no model  │
 * │  3 Logic         the playbook's deterministic rules decide what they can     │
 * │  4 Retrieval     only the context the next step needs                        │
 * │  5 Model         only if the rules asked for one — local first, frontier     │
 * │                  when justified, schema-validated either way                 │
 * │  6 Action        the playbook turns decisions into a concrete plan           │
 * │  7 Validation    policy: allow · defer · needs approval · block              │
 * │  8 State update  one transaction: case, timeline, approvals, outbox, timers  │
 * │  9 Next action   timers schedule the follow-through; the outbox executes     │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Playbooks supply the domain knowledge (route / open / decide / plan / summarize).
 * This file supplies the discipline: ordering, tracing, validation, and atomicity.
 */
export function createPipeline({ store, clock, router, retriever, policy, playbooks, directory, log, emit = () => {}, frontierPrice }) {
  async function processEvent(eventId) {
    const event = store.getEvent(eventId);
    if (!event || event.status !== "received") return null;

    for (let attempt = 1; ; attempt++) {
      const trace = createTrace(event);
      try {
        return await runStages(event, trace);
      } catch (err) {
        if (err instanceof ConflictError && attempt < 3) {
          log.warn("case changed while processing — re-running against fresh state", { eventId, attempt });
          continue;
        }
        const data = trace.finish("failed", err.message);
        store.finishEvent(event.id, { status: "failed", error: err.message, trace: data });
        log.error("event failed", { eventId, type: event.type, error: err.message, stack: err.stack?.split("\n").slice(0, 4).join(" | ") });
        emit("trace", data);
        return data;
      }
    }
  }

  async function runStages(event, trace) {
    const now = clock.now();

    // ── 1. Event ──────────────────────────────────────────────────────────────
    trace.stage("event", "ok", describeEvent(event));

    // ── 2. State ──────────────────────────────────────────────────────────────
    const routed = playbooks.route(event);
    if (!routed) return ignore(event, trace, "no playbook handles this event");
    const { playbook } = routed;

    let caseRecord = routed.caseRecord;
    let isNew = false;
    let newParty = null; // first contact from someone not yet in the directory (a lead, a prospect)
    if (!caseRecord) {
      const opening = playbook.open({ event, sender: routed.sender, now, directory });
      if (!opening) return ignore(event, trace, `${playbook.name}: nothing to open a case for`);
      if (opening.newParty) {
        newParty = { id: store.nextSequenceId(opening.newParty.idPrefix ?? "PTY"), external: {}, attributes: {}, ...opening.newParty, updatedAt: now.toISOString() };
        delete newParty.idPrefix;
        opening.partyId = newParty.id;
      }
      caseRecord = draftCase(playbook, opening, now);
      isNew = true;
    }

    const ctx = {
      event,
      now,
      sender: routed.sender ?? null, // who this event came from (may be a vendor, neighbor, staff…)
      party: newParty ?? directory.party(caseRecord.partyId), // who the case is about (the resident, lead, prospect)
      newParty,
      case: caseRecord,
      isNew,
      property: directory.property(caseRecord.propertyId),
      unit: directory.unit(caseRecord.unitId),
      log: isNew ? [] : store.getLog(caseRecord.id, { limit: 40 }),
      timers: isNew ? [] : store.listTimers(caseRecord.id),
      approvalDecision: resolveApprovalDecision(event, routed),
      directory,
    };
    // What the naive design (every event + full history → a frontier model) would spend here.
    const naive = () =>
      naiveBaseline({
        history: ctx.party ? store.partyHistory(ctx.party.id) : ctx.log,
        party: ctx.party ?? ctx.sender,
        property: ctx.property,
        unit: ctx.unit,
        event: event.payload,
        price: frontierPrice,
      });
    trace.setCase(caseRecord, playbook.name, isSystemEvent(event.type) ? null : naive());
    trace.setHeadline(describeHeadline(event, ctx.sender));
    trace.stage("state", "ok", describeState(ctx), { caseId: caseRecord.id, status: caseRecord.status, version: caseRecord.version });

    // ── 3. Deterministic logic ────────────────────────────────────────────────
    const decision = playbook.decide(ctx);
    trace.stage("logic", "ok", decision.summary, { rules: decision.rules ?? [] });

    // ── 4. Retrieval ──────────────────────────────────────────────────────────
    const knowledge = await retrieve(decision.retrieve ?? []);
    const structuredCount = Object.keys(decision.context ?? {}).length;
    trace.stage(
      "retrieval",
      knowledge.results.length || structuredCount ? "ok" : "skip",
      knowledge.results.length || structuredCount
        ? [structuredCount && `${structuredCount} structured facts (SQL)`, knowledge.results.length && `${knowledge.results.length} doc chunks · ${knowledge.tokens} tokens`]
            .filter(Boolean)
            .join(" · ")
        : "nothing needed",
      { context: decision.context ?? null, docs: knowledge.results.map((r) => `${r.title} › ${r.section}`) }
    );

    // ── 5. Model (only if needed) ─────────────────────────────────────────────
    const models = {};
    for (const need of decision.needs ?? []) {
      const input = typeof need.input === "function" ? need.input(knowledge) : need.input;
      if (input === null) {
        // The rules can still veto a model call once retrieval is in (e.g. nothing relevant found).
        models[need.as ?? need.task] = { ok: false, skipped: true, reason: need.skipReason ?? "skipped", attempts: [] };
        continue;
      }
      const result = await router.run(need.task, input, { caseId: caseRecord.id, eventId: event.id });
      models[need.as ?? need.task] = result;
      trace.addModelUsage(result);
    }
    trace.stage(...describeModels(decision, models));
    // A system event that needed a model (an enrichment result → write the email) is a
    // decision point too, so it counts in the KPIs — with its own naive baseline.
    if (!trace.data.baseline && trace.data.model.calls > 0) trace.setBaseline(naive());

    // ── 6. Action ─────────────────────────────────────────────────────────────
    const released = releaseApprovedActions(ctx.approvalDecision);
    const plan = mergePlans(released, playbook.plan(ctx, decision, { models, knowledge }));
    assertUniqueKeys(plan.actions, playbook.name, decision.kind);
    trace.stage("action", plan.actions.length ? "ok" : "skip", plan.actions.length ? `${plan.actions.length} action(s) planned` : "no actions", {
      actions: plan.actions.map((a) => a.label),
      decisions: plan.decisions,
    });

    // ── 7. Validation ─────────────────────────────────────────────────────────
    // Policy judges the case as it WILL be once this plan is applied (a brand-new case
    // flagged sensitive by this very plan must already count as sensitive).
    const projected = projectCase(ctx.case, plan);
    const checked = plan.actions.map((action) => ({ action, ...policy.check(action, policyContext(ctx, projected, action)) }));
    const counts = countVerdicts(checked);
    trace.stage(
      "validation",
      counts.block || counts.approve ? "warn" : plan.actions.length ? "ok" : "skip",
      plan.actions.length ? verdictSummary(counts) : "nothing to validate",
      { verdicts: checked.filter((c) => c.verdict !== "allow").map((c) => ({ action: c.action.label, verdict: c.verdict, reason: c.reason })) }
    );

    // ── 8. State update + 9. Next action (one transaction) ───────────────────
    return store.tx(() => {
      const saved = commit(ctx, playbook, plan, checked, models);
      trace.stage("state_update", "ok", describeUpdate(caseRecord, saved, isNew), { version: saved.version });
      trace.stage(
        "next",
        plan.timers.length ? "ok" : "skip",
        plan.timers.length
          ? plan.timers.map((t) => `${t.kind.replace(/_/g, " ")} @ ${formatDayTime(new Date(t.at), ctx.property?.timezone ?? "UTC")}`).join(" · ")
          : saved.closedAt
            ? "case closed"
            : "waiting for the next event",
        { timers: plan.timers.map((t) => ({ kind: t.kind, at: new Date(t.at).toISOString() })) }
      );
      const data = trace.finish("processed");
      store.finishEvent(event.id, { status: "processed", caseId: saved.id, trace: data });
      emit("trace", data);
      emit("case", saved.id);
      return data;
    });
  }

  // ── Stage helpers ────────────────────────────────────────────────────────────

  function ignore(event, trace, reason) {
    trace.stage("state", "skip", reason);
    const data = trace.finish("ignored");
    store.finishEvent(event.id, { status: "ignored", trace: data });
    emit("trace", data);
    return data;
  }

  function draftCase(playbook, opening, now) {
    return {
      id: store.nextSequenceId(playbook.casePrefix),
      playbook: playbook.name,
      status: playbook.machine.initial,
      priority: opening.priority ?? null,
      title: opening.title,
      partyId: opening.partyId ?? null,
      propertyId: opening.propertyId ?? null,
      unitId: opening.unitId ?? null,
      facts: opening.facts ?? {},
      summary: "",
      external: {},
      flags: {},
      version: 0,
      openedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      closedAt: null,
    };
  }

  async function retrieve(requests) {
    const byName = {};
    const results = [];
    let tokens = 0;
    for (const r of requests) {
      const res = await retriever.search(r.query, { scopes: r.scopes, limit: r.limit ?? 3, budgetTokens: r.budgetTokens ?? 450 });
      byName[r.as ?? r.query] = res;
      results.push(...res.results);
      tokens += res.tokens;
    }
    return { byName, results, tokens };
  }

  /** An approval can be decided in the console (approval.decided) or by the approver's SMS reply. */
  function resolveApprovalDecision(event, routed) {
    if (event.type === "approval.decided") {
      const approval = store.getApproval(event.payload.approvalId);
      if (!approval || approval.status !== "pending") return null;
      return { approval, decision: event.payload.decision, by: event.payload.by, note: event.payload.note ?? null, edits: event.payload.edits ?? {} };
    }
    if (routed.approvalReply) return routed.approvalReply;
    return null;
  }

  /** Approved held actions re-enter validation as `_approved` (human rules already satisfied). */
  function releaseApprovedActions(approvalDecision) {
    if (!approvalDecision || approvalDecision.decision !== "approved") return null;
    const actions = approvalDecision.approval.actions.map((a) => {
      const edit = approvalDecision.edits?.[a.key];
      const payload = edit?.body ? { ...a.payload, body: edit.body } : a.payload;
      return { ...a, payload, _approved: true };
    });
    return { actions, decisions: [`Released ${actions.length} approved action(s)`] };
  }

  function policyContext(ctx, projected, action) {
    const recipient = directory.party(action.recipient?.partyId);
    return {
      now: ctx.now,
      caseRecord: projected,
      property: ctx.property,
      recipient,
      approved: action._approved === true,
      allowedContacts: [...Object.keys(directory.lines()), recipient?.phone, recipient?.email],
    };
  }

  function commit(ctx, playbook, plan, checked, models) {
    const { case: before, isNew, event, now } = ctx;
    const nowIso = now.toISOString();

    const next = {
      ...before,
      status: plan.status ?? before.status,
      priority: plan.priority ?? before.priority,
      title: plan.title ?? before.title,
      facts: { ...before.facts, ...plan.facts },
      flags: { ...before.flags, ...plan.flags },
      external: { ...before.external, ...plan.external },
      updatedAt: nowIso,
      closedAt: plan.close ? nowIso : before.closedAt,
    };
    playbook.machine.assertTransition(before.status, next.status);
    if (ctx.newParty) store.upsertParty(ctx.newParty);
    next.summary = playbook.summarize(next, directory);

    const saved = isNew ? store.createCase(next) : store.saveCase(next);
    const caseId = saved.id;
    const logEntry = (entry) => store.appendLog(caseId, { at: nowIso, eventId: event.id, actor: "agent", ...entry });

    // Timeline: what came in, what was decided, what the models did.
    const inbound = describeInbound(event, ctx.sender);
    if (inbound) logEntry(inbound);
    if (ctx.approvalDecision) {
      const { approval, decision, by, note } = ctx.approvalDecision;
      store.decideApproval(approval.id, { status: decision, decidedBy: by, decidedAt: nowIso, note });
      logEntry({ kind: "approval", actor: `human:${by}`, text: `${decision === "approved" ? "Approved" : "Rejected"} by ${by}: ${approval.summary}` });
    }
    for (const [name, result] of Object.entries(models)) logEntry({ kind: "model", text: describeModelUse(name, result), data: { attempts: result.attempts } });
    for (const d of plan.decisions) logEntry({ kind: "decision", text: d });
    for (const entry of plan.log) logEntry(entry);
    if (before.status !== next.status) logEntry({ kind: "state", text: `${before.status} → ${next.status}` });

    // Timers first (cancel, then schedule) so a plan can replace its own follow-ups.
    if (plan.cancelTimers === "all") store.cancelTimers(caseId);
    else if (plan.cancelTimers.length) store.cancelTimers(caseId, plan.cancelTimers);
    for (const t of plan.timers) {
      store.scheduleTimer({ caseId, kind: t.kind, dueAt: new Date(t.at).toISOString(), payload: t.payload ?? {}, createdAt: nowIso });
    }

    // Actions by verdict.
    const held = new Map(); // reason → { approverId, actions }
    for (const { action, verdict, reason, until, approverId } of checked) {
      const meta = { key: action.key, recipient: action.recipient ?? null, purpose: action.purpose ?? null, notify: Boolean(action.notify) };
      const idempotencyKey = action.once ? `${caseId}:${action.key}` : `${caseId}:${event.id}:${action.key}`;
      if (verdict === "allow" || verdict === "defer") {
        const { enqueued } = store.enqueueAction({
          caseId,
          eventId: event.id,
          idempotencyKey,
          connector: action.connector,
          operation: action.operation,
          label: action.label,
          payload: action.payload,
          meta,
          createdAt: nowIso,
          notBefore: verdict === "defer" ? until : nowIso,
        });
        if (!enqueued) continue; // already done once — idempotency at work
        logEntry(describeQueued(action, verdict, until, ctx.property));
      } else if (verdict === "approve") {
        const group = held.get(reason) ?? { approverId: approverId ?? action.approverId ?? null, actions: [] };
        group.actions.push(stripInternal(action));
        held.set(reason, group);
      } else {
        logEntry({ kind: "decision", text: `Blocked by policy — ${action.label}: ${reason}` });
      }
    }
    for (const [reason, group] of held) {
      const summary = group.actions.map((a) => a.label).join("; ");
      store.createApproval({ caseId, reason, summary, approverId: group.approverId, actions: group.actions, requestedAt: nowIso });
      logEntry({ kind: "approval", text: `Waiting for a person: ${summary} — ${reason}` });
    }

    for (const update of plan.partyUpdates) store.updateParty(update.partyId, { fields: update.fields, attributes: update.attributes }, nowIso);
    for (const op of plan.kv) applyKv(store, op);
    return saved;
  }

  return { processEvent };
}

// ── Descriptions (trace + timeline text) ───────────────────────────────────────

function describeEvent(event) {
  const p = event.payload;
  switch (event.type) {
    case "message.received":
      return `${p.channel === "email" ? "Email" : "SMS"} from ${p.from ?? "unknown sender"}${p.autoReply ? " (auto-reply)" : ""}`;
    case "call.gather":
      return `Keypad "${p.digits}" on call ${String(p.callSid ?? "").slice(0, 10)}…`;
    case "timer.fired":
      return `Timer: ${String(p.kind).replace(/_/g, " ")}`;
    case "action.completed":
      return `Result: ${p.connector}.${p.operation} succeeded`;
    case "action.failed":
      return `Result: ${p.connector}.${p.operation} failed permanently`;
    case "approval.decided":
      return `Approval ${p.decision} by ${p.by}`;
    case "call.status":
      return `Call ${String(p.callSid ?? "").slice(0, 10)}… → ${p.status}`;
    case "workorder.updated":
      return `Rentvine: work order ${p.workOrderId} → ${p.status}`;
    case "listing.inquiry":
      return `Rental inquiry from ${p.prospect?.name ?? "a prospect"}`;
    case "showing.scheduled":
      return `ShowMojo: tour booked by ${p.prospect?.name ?? "a prospect"}`;
    case "showing.completed":
      return `ShowMojo: tour completed by ${p.prospect?.name ?? "a prospect"}`;
    case "crm.person.updated":
      return `Follow Up Boss: person ${p.personId} updated${p.by ? ` by ${p.by}` : ""}`;
    case "prospect.discovered":
      return `New owner record from ${p.source}`;
    default:
      return `${event.type} from ${event.source}`;
  }
}

/** The console's title for a trace: the event, with the sender's name once State knows it. */
function describeHeadline(event, sender) {
  const p = event.payload;
  const who = sender ? `${sender.name} (${sender.role})` : null;
  if (who && event.type === "message.received") return `${p.channel === "email" ? "Email" : "SMS"} from ${who}${p.autoReply ? " (auto-reply)" : ""}`;
  if (who && event.type === "call.gather") return `${who} pressed ${p.digits} on the call`;
  return describeEvent(event);
}

function describeState(ctx) {
  const person = ctx.sender ?? ctx.party;
  const who = person ? `${person.name} (${person.role})` : ctx.event.type === "message.received" ? "unknown sender" : null;
  const where = [ctx.property?.name, ctx.unit?.label].filter(Boolean).join(" ");
  const which = ctx.isNew ? `new case ${ctx.case.id}` : `case ${ctx.case.id} · ${ctx.case.status}`;
  return [who, where, which].filter(Boolean).join(" · ");
}

function describeModels(decision, models) {
  const results = Object.values(models).filter((r) => !r.skipped);
  if (!results.length) {
    const vetoed = Object.entries(models).map(([name, r]) => `${name}: ${r.reason}`);
    return ["model", "skip", vetoed.length ? vetoed.join(" · ") : decision.modelSkipReason ?? "not needed — the rules were decisive"];
  }
  const parts = Object.entries(models).map(([name, r]) => describeModelUse(name, r));
  const used = results.filter((r) => r.ok);
  const status = used.some((r) => r.tier === "frontier") ? "frontier" : used.length ? "local" : "warn";
  return ["model", status, parts.join(" · "), { attempts: results.flatMap((r) => r.attempts) }];
}

function describeModelUse(name, r) {
  if (r.skipped) return `${name}: ${r.reason}`;
  if (!r.ok) return `${name}: no model available → deterministic fallback`;
  const tokens = `${r.inputTokens ?? 0}→${r.outputTokens ?? 0} tok`;
  const cost = r.costUsd ? ` · $${r.costUsd.toFixed(4)}` : "";
  const flag = r.cached ? " (cached)" : r.lowConfidence ? " (low confidence)" : "";
  return `${name}: ${r.tier}${r.simulated ? " (simulated)" : ""} · ${r.model} · ${tokens}${cost}${flag}`;
}

function describeInbound(event, party) {
  const p = event.payload;
  const actor = party ? `party:${party.id}` : "system";
  if (event.type === "message.received") {
    return { kind: "inbound", actor, text: `${party?.name ?? p.from} (${p.channel}): ${p.subject ? `[${p.subject}] ` : ""}${p.text}` };
  }
  if (event.type === "call.gather") return { kind: "inbound", actor, text: `${party?.name ?? "Caller"} pressed ${p.digits}` };
  if (event.type === "timer.fired") return { kind: "note", actor: "system", text: `Timer fired: ${String(p.kind).replace(/_/g, " ")}` };
  if (event.type === "action.failed") return { kind: "note", actor: "system", text: `Action failed permanently: ${p.label} — ${p.error}` };
  if (event.type === "action.completed") return null;
  if (event.type === "approval.decided") return null;
  return { kind: "inbound", actor: "system", text: describeEvent(event) };
}

function describeQueued(action, verdict, until, property) {
  const when = verdict === "defer" ? ` — deferred to ${formatDayTime(new Date(until), property?.timezone ?? "UTC")} (quiet hours)` : "";
  if (action.operation === "sendSms" || action.operation === "sendEmail") {
    const to = action.recipient?.name ?? action.payload.to;
    return { kind: "outbound", text: `→ ${to} (${action.operation === "sendSms" ? "SMS" : "email"})${when}: ${action.payload.body}`, data: { key: action.key } };
  }
  if (action.operation === "placeCall") {
    return { kind: "outbound", text: `→ ${action.recipient?.name ?? action.payload.to} (call)${when}: "${action.payload.say}"`, data: { key: action.key } };
  }
  return { kind: "action", text: `${action.label}${when}`, data: { key: action.key } };
}

function describeUpdate(before, saved, isNew) {
  if (isNew) return `opened ${saved.id} as ${saved.status} (v${saved.version})`;
  if (before.status !== saved.status) return `${before.status} → ${saved.status} (v${saved.version})`;
  return `facts updated (v${saved.version})`;
}

function countVerdicts(checked) {
  const counts = { allow: 0, defer: 0, approve: 0, block: 0 };
  for (const c of checked) counts[c.verdict] += 1;
  return counts;
}

function verdictSummary(c) {
  return [c.allow && `${c.allow} allowed`, c.defer && `${c.defer} deferred`, c.approve && `${c.approve} need approval`, c.block && `${c.block} blocked`]
    .filter(Boolean)
    .join(" · ");
}

/** Learning state lives in the kv table and is updated in the same transaction as the case. */
function applyKv(store, op) {
  if (op.set !== undefined) return store.setKV(op.key, op.set);
  if (op.append !== undefined) {
    const list = store.getKV(op.key, []);
    list.push(op.append);
    return store.setKV(op.key, list.slice(-5000));
  }
  if (op.increment) {
    const root = store.getKV(op.key, {});
    let node = root;
    for (const part of op.increment.slice(0, -1)) node = node[part] ??= {};
    const leaf = op.increment.at(-1);
    node[leaf] = (node[leaf] ?? 0) + (op.by ?? 1);
    return store.setKV(op.key, root);
  }
  throw new Error(`Unknown kv op for ${op.key}`);
}

/** The case as it will look after the plan is applied (used for validation). */
function projectCase(caseRecord, plan) {
  return {
    ...caseRecord,
    status: plan.status ?? caseRecord.status,
    priority: plan.priority ?? caseRecord.priority,
    facts: { ...caseRecord.facts, ...plan.facts },
    flags: { ...caseRecord.flags, ...plan.flags },
  };
}

/** Two actions with the same key in one plan would collapse into one — that's a playbook bug. */
function assertUniqueKeys(actions, playbook, kind) {
  const seen = new Set();
  for (const a of actions) {
    if (seen.has(a.key)) throw new Error(`${playbook}/${kind}: duplicate action key "${a.key}"`);
    seen.add(a.key);
  }
}

function stripInternal(action) {
  const { _approved, ...rest } = action;
  return rest;
}
