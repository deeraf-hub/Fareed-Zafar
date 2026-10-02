import { MINUTE } from "./clock.js";

/**
 * On-call escalation ladder — shared by every playbook that needs a human.
 *
 *   page level 1 (voice call "press 1" + SMS "reply ACK")
 *     └─ no ACK in N minutes → page level 2 → … → last level
 *          └─ still nothing → "exhausted": everyone on the ladder is re-paged, waiting
 *             N, 2N, 4N minutes between rounds; after ALL_STAFF_ROUNDS paging stops (an
 *             escalation policy's "repeat N times") and the case stays flagged. A late
 *             ACK still takes ownership.
 *
 * These are pure functions: they return plan fragments (facts, actions, timers),
 * and the pipeline validates and commits them like any other plan.
 * State lives at case.facts.escalation.
 */

export const ALL_STAFF_ROUNDS = 3;

const ACK = /^\s*(ack|1|yes|y|ok|on it|got it|taking it|i'?m on it|i got it)\b/i;
export const isAck = (text) => ACK.test(String(text ?? ""));

export function startEscalation({ caseRecord, ladder, reason, summary, now, ackMinutes = 10, purpose = "emergency" }) {
  const first = ladder[0];
  return {
    facts: {
      escalation: {
        active: true,
        level: 0,
        ladder: ladder.map((s) => s.id),
        reason,
        summary,
        startedAt: now.toISOString(),
        pages: [{ level: 0, partyId: first.id, at: now.toISOString() }],
      },
    },
    actions: pageActions({ caseRecord, staff: first, level: 0, summary, purpose }),
    timers: [{ kind: "escalation_ack", at: new Date(now.getTime() + ackMinutes * MINUTE), payload: { level: 0 } }],
    log: [{ kind: "escalation", text: `Paging ${first.name} (on-call level 1): ${reason}` }],
  };
}

/** Called when an escalation_ack timer fires without an acknowledgement. */
export function nextEscalation({ caseRecord, getParty, now, ackMinutes = 10, purpose = "emergency" }) {
  const esc = caseRecord.facts.escalation;
  if (!esc?.active) return null;
  const nextLevel = esc.level + 1;

  if (nextLevel < esc.ladder.length) {
    const staff = getParty(esc.ladder[nextLevel]);
    const previous = getParty(esc.ladder[esc.level]);
    return {
      facts: {
        escalation: { ...esc, level: nextLevel, pages: [...esc.pages, { level: nextLevel, partyId: staff.id, at: now.toISOString() }] },
      },
      actions: pageActions({ caseRecord, staff, level: nextLevel, summary: `${esc.summary} (${previous.name} did not acknowledge)`, purpose }),
      timers: [{ kind: "escalation_ack", at: new Date(now.getTime() + ackMinutes * MINUTE), payload: { level: nextLevel } }],
      log: [{ kind: "escalation", text: `No acknowledgement from ${previous.name} in ${ackMinutes} min — paging ${staff.name} (level ${nextLevel + 1})` }],
    };
  }

  // Ladder exhausted: re-page everyone a bounded number of times, backing off each round.
  const round = (esc.allStaffRounds ?? 0) + 1;
  if (round > ALL_STAFF_ROUNDS) {
    return {
      facts: { escalation: { ...esc, exhausted: true, pagingStopped: true } },
      flags: { needsHuman: true },
      log: [{ kind: "escalation", text: `Still unacknowledged after ${ALL_STAFF_ROUNDS} all-staff rounds — paging stopped; the case stays flagged for whoever comes on shift` }],
    };
  }
  const everyone = esc.ladder.map(getParty);
  return {
    facts: { escalation: { ...esc, exhausted: true, allStaffRounds: round } },
    flags: { needsHuman: true },
    actions: everyone.flatMap((staff) => pageActions({ caseRecord, staff, level: `all-${round}`, summary: `UNACKNOWLEDGED: ${esc.summary}`, purpose })),
    timers: [{ kind: "escalation_ack", at: new Date(now.getTime() + ackMinutes * 2 ** (round - 1) * MINUTE), payload: { level: "all", round } }],
    log: [{ kind: "escalation", text: `Nobody on the ladder acknowledged — re-paging all ${everyone.length} on-call staff (round ${round} of ${ALL_STAFF_ROUNDS})` }],
  };
}

export function acknowledgeEscalation({ caseRecord, staff, now }) {
  const esc = caseRecord.facts.escalation;
  if (!esc?.active) return null;
  return {
    facts: { escalation: { ...esc, active: false, ackedBy: staff.id, ackedByName: staff.name, ackedAt: now.toISOString() } },
    flags: { needsHuman: false },
    cancelTimers: ["escalation_ack"],
    log: [{ kind: "escalation", actor: `human:${staff.name}`, text: `${staff.name} acknowledged and owns the case` }],
  };
}

function pageActions({ caseRecord, staff, level, summary: raw, purpose }) {
  const recipient = { partyId: staff.id, role: "staff", name: staff.name };
  const summary = String(raw).replace(/[.\s]+$/, "");
  return [
    {
      key: `page-${level}-${staff.id}-call`,
      connector: "twilio",
      operation: "placeCall",
      label: `Page ${staff.name} — voice call`,
      payload: {
        to: staff.phone,
        caseId: caseRecord.id,
        say: `Mortar alert, case ${spell(caseRecord.id)}. ${summary}. Press 1 to acknowledge.`,
        gather: { ref: `page:${staff.id}`, options: { 1: "acknowledge" } },
      },
      recipient,
      purpose,
    },
    {
      key: `page-${level}-${staff.id}-sms`,
      connector: "twilio",
      operation: "sendSms",
      label: `Page ${staff.name} — SMS`,
      payload: { to: staff.phone, body: `[${caseRecord.priority ?? "ALERT"}] ${caseRecord.id}: ${summary}. Reply ACK to take it.` },
      recipient,
      purpose,
    },
  ];
}

/** "MC-0001" → "M C 0 0 0 1" so text-to-speech reads it clearly. */
const spell = (id) => id.replace(/-/g, " ").split("").join(" ").replace(/\s+/g, " ");
