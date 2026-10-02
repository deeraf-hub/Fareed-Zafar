import { templates, CATEGORY_LABEL } from "./messages.js";
import { mergePlans } from "../../core/plan.js";
import { usd, lowerFirst } from "../../core/format.js";
import { isBusinessHours } from "../../core/directory.js";
import { MINUTE } from "../../core/clock.js";
import { notify, sms, call, firstName } from "../shared/actions.js";
import { VENDOR_RESPONSE_MIN, tz, at, later, line, repairWorkOrderAction, workOrderUpdate, caseOwner, alertCaseOwner } from "./helpers.js";

/**
 * Maintenance — the vendor dispatch ladder.
 *
 *   call + text vendor #1 ("press 1 to accept, 2 to decline") → 10-minute timer
 *     declined / no answer / unreachable → vendor #2 → … → list exhausted → a person dispatches
 *     accepted → resident gets the ETA, Rentvine is updated, on-call sends access details
 *   arrival, findings and follow-up repairs come back as events and are handled here.
 */

export function startDispatch(ctx, trade, { urgent, category = ctx.case.facts.category, room = ctx.case.facts.room }) {
  if (!trade) return { flags: { needsHuman: true }, decisions: ["No trade identified — a person assigns the vendor"] };
  const afterHours = !isBusinessHours(ctx.now, tz(ctx));
  const vendors = ctx.directory.vendorsFor(trade, { afterHours });
  if (!vendors.length) {
    return mergePlans(alertCaseOwner(ctx, `No ${trade} vendor available${afterHours ? " after hours" : ""} for ${ctx.case.id} — manual dispatch needed.`), {
      flags: { needsHuman: true },
      decisions: [`No ${trade} vendor available${afterHours ? " after hours" : ""} → manual dispatch`],
    });
  }
  return dispatchTo(ctx, vendors[0], { trade, category, room, queue: vendors.map((v) => v.id), index: 0, attempts: [], urgent });
}

export function dispatchTo(ctx, vendor, state) {
  const category = state.category ?? "general";
  const issue = `${CATEGORY_LABEL[category]}${state.room ? ` (${state.room})` : ""}`;
  const job = { caseId: ctx.case.id, address: ctx.property?.address, unit: ctx.unit?.label, issue };
  const purpose = state.urgent && ctx.case.priority === "P1" ? "emergency" : "transactional";
  const spendUsd = vendor.attributes.calloutUsd; // policy holds non-emergency dispatches above the owner's limit
  const actions = [sms({ key: `dispatch-${vendor.id}-sms`, to: vendor, body: templates.dispatchSms(job), purpose, from: line(ctx, "sms"), label: `Dispatch ${vendor.name} — SMS`, spendUsd })];
  if (state.urgent) {
    actions.unshift(
      call({ key: `dispatch-${vendor.id}-call`, to: vendor, say: templates.dispatchSay(job), gather: { ref: `dispatch:${vendor.id}`, options: { 1: "accept", 2: "decline" } }, caseId: ctx.case.id, purpose, spendUsd, label: `Dispatch ${vendor.name} — voice call (press 1 / 2)` })
    );
  }
  return {
    facts: { dispatch: { ...state, current: vendor.id, assigned: null, attempts: [...state.attempts, { vendorId: vendor.id, at: ctx.now.toISOString(), outcome: "pending" }] } },
    actions,
    timers: [{ kind: "vendor_response", at: later(ctx, VENDOR_RESPONSE_MIN), payload: { vendorId: vendor.id } }],
    log: [{ kind: "decision", text: `Dispatching ${vendor.name} (${state.trade}, #${state.index + 1} of ${state.queue.length}${vendor.attributes.afterHours ? ", 24/7" : ""}, call-out $${vendor.attributes.calloutUsd})` }],
  };
}

export function nextVendor(ctx, outcome) {
  const d = ctx.case.facts.dispatch;
  const attempts = d.attempts.map((x) => (x.vendorId === d.current && x.outcome === "pending" ? { ...x, outcome } : x));
  const previous = ctx.directory.party(d.current);
  const nextIndex = d.index + 1;
  if (nextIndex >= d.queue.length) {
    return mergePlans(alertCaseOwner(ctx, `No ${d.trade} vendor accepted ${ctx.case.id} (${d.queue.length} tried). Manual dispatch needed.`), {
      facts: { dispatch: { ...d, attempts, current: null, exhausted: true } },
      cancelTimers: ["vendor_response"],
      flags: { needsHuman: true },
      decisions: [`${previous?.name} ${outcome === "timeout" ? "timed out" : "declined"}; vendor list exhausted → a person dispatches`],
    });
  }
  const vendor = ctx.directory.party(d.queue[nextIndex]);
  return mergePlans(
    { cancelTimers: ["vendor_response"], decisions: [`${previous?.name} ${outcome === "timeout" ? "didn't answer" : "declined"} → next vendor: ${vendor.name}`] },
    dispatchTo(ctx, vendor, { ...d, index: nextIndex, attempts }),
    ctx.case.priority === "P1" ? { actions: notify({ key: `next-vendor-${nextIndex}`, to: ctx.party, body: templates.nextVendor(), purpose: "emergency", from: line(ctx, "sms") }) } : null
  );
}

/** The model's reading wins when there is one (it saw the whole message); otherwise the rule's. */
export const resolveVendorStatus = (parsed, report) => (report && report.status !== "other" ? report.status : parsed.status) ?? null;

export function planVendorUpdate(ctx, d, models) {
  const report = models.report?.ok ? models.report.output : null;
  const status = resolveVendorStatus(d.parsed, report);
  const etaMinutes = report?.eta_minutes ?? d.parsed.etaMinutes;
  const vendor = ctx.sender;
  const f = ctx.case.facts;
  const isCurrent = f.dispatch?.current === vendor.id && !f.dispatch?.assigned;
  const isAssigned = f.dispatch?.assigned === vendor.id;

  switch (status) {
    case "declined":
      return isCurrent ? nextVendor(ctx, "declined") : { decisions: [`${vendor.name} declined, but isn't the vendor being asked — ignored`] };
    case "accepted":
    case "delayed":
      if (isAssigned) return etaMinutes ? updateEta(ctx, vendor, etaMinutes) : { decisions: [`${vendor.name} re-confirmed`] };
      if (!isCurrent) {
        return {
          actions: [sms({ key: `release-${vendor.id}`, to: vendor, body: `Thanks — ${ctx.case.id} has already been assigned to another vendor. No need to go.`, purpose: "transactional", from: line(ctx, "sms") })],
          decisions: [`${vendor.name} accepted late — job already assigned, released them`],
        };
      }
      return acceptVendor(ctx, vendor, etaMinutes);
    case "on_site":
      return {
        status: "on_site",
        cancelTimers: ["vendor_arrival"],
        facts: { dispatch: { ...f.dispatch, onSiteAt: ctx.now.toISOString() } },
        actions: [...notify({ key: "vendor-on-site", to: ctx.party, body: templates.vendorOnSite({ vendor: vendor.name }), purpose: "emergency", from: line(ctx, "sms") }), ...workOrderUpdate(ctx, { status: "in_progress", note: `${vendor.name} on site` })],
        decisions: [`${vendor.name} on site`],
      };
    case "mitigated":
    case "completed":
      return vendorFinished(ctx, vendor, status, report, d.parsed);
    default:
      return mergePlans(alertCaseOwner(ctx, `Couldn't read an update from ${vendor.name}: “${ctx.event.payload.text}”`), {
        flags: { needsHuman: true },
        decisions: ["Vendor update unreadable by rules and model → flagged for a person"],
      });
  }
}

export function acceptVendor(ctx, vendor, etaMinutes) {
  const f = ctx.case.facts;
  const etaAt = etaMinutes ? later(ctx, etaMinutes) : null;
  const staff = caseOwner(ctx);
  const actions = [
    ...notify({ key: "vendor-assigned", to: ctx.party, body: templates.vendorAssigned({ vendor: vendor.name, eta: etaAt && at(ctx, etaAt) }), purpose: "emergency", from: line(ctx, "sms") }),
    ...workOrderUpdate(ctx, { status: "in_progress", vendor, note: `${vendor.name} accepted${etaMinutes ? `, ETA ${etaMinutes} min` : ""}` }),
  ];
  if (!etaMinutes) actions.push(sms({ key: "ask-eta", to: vendor, body: templates.vendorAskEta({ caseId: ctx.case.id }), purpose: "emergency", from: line(ctx, "sms") }));
  if (staff) actions.push(sms({ key: "access-request", to: staff, body: templates.accessRequest({ vendor: vendor.name, caseId: ctx.case.id, eta: etaAt && at(ctx, etaAt) }), purpose: "emergency", from: line(ctx, "sms") }));
  if (f.neighborCheck?.finding && f.neighborCheck.finding !== "no_leak") {
    actions.push(sms({ key: "vendor-neighbor-note", to: vendor, body: templates.vendorNeighborUpdate({ caseId: ctx.case.id, aboveUnit: ctx.directory.unit(f.neighborCheck.unitId)?.label, finding: f.neighborCheck.note ?? "possible water" }), purpose: "emergency", from: line(ctx, "sms") }));
  }
  return {
    status: "vendor_assigned",
    cancelTimers: ["vendor_response"],
    facts: {
      dispatch: {
        ...f.dispatch,
        assigned: vendor.id,
        acceptedAt: ctx.now.toISOString(),
        etaMinutes: etaMinutes ?? null,
        etaAt: etaAt?.toISOString() ?? null,
        attempts: f.dispatch.attempts.map((x) => (x.vendorId === vendor.id && x.outcome === "pending" ? { ...x, outcome: "accepted" } : x)),
      },
    },
    actions,
    timers: [{ kind: "vendor_arrival", at: etaAt ? new Date(etaAt.getTime() + 15 * MINUTE) : later(ctx, 60) }],
    decisions: [`${vendor.name} accepted${etaMinutes ? ` · ETA ${etaMinutes} min` : " · asked for ETA"}${staff ? ` · ${staff.name} asked to send access details` : ""}`],
  };
}

export function updateEta(ctx, vendor, etaMinutes) {
  const etaAt = later(ctx, etaMinutes);
  return {
    cancelTimers: ["vendor_arrival"],
    facts: { dispatch: { ...ctx.case.facts.dispatch, etaMinutes, etaAt: etaAt.toISOString() } },
    actions: notify({ key: `eta-${etaMinutes}`, to: ctx.party, body: templates.vendorAssigned({ vendor: vendor.name, eta: at(ctx, etaAt) }), purpose: "emergency", from: line(ctx, "sms") }),
    timers: [{ kind: "vendor_arrival", at: new Date(etaAt.getTime() + 15 * MINUTE) }],
    decisions: [`ETA from ${vendor.name}: ${etaMinutes} min (≈${at(ctx, etaAt)})`],
  };
}

export function vendorFinished(ctx, vendor, status, report, parsed) {
  const { property, unit } = ctx;
  const owner = ctx.directory.party(property?.ownerId);
  const limit = property?.attributes?.approvalLimitUsd ?? 0;
  const followUps = report?.follow_up_work?.length
    ? report.follow_up_work
    : parsed.estimateUsd
      ? [{ trade: "general", description: "Follow-up repair", estimate_usd: parsed.estimateUsd }]
      : [];
  const cause = report?.root_cause ?? null;
  const sourceUnit = report?.source_unit ?? null;
  const esc = ctx.case.facts.escalation;

  const fragments = [
    {
      cancelTimers: ["vendor_arrival", "tenant_checkin", "vendor_response"],
      facts: {
        resolution: { vendorId: vendor.id, at: ctx.now.toISOString(), status, cause, sourceUnit, workDone: report?.work_done ?? null, followUps },
        checkin: { asked: true, at: ctx.now.toISOString() },
      },
      // The emergency work order is done once the vendor has stopped the damage; follow-up
      // repairs get their own work order (after approval when they exceed the owner's limit).
      actions: workOrderUpdate(ctx, { status: "completed", note: `${vendor.name}: ${report?.work_done ?? status}${cause ? ` — cause: ${cause}` : ""}${followUps.length ? " · follow-up repair to be scheduled" : ""}` }),
      decisions: [`${vendor.name}: ${status}${cause ? ` — ${cause}` : ""}${sourceUnit && sourceUnit !== unit?.label ? ` (source: ${sourceUnit})` : ""}`],
    },
  ];

  if (!followUps.length) {
    fragments.push({
      status: "resolved",
      actions: [
        ...notify({ key: "resolved", to: ctx.party, body: templates.resolved({ caseId: ctx.case.id }), purpose: "transactional", from: line(ctx, "sms") }),
        ...(owner ? notify({ key: "owner-resolved", to: owner, body: templates.ownerUpdate({ first: firstName(owner), property: property.name, unit: unit?.label, text: `the issue is resolved by ${vendor.name}${cause ? ` (${cause})` : ""}.` }), purpose: "transactional" }) : []),
      ],
      timers: [{ kind: "close_case", at: later(ctx, 72 * 60) }],
    });
  } else {
    const nextStep = followUps.map((x) => lowerFirst(x.description)).join("; ");
    fragments.push({
      status: "mitigated",
      actions: notify({
        key: "mitigated",
        to: ctx.party,
        body: `${templates.mitigated({ vendor: vendor.name, cause, nextStep })} Can you confirm on your side? Reply 1 if the water has stopped, 2 if not.`,
        purpose: "emergency",
        from: line(ctx, "sms"),
      }),
    });
    followUps.forEach((work, i) => {
      const repair = repairWorkOrderAction(ctx, work, i);
      fragments.push({ actions: [repair] });
      if (work.estimate_usd && work.estimate_usd > limit && owner) {
        fragments.push({
          actions: [sms({ key: `owner-approval-${i}`, to: owner, body: templates.ownerApproval({ first: firstName(owner), property: property.name, unit: unit?.label, cause, work: lowerFirst(work.description), estimate: work.estimate_usd, limit }), purpose: "transactional", from: line(ctx, "sms") })],
          decisions: [`Repair estimate ${usd(work.estimate_usd)} > ${usd(limit)} pre-approval → owner approval required`],
        });
      }
    });
  }

  // The emergency is contained: stand down any unanswered paging, queue a morning review.
  if (esc?.active) {
    fragments.push({
      facts: { escalation: { ...esc, active: false, stoodDownAt: ctx.now.toISOString(), stoodDownReason: "water stopped" } },
      cancelTimers: ["escalation_ack"],
      flags: { needsHuman: true },
      decisions: ["Emergency contained → paging stood down; queued for morning review"],
    });
  } else if (esc?.ackedBy) {
    fragments.push(alertCaseOwner(ctx, `${vendor.name}: ${status}${cause ? ` — ${cause}` : ""}. ${followUps.length ? `Follow-up: ${followUps.map((x) => x.description).join("; ")}.` : "No follow-up needed."}`));
  }
  return mergePlans(...fragments);
}

export function planVendorLate(ctx) {
  const vendor = ctx.directory.party(ctx.case.facts.dispatch?.assigned);
  return mergePlans(
    { actions: vendor ? [sms({ key: "vendor-late", to: vendor, body: templates.vendorCheckArrival({ caseId: ctx.case.id }), purpose: "emergency", from: line(ctx, "sms") })] : [], decisions: ["Vendor late → checking in with them and telling the case owner"] },
    alertCaseOwner(ctx, `${vendor?.name ?? "Vendor"} hasn't confirmed arrival at ${ctx.case.id} (15 min past ETA).`)
  );
}
