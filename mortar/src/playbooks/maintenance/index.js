import { machine, ACTIVE_DISPATCH } from "./machine.js";
import { maintenanceTasks } from "./tasks.js";
import { decide } from "./decide.js";
import { CATEGORY_LABEL } from "./messages.js";
import { assessMessage } from "./rules.js";
import { mergePlans } from "../../core/plan.js";
import { HOUR, formatTime, formatDayTime } from "../../core/clock.js";
import { nextEscalation } from "../../core/escalation.js";
import { startDispatch, nextVendor, planVendorUpdate, planVendorLate } from "./dispatch.js";
import { planWantsHuman, planNewProblem, planCheckinReply, planResidentUpdate, planStaffAck, planOwnerMessage, planNeighborReply, planNeighborNoReply, planCheckinDue, planApproval, planRepairOrderCreated, planWorkOrderUpdate, planActionFailed } from "./follow-through.js";
import { ACK_MIN, titleFor } from "./helpers.js";
import { planNewIssue, planUnknownSender, planSeverityIncrease } from "./intake.js";

/**
 * MAINTENANCE & EMERGENCIES
 *
 * Owns a maintenance issue from the first message to the closed work order:
 * triage → safety guidance → work order → vendor dispatch ladder → on-call escalation
 * ladder → unit-above check → follow-through (ETAs, arrival, findings) → follow-up
 * repairs with owner approval → resolution. Every step is driven by events and
 * durable timers, so nothing depends on anyone watching an inbox.
 *
 *   decide.js          Stage 3 — classify the situation with rules (model only if needed)
 *   intake.js          new issues: P1 / P2 / P3 / sensitive / unknown sender
 *   dispatch.js        the vendor ladder, ETAs, arrival, findings, follow-up repairs
 *   follow-through.js  check-ins, unit above, on-call ACKs, approvals, work-order results
 *   rules.js           the deterministic lexicon and reply parsers
 *   tasks.js           the four model tasks — and why each needs a model
 *   messages.js        vetted templates (safety steps are never model-written)
 */
export const maintenance = {
  name: "maintenance",
  casePrefix: "MC",
  machine,
  tasks: maintenanceTasks,
  claim,
  open,
  decide,
  plan,
  summarize,
};

// ═══ Stage 2 — State: which case does this event belong to? ═══════════════════

const ATTACH_WINDOW_MS = 48 * HOUR;

function claim(event, { sender, directory, store, now }) {
  if (event.type === "workorder.updated") {
    const c = store.findCaseByExternal("rentvineWorkOrderId", event.payload.workOrderId) ?? store.findCaseByExternal("repairWorkOrderId", event.payload.workOrderId);
    return c ? { caseRecord: c } : null;
  }
  if (!["message.received", "call.gather", "call.status"].includes(event.type)) return null;

  const line = directory.line(event.payload.to);
  const openCases = (predicate) => store.openCasesWhere(predicate, { playbook: "maintenance" });

  if (!sender) return line?.playbook === "maintenance" ? { open: true } : null;

  switch (sender.role) {
    case "tenant": {
      const own = store.findOpenCase({ playbook: "maintenance", partyId: sender.id });
      const recent = own && (own.status !== "resolved" || Date.parse(own.updatedAt) > now.getTime() - ATTACH_WINDOW_MS);
      if (own && recent) return { caseRecord: own };
      const asked = openCases((c) => c.facts.neighborCheck?.partyId === sender.id && c.facts.neighborCheck.status === "requested")[0];
      if (asked) return { caseRecord: asked };
      if (line && line.playbook !== "maintenance") return null;
      return { open: true };
    }
    case "vendor": {
      const job = openCases((c) => [c.facts.dispatch?.current, c.facts.dispatch?.assigned].includes(sender.id))[0];
      return job ? { caseRecord: job } : null;
    }
    case "staff": {
      const paging = openCases((c) => c.facts.escalation?.active && c.facts.escalation.ladder.includes(sender.id))[0];
      return paging ? { caseRecord: paging } : null;
    }
    case "owner": {
      const props = new Set(store.listProperties().filter((p) => p.ownerId === sender.id).map((p) => p.id));
      const theirs = openCases((c) => props.has(c.propertyId))[0];
      return theirs ? { caseRecord: theirs } : null;
    }
    default:
      return null;
  }
}

function open({ event, sender, directory }) {
  if (event.type !== "message.received") return null;
  const a = assessMessage(event.payload.text);
  const unit = directory.unit(sender?.unitId);
  const property = directory.property(sender?.propertyId);
  return {
    title: titleFor(a.category, property, unit, sender),
    partyId: sender?.id ?? null,
    propertyId: sender?.propertyId ?? null,
    unitId: sender?.unitId ?? null,
    priority: a.severity,
  };
}

// ═══ Stage 6 — Action: route the situation to its handler ═════════════════════

function plan(ctx, decision, { models, knowledge }) {
  const handler = HANDLERS[decision.kind];
  return handler ? handler(ctx, decision, models, knowledge) : { decisions: [decision.summary] };
}

const HANDLERS = {
  consent: (ctx, d) => ({ partyUpdates: d.partyUpdates, decisions: [d.summary] }),
  approval: planApproval,
  new_issue: planNewIssue,
  unknown_sender: planUnknownSender,
  severity_increase: planSeverityIncrease,
  wants_human: planWantsHuman,
  new_problem: planNewProblem,
  pleasantry: (ctx, d) => ({ decisions: [d.summary] }),
  checkin_reply: planCheckinReply,
  resident_update: planResidentUpdate,
  vendor_update: planVendorUpdate,
  staff_ack: planStaffAck,
  staff_note: (ctx, d) => ({ decisions: [d.summary] }),
  owner_message: planOwnerMessage,
  neighbor_reply: planNeighborReply,
  vendor_timeout: (ctx) => nextVendor(ctx, "timeout"),
  escalation_timeout: (ctx) => nextEscalation({ caseRecord: ctx.case, getParty: ctx.directory.party, now: ctx.now, ackMinutes: ACK_MIN }),
  neighbor_no_reply: planNeighborNoReply,
  checkin_due: planCheckinDue,
  vendor_late: planVendorLate,
  dispatch_now: (ctx) => mergePlans({ status: "dispatching" }, startDispatch(ctx, ctx.case.facts.trades?.[0], { urgent: ctx.case.priority !== "P3" })),
  close: () => ({ status: "closed", close: true, cancelTimers: "all", decisions: ["Resolved with no new activity for 72 h — closing"] }),
  work_order_created: (ctx, d) => ({ external: { rentvineWorkOrderId: d.workOrderId }, decisions: [d.summary] }),
  repair_order_created: planRepairOrderCreated,
  workorder_update: planWorkOrderUpdate,
  action_failed: planActionFailed,
  stale_timer: (ctx, d) => ({ decisions: [d.summary] }),
  noop: (ctx, d) => ({ decisions: [d.summary] }),
};

// ═══ Summary — rebuilt from structured facts by code, never by a model ═══════

function summarize(c, directory) {
  const f = c.facts;
  const timeZone = directory.property(c.propertyId)?.timezone ?? "UTC";
  const name = (id) => directory.party(id)?.name ?? id;
  const parts = [machine.labels[c.status] ?? c.status, `${c.priority ?? ""} ${CATEGORY_LABEL[f.category] ?? "Request"}${f.room ? ` (${f.room})` : ""}`.trim()];
  const d = f.dispatch;
  if (ACTIVE_DISPATCH.has(c.status)) {
    if (d?.assigned) parts.push(`Vendor: ${name(d.assigned)}${d.onSiteAt ? " on site" : d.etaAt ? `, ETA ${formatTime(new Date(d.etaAt), timeZone)}` : ", accepted"}`);
    else if (d?.current) parts.push(`Dispatching ${name(d.current)} (${d.index + 1}/${d.queue.length})`);
    else if (d?.exhausted) parts.push("No vendor accepted — manual dispatch");
  }
  const e = f.escalation;
  if (e?.ackedBy) parts.push(`Owned by ${e.ackedByName}`);
  else if (e?.active) parts.push(`Paging on-call (level ${e.level + 1})`);
  if (f.neighborCheck) parts.push(`Unit above: ${{ requested: "asked", replied: (f.neighborCheck.finding ?? "").replace("_", " "), no_reply: "no reply" }[f.neighborCheck.status]}`);
  if (f.resolution?.cause) parts.push(`Cause: ${f.resolution.cause}${f.resolution.sourceUnit ? ` (${f.resolution.sourceUnit})` : ""}`);
  if (f.repair) parts.push(`Repair ${formatDayTime(new Date(f.repair.scheduledFor), timeZone)}`);
  if (c.flags?.legalSensitive) parts.push("Sensitive — human review");
  if (c.external?.rentvineWorkOrderId) parts.push(c.external.rentvineWorkOrderId);
  return parts.join(" · ");
}
