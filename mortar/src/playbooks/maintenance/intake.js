import { templates, CATEGORY_LABEL, TRADES_FOR, safetyFor } from "./messages.js";
import { isHigher, maxSeverity } from "./rules.js";
import { mergePlans } from "../../core/plan.js";
import { isBusinessHours } from "../../core/directory.js";
import { formatDayTime, nextBusinessMorning } from "../../core/clock.js";
import { startEscalation } from "../../core/escalation.js";
import { notify, firstName } from "../shared/actions.js";
import { startDispatch } from "./dispatch.js";
import { requestNeighborCheck } from "./follow-through.js";
import { ACK_MIN, CHECKIN_MIN, tz, at, later, line, titleFor, shutoffLocation, sensitiveConcerns, priorHistory, workOrderAction, ownerNotice, alertCaseOwner } from "./helpers.js";

/**
 * Maintenance — new issues. Severity decides the shape of the response:
 *
 *   P1 emergency   safety steps + work order + vendor ladder + on-call ladder + unit above + owner, all at once
 *   P2 urgent      acknowledge + work order; dispatch now (business hours) or first thing tomorrow
 *   P3 routine     acknowledge + work order; business-hours scheduling
 *   sensitive      vetted acknowledgement now; the frontier model's draft waits for a person
 */

/**
 * Rules first. The model fills the gaps and may RAISE a rule's severity, never lower it.
 * No rule and no model → P2, flagged for a person (the safe default). Pure, so the eval
 * harness scores exactly what production does.
 */
export function resolveSeverity(a, triage) {
  if (triage?.ok && !triage.output.is_maintenance) return { nonMaintenance: true, triage: triage.output };
  if (triage?.ok) {
    const t = triage.output;
    const decisions = [];
    let severity = a.severity;
    if (!severity || isHigher(t.urgency, severity)) {
      if (severity) decisions.push(`Model raised severity ${severity} → ${t.urgency}`);
      severity = t.urgency;
    } else if (isHigher(severity, t.urgency)) {
      decisions.push(`Model suggested ${t.urgency}; the rule's ${severity} stands (models may raise severity, never lower it)`);
    }
    const category = a.category ?? t.category;
    return { severity, category, trades: a.trades.length ? a.trades : TRADES_FOR[category] ?? [], lowConfidence: Boolean(triage.lowConfidence), decisions };
  }
  if (!a.severity) {
    return { severity: "P2", category: "general", trades: TRADES_FOR.general, lowConfidence: true, decisions: ["No rule matched and no model was available → P2 and a person double-checks (safe default)"] };
  }
  return { severity: a.severity, category: a.category, trades: a.trades, lowConfidence: false, decisions: [] };
}

export function planNewIssue(ctx, d, models, knowledge) {
  const a = d.assessment;
  const triage = models.triage;
  const resolved = resolveSeverity(a, triage);
  if (resolved.nonMaintenance) return planNonMaintenance(ctx, resolved.triage);
  const { severity, category, trades, lowConfidence, decisions } = resolved;

  const s = {
    severity,
    category,
    trades,
    safety: a.safety,
    decisions,
    facts: {
      severity,
      category,
      trades,
      room: a.room ?? triage?.output?.room ?? null,
      rulesFired: a.rulesFired,
      issueSummary: triage?.output?.summary ?? null,
      report: { text: ctx.event.payload.text, channel: ctx.event.payload.channel, at: ctx.event.occurredAt },
    },
  };

  let result;
  if (a.sensitive && severity !== "P1") result = planSensitive(ctx, s, a, models);
  else if (severity === "P1") result = mergePlans(planEmergency(ctx, s, knowledge), a.sensitive ? sensitiveExtras(ctx, s, a, models) : null);
  else if (severity === "P2") result = planUrgent(ctx, s, a);
  else result = planRoutine(ctx, s);

  if (lowConfidence) result = mergePlans(result, { flags: { needsHuman: true }, decisions: ["Low-confidence triage → flagged for a person to double-check"] });
  return result;
}

/** P1: everything at once — safety steps, work order, vendor, on-call, unit above, owner. */
export function planEmergency(ctx, s, knowledge) {
  const { party, property, unit } = ctx;
  const trade = s.trades[0] ?? null;
  const shutoff = shutoffLocation(ctx, knowledge);
  const afterHours = !isBusinessHours(ctx.now, tz(ctx));
  const safety = safetyFor({ safety: s.safety, category: s.category, rulesFired: s.facts.rulesFired });

  const reply = notify({
    key: "emergency-reply",
    to: party,
    body: templates.emergencyReply({ first: firstName(party), receivedAt: at(ctx, new Date(ctx.event.occurredAt)), caseId: ctx.case.id, safety, shutoff, dispatching: Boolean(trade) }),
    subject: `We're on it — case ${ctx.case.id}`,
    purpose: "emergency",
    channels: ["sms", "email"],
    from: line(ctx, "sms"),
    inReplyTo: true,
  });

  const ladder = ctx.directory.onCallLadder({ afterHours });
  const escalation = ladder.length
    ? startEscalation({
        caseRecord: { ...ctx.case, priority: "P1" },
        ladder,
        reason: `P1 ${CATEGORY_LABEL[s.category].toLowerCase()}${s.facts.rulesFired.includes("failedContact") ? " — resident says calls went unanswered" : ""}`,
        summary: `P1 ${CATEGORY_LABEL[s.category]} at ${property?.name} ${unit?.label} (${party?.name})${s.facts.rulesFired.includes("failedContact") ? ". Resident says nobody answered the phone" : ""}`,
        now: ctx.now,
        ackMinutes: ACK_MIN,
      })
    : { flags: { needsHuman: true }, decisions: ["No on-call rota configured — flagged for a person"] };

  return mergePlans(
    {
      status: trade ? "dispatching" : "triaged",
      priority: "P1",
      title: titleFor(s.category, property, unit, party),
      facts: { ...s.facts, afterHours, shutoff, safety },
      actions: [...reply, workOrderAction(ctx, s)],
      timers: [{ kind: "tenant_checkin", at: later(ctx, CHECKIN_MIN) }],
      decisions: [
        ...s.decisions,
        `P1 → ${safety ? `vetted safety steps now (${safety} template${shutoff && safety === "water" ? `, shutoff: ${shutoff}` : ""})` : "no safety template applies"}, work order, ${trade ? `${trade} dispatch` : "emergency services first, no vendor"}, page on-call`,
      ],
    },
    trade ? startDispatch(ctx, trade, { urgent: true, category: s.category, room: s.facts.room }) : null,
    escalation,
    s.category === "water_leak" ? requestNeighborCheck(ctx) : null,
    ownerNotice(ctx, s)
  );
}

/** P2: acknowledge now, work order now, dispatch now in business hours or first thing tomorrow. */
export function planUrgent(ctx, s, a) {
  const tzone = tz(ctx);
  const afterHours = !isBusinessHours(ctx.now, tzone);
  const morning = nextBusinessMorning(ctx.now, tzone, 8);
  const when = afterHours ? `by ${formatDayTime(morning, tzone)}` : "within a few hours";

  const fragments = [
    {
      status: afterHours ? "scheduled" : "dispatching",
      priority: "P2",
      title: titleFor(s.category, ctx.property, ctx.unit, ctx.party),
      facts: { ...s.facts, afterHours },
      actions: [
        ...notify({ key: "urgent-ack", to: ctx.party, body: templates.urgentAck({ first: firstName(ctx.party), caseId: ctx.case.id, when }), purpose: "transactional", from: line(ctx, "sms"), inReplyTo: true }),
        workOrderAction(ctx, s),
      ],
      timers: afterHours ? [{ kind: "business_hours_dispatch", at: morning }] : [],
      decisions: [...s.decisions, afterHours ? `P2 after hours → acknowledge now, dispatch at ${formatDayTime(morning, tzone)}` : "P2 in business hours → dispatch now"],
    },
  ];
  if (!afterHours) fragments.push(startDispatch(ctx, s.trades[0], { urgent: true, category: s.category, room: s.facts.room }));
  if (a.signals.failedContact || a.signals.wantsHuman) fragments.push(alertCaseOwner(ctx, `Resident asked for a call back about ${ctx.case.id} (${CATEGORY_LABEL[s.category]}): “${ctx.event.payload.text}”`));
  return mergePlans(...fragments);
}

/** P3: acknowledge, open the work order, let business-hours scheduling take it. */
export function planRoutine(ctx, s) {
  const morning = nextBusinessMorning(ctx.now, tz(ctx), 9);
  return {
    status: "scheduled",
    priority: "P3",
    title: titleFor(s.category, ctx.property, ctx.unit, ctx.party),
    facts: s.facts,
    actions: [
      ...notify({ key: "routine-ack", to: ctx.party, body: templates.routineAck({ first: firstName(ctx.party), caseId: ctx.case.id }), purpose: "transactional", from: line(ctx, "sms"), inReplyTo: true }),
      workOrderAction(ctx, s),
    ],
    timers: [{ kind: "business_hours_dispatch", at: morning }],
    decisions: [...s.decisions, `P3 routine → work order now, vendor scheduling at ${formatDayTime(morning, tz(ctx))}`],
  };
}

/** Legal threat / rent withholding / health risk: vetted acknowledgement, model draft held for a person. */
export function planSensitive(ctx, s, a, models) {
  return mergePlans(
    {
      status: "human_review",
      priority: maxSeverity(s.severity, "P2"),
      title: titleFor(s.category, ctx.property, ctx.unit, ctx.party),
      facts: s.facts,
      actions: [workOrderAction(ctx, { ...s, severity: maxSeverity(s.severity, "P2") })],
      decisions: [...s.decisions],
    },
    sensitiveExtras(ctx, s, a, models)
  );
}

export function sensitiveExtras(ctx, s, a, models) {
  const manager = ctx.directory.staffWithTitle("Property Manager");
  const tzone = tz(ctx);
  const by = isBusinessHours(ctx.now, tzone) ? "within 2 hours" : `by ${formatDayTime(nextBusinessMorning(ctx.now, tzone, 9), tzone)}`;
  const concerns = sensitiveConcerns(a);
  const draft = models.draft;
  const actions = [
    ...notify({ key: "sensitive-ack", to: ctx.party, body: templates.sensitiveAck({ first: firstName(ctx.party), caseId: ctx.case.id, manager: manager?.name ?? "our property manager", by }), purpose: "transactional", from: line(ctx, "sms"), inReplyTo: true }),
  ];
  const decisions = [`Sensitive (${concerns.join(", ")}) → vetted acknowledgement now; model-written reply waits for a person`];
  let brief;

  if (draft?.ok) {
    actions.push(
      ...notify({
        key: "sensitive-reply",
        to: ctx.party,
        body: draft.output.reply_to_resident,
        subject: `Your request — case ${ctx.case.id}`,
        purpose: "transactional",
        generated: true,
        inReplyTo: true, // it answers the resident's own message, so quiet hours don't hold it back
        label: `Drafted reply → ${ctx.party.name} (${draft.tier} model)`,
        from: line(ctx, "sms"),
      })
    );
    brief = `${draft.output.internal_brief}\nNext steps: ${draft.output.recommended_next_steps.join("; ")}`;
  } else {
    brief = `Sensitive ${CATEGORY_LABEL[s.category].toLowerCase()} report from ${ctx.party.name} (${ctx.property?.name} ${ctx.unit?.label}). Concerns: ${concerns.join(", ")}. Prior visits: ${priorHistory(ctx, s.category).length}. Message: “${ctx.event.payload.text}”`;
    decisions.push("Frontier model unavailable → the manager gets a deterministic brief and writes the reply");
  }
  if (manager) {
    actions.push({
      key: "manager-brief",
      connector: "email",
      operation: "sendEmail",
      label: `Brief → ${manager.name} (email)`,
      payload: { to: manager.email, subject: `[${ctx.case.id}] Sensitive: ${CATEGORY_LABEL[s.category]} — ${ctx.party.name}`, body: brief },
      recipient: { partyId: manager.id, role: "staff", name: manager.name },
      purpose: "internal",
    });
  }
  return { flags: { legalSensitive: true, needsHuman: true }, facts: { sensitivity: { concerns, brief } }, actions, decisions };
}

export function planNonMaintenance(ctx, t) {
  const tzone = tz(ctx);
  const by = isBusinessHours(ctx.now, tzone) ? "today" : `by ${formatDayTime(nextBusinessMorning(ctx.now, tzone, 10), tzone)}`;
  return {
    status: "human_review",
    priority: "P3",
    title: `Question from ${ctx.party.name}`,
    flags: { needsHuman: true },
    facts: { category: "non_maintenance", issueSummary: t.summary },
    actions: notify({ key: "general-ack", to: ctx.party, body: templates.generalAck({ first: firstName(ctx.party), by }), purpose: "transactional", from: line(ctx, "sms"), inReplyTo: true }),
    decisions: [`Not a maintenance issue (“${t.summary}”) → acknowledged and queued for the team`],
  };
}

export function planUnknownSender(ctx, d, models) {
  const severity = d.assessment.severity ?? (models.triage?.ok ? models.triage.output.urgency : null);
  const from = ctx.event.payload.from;
  const stranger = { id: null, role: "unknown", name: from, phone: from?.startsWith("+") ? from : null, email: from?.includes("@") ? from : null, attributes: {} };
  if (severity === "P1") {
    const ladder = ctx.directory.onCallLadder({ afterHours: !isBusinessHours(ctx.now, tz(ctx)) });
    return mergePlans(
      {
        status: "awaiting_info",
        priority: "P1",
        title: `Emergency from unknown sender ${from}`,
        facts: { severity, category: d.assessment.category, report: { text: ctx.event.payload.text, channel: ctx.event.payload.channel } },
        actions: notify({ key: "unknown-emergency", to: stranger, body: templates.unknownSenderEmergency({ caseId: ctx.case.id }), purpose: "emergency", inReplyTo: true }),
        decisions: ["P1 from an unknown sender → safety-first reply, ask for the address, page on-call"],
      },
      ladder.length ? startEscalation({ caseRecord: { ...ctx.case, priority: "P1" }, ladder, reason: "P1 from unknown sender", summary: `Possible emergency from unknown sender ${from}: “${ctx.event.payload.text}”`, now: ctx.now }) : null
    );
  }
  return {
    status: "awaiting_info",
    title: `Message from unknown sender ${from}`,
    actions: notify({ key: "unknown-ask", to: stranger, body: templates.unknownSenderAsk(), purpose: "transactional", inReplyTo: true }),
    decisions: ["Unknown sender, no emergency → ask who they are before doing anything else"],
  };
}

export function planSeverityIncrease(ctx, d, models, knowledge) {
  const a = d.assessment;
  const f = ctx.case.facts;
  const safety = safetyFor(a);
  const s = { severity: a.severity, category: a.category, trades: a.trades, safety, decisions: [d.summary], facts: { ...f, severity: a.severity, category: a.category, trades: a.trades, rulesFired: a.rulesFired, safety } };
  const fragments = [
    {
      priority: a.severity,
      facts: s.facts,
      actions: notify({
        key: "escalated-safety",
        to: ctx.party,
        body: templates.emergencyReply({ first: firstName(ctx.party), receivedAt: at(ctx, ctx.now), caseId: ctx.case.id, safety, shutoff: shutoffLocation(ctx, knowledge), dispatching: Boolean(a.trades[0]) }),
        purpose: "emergency",
        channels: ["sms", "email"],
        from: line(ctx, "sms"),
        inReplyTo: true,
      }),
    },
  ];
  if (!f.dispatch && a.trades[0]) fragments.push({ status: "dispatching" }, startDispatch(ctx, a.trades[0], { urgent: true, category: a.category, room: a.room }));
  if (!f.escalation?.active && !f.escalation?.ackedBy) {
    const ladder = ctx.directory.onCallLadder({ afterHours: !isBusinessHours(ctx.now, tz(ctx)) });
    if (ladder.length) fragments.push(startEscalation({ caseRecord: { ...ctx.case, priority: a.severity }, ladder, reason: "severity increased", summary: `${ctx.case.id} escalated to ${a.severity}: “${ctx.event.payload.text}”`, now: ctx.now }));
  } else {
    fragments.push(alertCaseOwner(ctx, `Severity raised to ${a.severity}: “${ctx.event.payload.text}”`));
  }
  return mergePlans(...fragments);
}
