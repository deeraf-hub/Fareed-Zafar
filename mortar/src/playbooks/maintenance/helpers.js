import { usd } from "../../core/format.js";
import { templates, CATEGORY_LABEL } from "./messages.js";
import { isBusinessHours } from "../../core/directory.js";
import { MINUTE, formatTime, formatDayTime, nextBusinessMorning } from "../../core/clock.js";
import { notify, sms, call, firstName } from "../shared/actions.js";

/**
 * Maintenance — shared helpers: timing constants, time formatting, who owns the case,
 * work-order actions, owner/staff/vendor notifications, and the structured context
 * (SQL lookups) and retrieval requests the decision step asks for.
 */

export const VENDOR_RESPONSE_MIN = 10;

export const ACK_MIN = 10;

export const NEIGHBOR_REPLY_MIN = 15;

export const CHECKIN_MIN = 30;

export const tz = (ctx) => ctx.property?.timezone ?? "America/Chicago";

export const at = (ctx, date) => formatTime(date, tz(ctx));

export const later = (ctx, minutes) => new Date(ctx.now.getTime() + minutes * MINUTE);

export const line = (ctx, channel) => ctx.directory.lineAddress("maintenance", channel);

export function titleFor(category, property, unit, party) {
  const where = [property?.name, unit?.label].filter(Boolean).join(" ");
  return `${CATEGORY_LABEL[category] ?? "Maintenance request"}${where ? ` — ${where}` : party ? ` — ${party.name}` : ""}`;
}

export function homeFacts(ctx) {
  return {
    type: ctx.property?.kind?.replace("_", " "),
    floor: ctx.unit?.floor,
    unit_above: ctx.directory.unitAbove(ctx.unit) ? "yes" : "no",
  };
}

export function structuredContext(ctx, a) {
  const afterHours = !isBusinessHours(ctx.now, tz(ctx));
  const above = ctx.directory.unitAbove(ctx.unit);
  const trade = a.trades[0];
  return {
    afterHours,
    property: ctx.property ? `${ctx.property.name} (${ctx.property.kind.replace("_", " ")})` : "unknown",
    unit: ctx.unit ? `${ctx.unit.label}, floor ${ctx.unit.floor}` : "unknown",
    unitAbove: above ? `${above.label}${ctx.directory.tenantsOf(above.id).length ? " (occupied)" : " (vacant)"}` : "none",
    ownerApprovalLimit: ctx.property?.attributes?.approvalLimitUsd ? `${ctx.property.attributes.approvalLimitUsd}` : "n/a",
    outsideTemp: ctx.directory.outsideTempF(ctx.now) === null ? "unknown" : `${ctx.directory.outsideTempF(ctx.now)}°F`,
    onCall: ctx.directory.onCallLadder({ afterHours }).map((s) => s.name).join(" → ") || "none",
    vendors: trade ? ctx.directory.vendorsFor(trade, { afterHours }).map((v) => v.name).join(" → ") || "none" : "n/a",
  };
}

export function retrievalFor(ctx, a) {
  const requests = [];
  if (a.safety === "water" && ctx.property) {
    requests.push({ query: "unit water shutoff valve location kitchen sink", scopes: [`property:${ctx.property.id}`], limit: 1, budgetTokens: 160, as: "shutoff" });
  }
  if (a.sensitive) requests.push({ query: `${a.category} health repeat issue legal threat rent withholding resident communication`, scopes: ["global"], limit: 2, budgetTokens: 260, as: "policy" });
  return requests;
}

/** Shutoff location: structured unit data first, else extracted from the building guide (RAG). */
export function shutoffLocation(ctx, knowledge) {
  if (ctx.unit?.attributes?.shutoff) return ctx.unit.attributes.shutoff;
  const text = knowledge?.byName?.shutoff?.results?.[0]?.text ?? "";
  const match = text.match(/shutoff valve\s+((?:under|in|behind|next to|beside)\s+[^.;(]+)/i);
  return match ? match[1].trim().replace(/^under the /, "under your ").replace(/^in the /, "in your ") : null;
}

export function sensitiveConcerns(a) {
  return [
    a.signals.legalThreat && "legal threat",
    a.signals.rentWithholding && "rent withholding",
    a.signals.healthRisk && "health risk",
    a.signals.recurrence && "repeat issue",
  ].filter(Boolean);
}

export function priorHistory(ctx, category) {
  return (ctx.party?.attributes?.maintenanceHistory ?? []).filter((h) => h.category === category);
}

export function sensitiveInput(ctx, a, knowledge) {
  const manager = ctx.directory.staffWithTitle("Property Manager");
  const tzone = tz(ctx);
  const by = isBusinessHours(ctx.now, tzone) ? "today" : formatDayTime(nextBusinessMorning(ctx.now, tzone, 9), tzone);
  return {
    text: ctx.event.payload.text,
    resident: { first: firstName(ctx.party), unit: `${ctx.property?.name} ${ctx.unit?.label}` },
    issue: (CATEGORY_LABEL[a.category] ?? "maintenance").toLowerCase(),
    concerns: sensitiveConcerns(a),
    history: priorHistory(ctx, a.category).map((h) => `${h.date}: ${h.summary} → ${h.resolution}`),
    nextStep: `${manager?.name ?? "Our property manager"} will call you ${by === "today" ? "today" : `by ${by}`}, and we are booking a specialist inspection within 24 hours`,
    policy: (knowledge.byName.policy?.results ?? []).map((r) => `${r.section}: ${r.text}`).join("\n"),
  };
}

export function workOrderDescription(ctx, s) {
  const p = ctx.event.payload;
  const when = p.channel ? ` (reported by ${p.channel} at ${at(ctx, new Date(ctx.event.occurredAt))})` : "";
  return `${s.severity} ${CATEGORY_LABEL[s.category]}${s.facts?.room ? ` — ${s.facts.room}` : ""}: “${String(p.text ?? "").slice(0, 300)}”${when}`;
}

export function workOrderAction(ctx, s) {
  return {
    key: "work-order",
    once: true,
    notify: true,
    connector: "rentvine",
    operation: "createWorkOrder",
    label: `Create ${s.severity} work order in Rentvine`,
    payload: {
      unitId: ctx.unit?.id,
      priority: s.severity,
      category: s.category,
      channel: ctx.event.payload.channel,
      description: workOrderDescription(ctx, s),
      rentvine: { propertyID: ctx.property?.external?.rentvine, unitID: ctx.unit?.external?.rentvine, leaseID: ctx.party?.external?.rentvineLease },
    },
    purpose: "internal",
  };
}

export function repairWorkOrderAction(ctx, work, i) {
  const vendor = ctx.directory.vendorsFor(work.trade === "general" ? "handyman" : work.trade)[0] ?? null;
  const when = nextBusinessMorning(ctx.now, tz(ctx), 10);
  return {
    key: `repair-wo-${i}`,
    once: true,
    notify: true,
    connector: "rentvine",
    operation: "createWorkOrder",
    label: `Create repair work order: ${work.description}${work.estimate_usd ? ` (${usd(work.estimate_usd)})` : ""}`,
    payload: {
      unitId: ctx.unit?.id,
      priority: "P3",
      category: work.trade,
      channel: "email",
      description: `${work.description} — follow-up to ${ctx.case.id}${ctx.case.facts.resolution?.cause ? ` (${ctx.case.facts.resolution.cause})` : ""}`,
      vendorId: vendor?.id ?? null,
      vendorRentvineId: vendor?.external?.rentvine,
      estimatedAmount: work.estimate_usd,
      scheduledFor: when.toISOString(),
      rentvine: { propertyID: ctx.property?.external?.rentvine, unitID: ctx.unit?.external?.rentvine },
    },
    spendUsd: work.estimate_usd ?? 0,
    purpose: "transactional",
  };
}

/** Mirror progress into Rentvine — only once the work order exists there. */
export function workOrderUpdate(ctx, { status, vendor, note }) {
  const workOrderId = ctx.case.external.rentvineWorkOrderId;
  if (!workOrderId) return [];
  return [
    {
      key: `wo-update-${status}`,
      connector: "rentvine",
      operation: "updateWorkOrder",
      label: `Update Rentvine ${workOrderId} → ${status.replace("_", " ")}`,
      payload: { workOrderId, status, vendorId: vendor?.id, vendorRentvineId: vendor?.external?.rentvine, note },
      purpose: "internal",
    },
  ];
}

export function ownerNotice(ctx, s) {
  const owner = ctx.directory.party(ctx.property?.ownerId);
  const prefs = ctx.property?.attributes?.ownerNotify ?? {};
  if (!owner || prefs[s.severity] !== "immediate") return { decisions: [owner ? `Owner prefers ${prefs[s.severity] ?? "digest"} updates for ${s.severity}` : "No owner on file"] };
  return {
    actions: [
      sms({
        key: "owner-emergency",
        to: owner,
        body: templates.ownerEmergency({ first: firstName(owner), property: ctx.property.name, unit: ctx.unit?.label, issue: CATEGORY_LABEL[s.category].toLowerCase(), receivedAt: at(ctx, new Date(ctx.event.occurredAt)), limit: ctx.property.attributes.approvalLimitUsd }),
        purpose: "emergency",
        from: line(ctx, "sms"),
      }),
    ],
    decisions: ["Owner asked for immediate P1 notices → heads-up sent"],
  };
}

/** Whoever owns the case right now: the person who acknowledged, else the person being paged. */
export function caseOwner(ctx) {
  const esc = ctx.case.facts.escalation;
  if (esc?.ackedBy) return ctx.directory.party(esc.ackedBy);
  if (esc?.ladder?.length) return ctx.directory.party(esc.ladder[esc.level ?? 0]);
  return ctx.directory.onCallLadder({ afterHours: !isBusinessHours(ctx.now, tz(ctx)) })[0] ?? null;
}

/** Text whoever owns the case. `topic` keeps two different alerts in one plan distinct. */
export function alertCaseOwner(ctx, text, topic = "alert") {
  const staff = caseOwner(ctx);
  if (!staff) return { flags: { needsHuman: true } };
  return { actions: [sms({ key: `${topic}-${staff.id}`, to: staff, body: templates.staffAlert({ caseId: ctx.case.id, text }), purpose: "emergency", from: line(ctx, "sms") })] };
}

export function tellAssignedVendor(ctx, text) {
  const f = ctx.case.facts;
  const vendor = ctx.directory.party(f.dispatch?.assigned ?? f.dispatch?.current);
  if (!vendor) return null;
  return { actions: [sms({ key: `vendor-note-${ctx.event.id}`, to: vendor, body: text, purpose: "emergency", from: line(ctx, "sms") })] };
}
