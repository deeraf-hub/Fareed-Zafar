import { CATEGORY_LABEL } from "./messages.js";
import { assessMessage, isHigher, needsTriageModel, needsVendorReport, parseCheckinReply, parseNeighborReply, parseVendorReply, isPleasantry } from "./rules.js";
import { isAck } from "../../core/escalation.js";
import { consentChange } from "../shared/consent.js";
import { VENDOR_RESPONSE_MIN, ACK_MIN, NEIGHBOR_REPLY_MIN, homeFacts, structuredContext, retrievalFor, sensitiveInput } from "./helpers.js";

/**
 * Maintenance — Stage 3, deterministic logic: "what situation is this?"
 *
 * Every inbound event is classified into a situation (`kind`) by rules alone. A model
 * is requested (`needs`) only when the rules genuinely can't read the input — and the
 * reason a model was NOT needed is recorded too (`modelSkipReason`).
 */

export function decide(ctx) {
  const { event, sender } = ctx;

  const consent = consentChange(event, sender, ctx.now);
  if (consent) return { kind: "consent", summary: consent.summary, rules: [consent.rule], partyUpdates: consent.partyUpdates };
  if (ctx.approvalDecision) {
    return { kind: "approval", summary: `Approval ${ctx.approvalDecision.decision} by ${ctx.approvalDecision.by}`, rules: ["approval_decided"] };
  }

  switch (event.type) {
    case "timer.fired":
      return decideTimer(ctx);
    case "action.completed":
      return decideActionCompleted(ctx);
    case "action.failed":
      return { kind: "action_failed", summary: `Permanently failed: ${event.payload.label}`, rules: ["dead_letter"] };
    case "workorder.updated":
      return { kind: "workorder_update", summary: `Rentvine work order ${event.payload.workOrderId} → ${event.payload.status}`, rules: ["rentvine_webhook"] };
    case "call.status":
      return { kind: "noop", summary: `Call status: ${event.payload.status}`, rules: ["call_status"] };
    default:
      break;
  }

  switch (sender?.role) {
    case "vendor":
      return decideVendor(ctx);
    case "staff":
      return decideStaff(ctx);
    case "owner":
      return { kind: "owner_message", summary: "Owner message → forwarded to the person handling the case", rules: ["owner_message"] };
    case "tenant":
      if (ctx.case.partyId && sender.id !== ctx.case.partyId) return decideNeighbor(ctx);
      return decideResident(ctx);
    default:
      return decideResident(ctx); // unknown sender on the maintenance line
  }
}

export function decideResident(ctx) {
  const text = ctx.event.payload.text ?? "";
  const a = assessMessage(text, { hasPhotos: (ctx.event.payload.media ?? []).length > 0, outsideTempF: ctx.directory?.outsideTempF(ctx.now) ?? null });

  if (!ctx.isNew) {
    if (isPleasantry(text)) return { kind: "pleasantry", summary: "Pleasantry — no reply needed (answering “thanks” is how agents loop)", rules: ["pleasantry"] };
    const answer = parseCheckinReply(text);
    if (answer && ctx.case.facts.checkin?.asked) {
      return { kind: "checkin_reply", answer, summary: `Check-in answer parsed by rule: ${answer.replace("_", " ")}`, rules: [`checkin_${answer}`] };
    }
    if (a.severity && isHigher(a.severity, ctx.case.priority ?? "P3")) {
      return { kind: "severity_increase", assessment: a, summary: `New information raises severity to ${a.severity} (${a.rulesFired.join(", ")})`, rules: a.rulesFired, retrieve: retrievalFor(ctx, a), context: structuredContext(ctx, a) };
    }
    if (a.signals.wantsHuman || a.signals.failedContact) {
      return { kind: "wants_human", assessment: a, summary: "Resident wants a person → route to whoever owns the case", rules: a.rulesFired };
    }
    if (a.severity || a.signals.reportsProblem) {
      return { kind: "new_problem", assessment: a, summary: "Resident mentions another problem → forwarded to whoever owns the case", rules: a.rulesFired };
    }
    return {
      kind: "resident_update",
      summary: "Free-text update the rules can't classify",
      rules: ["no_rule_matched"],
      needs: [
        {
          task: "maintenance.classify_reply",
          as: "reply",
          input: { text, who: "resident of the affected unit", askedFor: ctx.case.facts.checkin?.asked ? "whether water is still coming in" : "nothing specific", caseSummary: ctx.case.summary },
        },
      ],
    };
  }

  // A new issue.
  const needs = [];
  if (needsTriageModel(a)) needs.push({ task: "maintenance.triage", as: "triage", input: { text, home: homeFacts(ctx) } });
  if (a.sensitive) needs.push({ task: "maintenance.sensitive_reply", as: "draft", input: (knowledge) => sensitiveInput(ctx, a, knowledge) });

  return {
    kind: ctx.party ? "new_issue" : "unknown_sender",
    assessment: a,
    summary: a.severity
      ? `${a.severity} · ${CATEGORY_LABEL[a.category]} — ${a.rulesFired.join(", ")}`
      : `No severity rule matched${a.rulesFired.length ? ` (signals: ${a.rulesFired.join(", ")})` : ""}`,
    rules: a.rulesFired.length ? a.rulesFired : ["no_rule_matched"],
    needs,
    retrieve: retrievalFor(ctx, a),
    context: structuredContext(ctx, a),
    modelSkipReason: `not needed — rule "${a.rulesFired[0]}" set ${a.severity}; safety steps come from a vetted template`,
  };
}

export function decideVendor(ctx) {
  const { event } = ctx;
  const gather = event.type === "call.gather";
  const text = gather ? "" : event.payload.text ?? "";
  const parsed = parseVendorReply(text, gather ? event.payload.digits : null);
  const needsReport = needsVendorReport(parsed, { keypad: gather });
  return {
    kind: "vendor_update",
    parsed,
    summary: parsed.status
      ? `${ctx.sender.name}: ${parsed.status.replace("_", " ")} (rule${parsed.etaMinutes ? `, ETA ${parsed.etaMinutes} min` : ""}${parsed.estimateUsd ? `, $${parsed.estimateUsd}` : ""})`
      : `${ctx.sender.name}: message not parseable by rules`,
    rules: [parsed.status ? `vendor_${parsed.status}` : "no_rule_matched"],
    needs: needsReport
      ? [{ task: "maintenance.vendor_report", as: "report", input: { text, job: { issue: CATEGORY_LABEL[ctx.case.facts.category], unit: ctx.unit?.label, address: ctx.property?.address } } }]
      : [],
    modelSkipReason: `not needed — ${gather ? `keypad "${event.payload.digits}"` : `"${text}"`} parsed by rule`,
  };
}

export function decideStaff(ctx) {
  const input = ctx.event.type === "call.gather" ? ctx.event.payload.digits : ctx.event.payload.text;
  if (isAck(input) && ctx.case.facts.escalation?.active) {
    return { kind: "staff_ack", summary: `${ctx.sender.name} acknowledged (${ctx.event.type === "call.gather" ? "pressed 1" : `“${input}”`})`, rules: ["escalation_ack"] };
  }
  return { kind: "staff_note", summary: `Note from ${ctx.sender.name}`, rules: ["staff_note"] };
}

export function decideNeighbor(ctx) {
  const text = ctx.event.payload.text ?? "";
  const finding = parseNeighborReply(text);
  if (finding) return { kind: "neighbor_reply", finding, summary: `Unit-above reply parsed by rule: ${finding.replace("_", " ")}`, rules: [`neighbor_${finding}`] };
  return {
    kind: "neighbor_reply",
    finding: null,
    summary: "Hedged reply from the unit above — rules won't guess",
    rules: ["hedged_reply"],
    needs: [
      {
        task: "maintenance.classify_reply",
        as: "reply",
        input: { text, who: "resident of the unit directly above the leak", askedFor: "check under sinks, toilet, tub and water heater for water", caseSummary: ctx.case.summary },
      },
    ],
  };
}

export function decideTimer(ctx) {
  const { kind, ...payload } = ctx.event.payload;
  const f = ctx.case.facts;
  const stale = (why) => ({ kind: "stale_timer", summary: `Timer “${kind.replace(/_/g, " ")}” is stale — ${why}. Nothing to do.`, rules: ["stale_timer"] });
  const fresh = (k, summary) => ({ kind: k, summary, rules: [`timer_${kind}`], payload });

  switch (kind) {
    case "vendor_response":
      if (f.dispatch?.assigned || f.dispatch?.current !== payload.vendorId) return stale("the vendor already answered");
      return fresh("vendor_timeout", `${ctx.directory.party(payload.vendorId)?.name} didn't answer within ${VENDOR_RESPONSE_MIN} min`);
    case "escalation_ack":
      if (!f.escalation?.active) return stale("someone already acknowledged");
      if (payload.level !== "all" && payload.level !== f.escalation.level) return stale("superseded by a later page");
      return fresh("escalation_timeout", `No acknowledgement within ${ACK_MIN} min`);
    case "neighbor_check":
      if (f.neighborCheck?.status !== "requested") return stale("the unit above already replied");
      return fresh("neighbor_no_reply", `No reply from the unit above within ${NEIGHBOR_REPLY_MIN} min`);
    case "tenant_checkin":
      if (!["dispatching", "vendor_assigned", "on_site"].includes(ctx.case.status)) return stale(`case is ${ctx.case.status}`);
      return fresh("checkin_due", "Time to check in with the resident");
    case "vendor_arrival":
      if (ctx.case.status !== "vendor_assigned") return stale("the vendor is already on site");
      return fresh("vendor_late", "Vendor hasn't confirmed arrival 15 min after ETA");
    case "business_hours_dispatch":
      if (ctx.case.status !== "scheduled") return stale(`case is ${ctx.case.status}`);
      return fresh("dispatch_now", "Business hours — dispatching the scheduled job");
    case "close_case":
      if (ctx.case.status !== "resolved") return stale("the case was reopened");
      return fresh("close", "Resolved 72 h ago with no new activity");
    default:
      return stale("unknown timer");
  }
}

export function decideActionCompleted(ctx) {
  const { key, result } = ctx.event.payload;
  if (key === "work-order") return { kind: "work_order_created", workOrderId: result.workOrderId, summary: `Rentvine work order ${result.workOrderId} created`, rules: ["action_result"] };
  if (key?.startsWith("repair-wo")) return { kind: "repair_order_created", workOrderId: result.workOrderId, key, summary: `Rentvine repair work order ${result.workOrderId} created`, rules: ["action_result"] };
  return { kind: "noop", summary: "Action completed", rules: ["action_result"] };
}
