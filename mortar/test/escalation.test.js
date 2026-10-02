import test from "node:test";
import assert from "node:assert/strict";
import { startEscalation, nextEscalation, acknowledgeEscalation, ALL_STAFF_ROUNDS, isAck } from "../src/core/escalation.js";
import { MINUTE } from "../src/core/clock.js";

const staff = [
  { id: "STF-1", name: "Sam", phone: "+15125550101" },
  { id: "STF-2", name: "Alex", phone: "+15125550102" },
  { id: "STF-3", name: "Rosa", phone: "+15125550103" },
];
const getParty = (id) => staff.find((s) => s.id === id);
const t0 = new Date("2026-10-08T04:30:00Z");

/** Apply an escalation fragment to a case the way the pipeline would (facts + flags only). */
const apply = (c, f) => ({ ...c, facts: { ...c.facts, ...f.facts }, flags: { ...c.flags, ...f.flags } });

test("escalation ladder: level by level, then a bounded number of all-staff rounds", () => {
  let c = { id: "MC-0001", priority: "P1", facts: {}, flags: {} };
  const start = startEscalation({ caseRecord: c, ladder: staff, reason: "P1", summary: "P1 Water leak", now: t0 });
  assert.equal(start.actions.length, 2, "level 1 gets a voice call and an SMS");
  c = apply(c, start);

  let now = t0;
  for (const expected of ["STF-2", "STF-3"]) {
    now = new Date(now.getTime() + 10 * MINUTE);
    const step = nextEscalation({ caseRecord: c, getParty, now });
    assert.equal(step.actions[0].payload.to, getParty(expected).phone);
    c = apply(c, step);
  }

  const gaps = [];
  for (let round = 1; round <= ALL_STAFF_ROUNDS; round++) {
    now = new Date(now.getTime() + 10 * MINUTE);
    const step = nextEscalation({ caseRecord: c, getParty, now });
    assert.equal(step.actions.length, staff.length * 2, `round ${round} pages everyone`);
    gaps.push((step.timers[0].at - now) / MINUTE);
    c = apply(c, step);
  }
  assert.deepEqual(gaps, [10, 20, 40], "each all-staff round waits longer than the last");

  const stop = nextEscalation({ caseRecord: c, getParty, now: new Date(now.getTime() + 40 * MINUTE) });
  assert.equal(stop.actions, undefined, "no more pages");
  assert.equal(stop.timers, undefined, "no more timers");
  assert.equal(stop.flags.needsHuman, true, "the case stays flagged");
  c = apply(c, stop);

  const late = acknowledgeEscalation({ caseRecord: c, staff: staff[1], now: new Date(now.getTime() + 90 * MINUTE) });
  assert.equal(late.facts.escalation.ackedBy, "STF-2", "a late ACK still takes ownership");
  assert.deepEqual(late.cancelTimers, ["escalation_ack"]);
});

test("ACK parsing", () => {
  for (const yes of ["ACK", "ack", "1", "on it", "Got it, heading over", "I'm on it"]) assert.ok(isAck(yes), yes);
  for (const no of ["what happened?", "call me", "2", "acknowledged later maybe"]) assert.ok(!isAck(no), no);
});
