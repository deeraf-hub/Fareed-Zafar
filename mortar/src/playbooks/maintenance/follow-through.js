import { templates } from "./messages.js";
import { mergePlans } from "../../core/plan.js";
import { lowerFirst } from "../../core/format.js";
import { formatDayTime, nextBusinessMorning } from "../../core/clock.js";
import { acknowledgeEscalation } from "../../core/escalation.js";
import { notify, sms, call, firstName } from "../shared/actions.js";
import { nextVendor } from "./dispatch.js";
import { NEIGHBOR_REPLY_MIN, tz, at, later, line, caseOwner, alertCaseOwner, tellAssignedVendor } from "./helpers.js";

/**
 * Maintenance — follow-through: everything after the first response. Check-ins, the
 * unit above, on-call acknowledgements, owner messages, approvals, work-order results,
 * and fallbacks when an action fails permanently.
 */

export function planWantsHuman(ctx) {
  const esc = ctx.case.facts.escalation;
  const owner = esc?.ackedBy ? ctx.directory.party(esc.ackedBy) : null;
  if (owner) {
    return {
      actions: [
        sms({ key: "callback-request", to: owner, body: templates.staffAlert({ caseId: ctx.case.id, text: `${ctx.party.name} asked for a call: “${ctx.event.payload.text}”` }), purpose: "emergency" }),
        ...notify({ key: "human-on-it", to: ctx.party, body: templates.humanOnIt({ staff: owner.name }), purpose: "transactional", from: line(ctx, "sms"), inReplyTo: true }),
      ],
      decisions: [`Resident wants a person → ${owner.name} (who owns the case) asked to call`],
    };
  }
  if (esc?.active) return { decisions: ["Resident wants a person — the on-call ladder is already paging"], actions: notify({ key: "paging-now", to: ctx.party, body: "Our on-call manager is being paged right now and will call you.", purpose: "transactional", from: line(ctx, "sms"), inReplyTo: true }) };
  return mergePlans(alertCaseOwner(ctx, `${ctx.party.name} asked for a call about ${ctx.case.id}: “${ctx.event.payload.text}”`), {
    flags: { needsHuman: true },
    actions: notify({ key: "callback-ack", to: ctx.party, body: "Thanks — I've asked our team to call you back.", purpose: "transactional", from: line(ctx, "sms"), inReplyTo: true }),
  });
}

/** Another problem mentioned inside an open case: a person sees it instead of the agent guessing a new case. */
export function planNewProblem(ctx) {
  return mergePlans(alertCaseOwner(ctx, `${ctx.party.name} mentioned another problem (${ctx.case.id}): “${ctx.event.payload.text}”`), {
    actions: notify({ key: "new-problem-ack", to: ctx.party, body: "Thanks — I've passed that to the person handling your case so it doesn't get lost.", purpose: "transactional", from: line(ctx, "sms"), inReplyTo: true }),
    decisions: ["Another problem mentioned in an open case → forwarded to the case owner"],
  });
}

export function planCheckinReply(ctx, d) {
  const f = ctx.case.facts;
  const checkin = { ...f.checkin, asked: false, answer: d.answer, answeredAt: ctx.now.toISOString() };
  if (d.answer === "stopped") {
    const confirmed = ["mitigated", "repair_scheduled"].includes(ctx.case.status);
    return mergePlans(
      { facts: { checkin }, decisions: [confirmed ? "Resident confirms the water has stopped" : "Resident reports the water stopped — job still needs the plumber's assessment"] },
      confirmed ? null : tellAssignedVendor(ctx, `Resident in ${ctx.unit?.label} reports the water has stopped for now. Please still assess the source.`)
    );
  }
  // Still leaking.
  const reopened = ["mitigated", "repair_scheduled"].includes(ctx.case.status);
  return mergePlans(
    {
      facts: { checkin },
      status: reopened ? "dispatching" : undefined,
      actions: notify({ key: "still-leaking", to: ctx.party, body: templates.stillLeaking(), purpose: "emergency", from: line(ctx, "sms"), inReplyTo: true }),
      decisions: [reopened ? "Water is back after mitigation → reopening dispatch" : "Resident says it's still leaking → urgent nudge to vendor and on-call"],
    },
    tellAssignedVendor(ctx, `URGENT ${ctx.case.id}: resident reports water is STILL coming in.`),
    alertCaseOwner(ctx, `Resident reports water still coming in (${ctx.case.id}).`)
  );
}

/**
 * What a model-read resident update means for the case. Anything that might need a
 * judgment call — a question, a new issue, a hedged "still feels wet" — goes to a person.
 */
export function residentReplyRoute(reply) {
  switch (reply?.intent) {
    case "issue_resolved":
      return "stopped";
    case "still_happening":
      return "still_leaking";
    case "thanks":
      return "thanks";
    case "question":
    case "new_issue":
    case "possible_leak":
      return "forward";
    default:
      return reply?.needs_human ? "forward" : "log";
  }
}

/** The unit above: the rule's reading, else the model's, else "unclear" (a person looks). */
export const neighborFinding = (ruleFinding, reply) => ruleFinding ?? { possible_leak: "possible_leak", no_leak_found: "no_leak" }[reply?.intent] ?? "unclear";

export function planResidentUpdate(ctx, d, models) {
  const reply = models.reply?.ok ? models.reply.output : null;
  switch (residentReplyRoute(reply)) {
    case "stopped":
      return planCheckinReply(ctx, { answer: "stopped" });
    case "still_leaking":
      return planCheckinReply(ctx, { answer: "still_leaking" });
    case "thanks":
      return { decisions: ["Model read it as thanks — no reply needed"] };
    case "forward":
      return mergePlans(alertCaseOwner(ctx, `${ctx.party.name} (${reply.intent.replace("_", " ")}): “${ctx.event.payload.text}”`), {
        flags: reply.intent === "new_issue" ? { needsHuman: true } : {},
        actions: notify({ key: "question-ack", to: ctx.party, body: "Thanks — I've passed that to the person handling your case.", purpose: "transactional", from: line(ctx, "sms"), inReplyTo: true }),
        decisions: [`Model: ${reply.intent.replace("_", " ")} → forwarded to the case owner`],
      });
    default:
      return {
        decisions: [reply ? `Model: ${reply.intent} — “${reply.summary}” (logged)` : "No model available → logged for the case owner"],
        flags: reply ? {} : { needsHuman: true },
      };
  }
}

export function planStaffAck(ctx) {
  const staff = ctx.sender;
  const f = ctx.case.facts;
  const vendor = ctx.directory.party(f.dispatch?.assigned ?? f.dispatch?.current);
  const vendorStatus = f.dispatch?.assigned
    ? `${vendor?.name} accepted${f.dispatch.etaAt ? `, ETA ${at(ctx, new Date(f.dispatch.etaAt))}` : ""} — please send them access details`
    : vendor
      ? `waiting on ${vendor.name} to accept`
      : "no vendor yet";
  const upstairs = f.neighborCheck ? ` Unit above: ${f.neighborCheck.status === "replied" ? f.neighborCheck.finding.replace("_", " ") : "asked, no reply yet"}.` : "";
  const brief = `You own this: ${ctx.case.title}. Vendor: ${vendorStatus}.${upstairs} Resident: ${ctx.party?.name ?? "unknown"} ${ctx.party?.phone ?? ""}`.trim();
  return mergePlans(acknowledgeEscalation({ caseRecord: ctx.case, staff, now: ctx.now }), {
    actions: [
      sms({ key: "ack-brief", to: staff, body: templates.staffAlert({ caseId: ctx.case.id, text: brief }), purpose: "emergency", from: line(ctx, "sms") }),
      ...(ctx.party ? notify({ key: "human-on-it", to: ctx.party, body: templates.humanOnIt({ staff: staff.name }), purpose: "emergency", from: line(ctx, "sms") }) : []),
    ],
    decisions: [`${staff.name} owns the case → ladder stopped, resident told a person is on it`],
  });
}

export function planOwnerMessage(ctx) {
  return mergePlans(alertCaseOwner(ctx, `Owner ${ctx.sender.name} wrote: “${ctx.event.payload.text}”`), { decisions: ["Owner message forwarded — owner relationships stay with people"] });
}

export function requestNeighborCheck(ctx) {
  const above = ctx.directory.unitAbove(ctx.unit);
  const neighbor = above ? ctx.directory.tenantsOf(above.id)[0] : null;
  if (!above || !neighbor) return { decisions: [above ? `Unit above (${above.label}) is vacant — plumber to check it` : "No unit above — skip neighbor check"] };
  return {
    facts: { neighborCheck: { unitId: above.id, partyId: neighbor.id, status: "requested", at: ctx.now.toISOString() } },
    actions: [sms({ key: "neighbor-check", to: neighbor, body: templates.neighborCheck({ first: firstName(neighbor) }), purpose: "emergency", from: line(ctx, "sms"), label: `Ask ${neighbor.name} (${above.label}, unit above) to check for leaks` })],
    timers: [{ kind: "neighbor_check", at: later(ctx, NEIGHBOR_REPLY_MIN) }],
    decisions: [`Stacked building → asking the unit above (${above.label}) to check for a leak (no names shared)`],
  };
}

export function planNeighborReply(ctx, d, models) {
  const reply = models.reply?.ok ? models.reply.output : null;
  const finding = neighborFinding(d.finding, reply);
  const f = ctx.case.facts;
  const neighbor = ctx.sender;
  const above = ctx.directory.unit(f.neighborCheck?.unitId);
  const note = reply?.summary ?? ctx.event.payload.text;
  const base = {
    facts: { neighborCheck: { ...f.neighborCheck, status: "replied", finding, note, at: ctx.now.toISOString() } },
    cancelTimers: ["neighbor_check"],
  };
  if (finding === "no_leak") {
    return mergePlans(base, { actions: [sms({ key: "neighbor-thanks", to: neighbor, body: templates.neighborThanks(), purpose: "transactional", from: line(ctx, "sms"), inReplyTo: true })], decisions: [`Unit above (${above?.label}) reports no leak`] });
  }
  if (finding === "leak_found" || finding === "possible_leak") {
    return mergePlans(
      base,
      {
        actions: [sms({ key: "neighbor-close-valve", to: neighbor, body: templates.neighborLeakFound(), purpose: "emergency", from: line(ctx, "sms"), inReplyTo: true })],
        decisions: [`Unit above (${above?.label}) reports ${finding === "possible_leak" ? "possible" : "a"} leak → vendor told to check ${above?.label} first`],
      },
      tellAssignedVendor(ctx, templates.vendorNeighborUpdate({ caseId: ctx.case.id, aboveUnit: above?.label, finding: note })),
      alertCaseOwner(ctx, `Unit above (${above?.label}) reports ${finding.replace("_", " ")}: “${ctx.event.payload.text}”`)
    );
  }
  return mergePlans(base, alertCaseOwner(ctx, `Unclear reply from ${above?.label}: “${ctx.event.payload.text}”`), { decisions: ["Unclear reply from the unit above → forwarded to the case owner"] });
}

/** Nobody answered upstairs: entering an occupied unit needs a person's approval. */
export function planNeighborNoReply(ctx) {
  const f = ctx.case.facts;
  const above = ctx.directory.unit(f.neighborCheck.unitId);
  const neighbor = ctx.directory.party(f.neighborCheck.partyId);
  const approver = caseOwner(ctx);
  const vendor = ctx.directory.party(f.dispatch?.assigned ?? f.dispatch?.current);
  const reason = `Emergency entry into occupied unit ${above.label} needs on-call manager approval`;
  const held = [
    sms({ key: "entry-notice", to: neighbor, body: `Hi ${firstName(neighbor)}, due to an active leak below your unit, our plumber needs to enter ${above.label} to stop it, under the emergency-entry terms of your lease. We're sorry for the disruption.`, purpose: "emergency", from: line(ctx, "sms"), requiresApproval: reason, approverId: approver?.id }),
  ];
  if (vendor) held.push(sms({ key: "entry-approved-vendor", to: vendor, body: `${ctx.case.id}: entry to ${above.label} is approved. Access details will come from the on-call manager.`, purpose: "emergency", from: line(ctx, "sms"), requiresApproval: reason, approverId: approver?.id }));
  return {
    facts: { neighborCheck: { ...f.neighborCheck, status: "no_reply" } },
    actions: [
      ...held,
      ...(approver ? [sms({ key: "entry-approval-request", to: approver, body: `${ctx.case.id}: no reply from ${above.label} (unit above the leak). Approve emergency entry for the plumber? Reply YES or NO.`, purpose: "emergency", from: line(ctx, "sms") })] : []),
    ],
    decisions: [`No reply from ${above.label} → emergency entry requested; waits for ${approver?.name ?? "a manager"}'s approval`],
  };
}

export function planCheckinDue(ctx) {
  if (ctx.case.facts.checkin?.asked) return { decisions: ["Check-in already pending — not asking twice"] };
  return {
    facts: { checkin: { asked: true, at: ctx.now.toISOString() } },
    actions: notify({ key: "checkin", to: ctx.party, body: templates.checkin({ caseId: ctx.case.id }), purpose: "emergency", from: line(ctx, "sms") }),
    decisions: ["30-minute check-in with the resident (reply 1 / 2 is parsed by rule)"],
  };
}

export function planApproval(ctx) {
  const { approval, decision, by } = ctx.approvalDecision;
  const repair = approval.actions.some((a) => a.key.startsWith("repair-wo"));
  if (decision === "approved") return {}; // the pipeline releases the held actions and logs the approval
  return mergePlans(alertCaseOwner(ctx, `${by} declined: ${approval.summary}. ${repair ? "Please call the owner to agree next steps." : "Please follow up."}`), {
    flags: { needsHuman: true },
    decisions: [`${by} declined → a person follows up`],
  });
}

export function planRepairOrderCreated(ctx, d) {
  const i = Number(d.key.split("-").pop());
  const work = ctx.case.facts.resolution?.followUps?.[i];
  const when = nextBusinessMorning(ctx.now, tz(ctx), 10);
  return {
    status: "repair_scheduled",
    external: { repairWorkOrderId: d.workOrderId },
    facts: { repair: { workOrderId: d.workOrderId, scheduledFor: when.toISOString(), description: work?.description ?? "Follow-up repair" } },
    actions: notify({ key: `repair-scheduled-${i}`, to: ctx.party, body: templates.repairScheduled({ when: formatDayTime(when, tz(ctx)), work: lowerFirst(work?.description ?? "follow-up repair") }), purpose: "transactional", from: line(ctx, "sms") }),
    decisions: [`Repair work order ${d.workOrderId} created → scheduled ${formatDayTime(when, tz(ctx))}, resident told`],
  };
}

export function planWorkOrderUpdate(ctx) {
  const { workOrderId, status } = ctx.event.payload;
  if (status !== "completed") return { decisions: [`Rentvine: ${workOrderId} is now ${status}`] };
  const isRepair = ctx.case.external.repairWorkOrderId === workOrderId;
  if (!isRepair && ctx.case.external.repairWorkOrderId) return { decisions: [`Original work order ${workOrderId} completed — repair order still open`] };
  const owner = ctx.directory.party(ctx.property?.ownerId);
  return {
    status: "resolved",
    actions: [
      ...notify({ key: "resolved", to: ctx.party, body: templates.resolved({ caseId: ctx.case.id }), purpose: "transactional", from: line(ctx, "sms") }),
      ...(owner ? notify({ key: "owner-resolved", to: owner, body: templates.ownerUpdate({ first: firstName(owner), property: ctx.property.name, unit: ctx.unit?.label, text: `repairs are complete and case ${ctx.case.id} is resolved.` }), purpose: "transactional" }) : []),
    ],
    timers: [{ kind: "close_case", at: later(ctx, 72 * 60) }],
    decisions: [`Rentvine reports ${workOrderId} completed → resolved; resident and owner told`],
  };
}

export function planActionFailed(ctx) {
  const { key, operation, error } = ctx.event.payload;
  const f = ctx.case.facts;
  if (key?.startsWith("dispatch-") && f.dispatch?.current && key.includes(f.dispatch.current) && !f.dispatch.assigned) {
    return mergePlans(nextVendor(ctx, "unreachable"), { decisions: [`Couldn't reach vendor (${error}) → next vendor`] });
  }
  if (key === "emergency-reply-sms" && ctx.party?.phone) {
    return {
      actions: [call({ key: "emergency-reply-voice", to: ctx.party, say: templates.emergencyVoice({ caseId: ctx.case.id, safety: f.safety, shutoff: f.shutoff }), gather: { ref: "resident" }, caseId: ctx.case.id, purpose: "emergency" })],
      decisions: ["Emergency SMS failed permanently → calling the resident instead"],
    };
  }
  return mergePlans(alertCaseOwner(ctx, `Action failed permanently (${operation}): ${error}`), { flags: { needsHuman: true }, decisions: [`${operation} failed permanently → flagged for a person`] });
}
