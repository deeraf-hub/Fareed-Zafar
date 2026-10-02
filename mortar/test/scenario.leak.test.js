import test from "node:test";
import assert from "node:assert/strict";
import { testApp, stage, messagesTo, callsTo, onlyCase } from "./helpers.js";
import * as sim from "../src/demo/simulate.js";
import { MINUTE, HOUR } from "../src/core/clock.js";

const MAYA = { phone: "+15125550142", email: "maya.t@example.com" };
const JORDAN = "+15125550143"; // 3B, the unit above
const APEX = "+15125550111";
const HILL_COUNTRY = "+15125550112";
const SAM = "+15125550101"; // on-call level 1
const ALEX = "+15125550102"; // on-call level 2
const DANA = "+15125550121"; // owner

test("11:30 PM: 'water coming through the ceiling' → handled end to end with nobody watching the inbox", async (t) => {
  const app = testApp();
  const caseNow = () => app.store.getCase(onlyCase(app, "maintenance").id);

  await t.test("first response: rules decide P1 with zero model calls", async () => {
    await sim.email(app, { from: MAYA.email, subject: "Leak!!", body: "There is water coming through the ceiling. I tried calling and nobody answered." });
    await app.settle();

    const c = caseNow();
    assert.equal(c.priority, "P1");
    assert.equal(c.status, "dispatching");
    assert.ok(c.facts.rulesFired.includes("active_water_intrusion"));
    assert.ok(c.facts.rulesFired.includes("failedContact"));

    const first = app.store.listEvents({ caseId: c.id }).at(-1);
    assert.equal(stage(first.trace, "model").status, "skip", "the emergency path never waits on a model");
    assert.match(stage(first.trace, "retrieval").summary, /doc chunks/);

    const [reply] = messagesTo(app, MAYA.phone);
    assert.match(reply.body, /treating it as an emergency/);
    assert.match(reply.body, /under your kitchen sink/, "shutoff location retrieved from the building guide");
    assert.equal(messagesTo(app, MAYA.email).length, 1, "emergency replies go out on every channel");
    assert.equal(callsTo(app, APEX).length, 1, "vendor #1 called");
    assert.equal(callsTo(app, SAM).length, 1, "on-call level 1 paged");
    assert.match(messagesTo(app, JORDAN)[0].body, /unit below yours/);
    assert.doesNotMatch(messagesTo(app, JORDAN)[0].body, /Maya|2B/, "no names or unit numbers shared with the neighbor");
    assert.match(messagesTo(app, DANA)[0].body, /pre-approval/);
    assert.equal(app.world.state.workOrders.length, 1);
    assert.equal(caseNow().external.rentvineWorkOrderId, app.world.state.workOrders[0].workOrderId);
  });

  await t.test("a redelivered webhook changes nothing", async () => {
    const before = app.world.state.messages.length;
    const event = app.store.listEvents({ limit: 500 }).find((e) => e.type === "message.received" && e.source === "email");
    const again = await app.ingest({ type: event.type, source: event.source, idempotencyKey: event.idempotencyKey, occurredAt: event.occurredAt, subject: event.subject, payload: event.payload });
    await app.settle();
    assert.equal(again.duplicate, true);
    assert.equal(app.world.state.messages.length, before);
  });

  await t.test("vendor #1 declines → vendor #2 is dispatched automatically", async () => {
    await sim.keypress(app, { phone: APEX, digits: "2" });
    await app.settle();
    assert.equal(callsTo(app, HILL_COUNTRY).length, 1);
    assert.equal(caseNow().facts.dispatch.current, "V-02");
  });

  await t.test("vendor #2 accepts, then texts an ETA (parsed by rule)", async () => {
    app.clock.advance(2 * MINUTE);
    await sim.keypress(app, { phone: HILL_COUNTRY, digits: "1" });
    await sim.sms(app, { from: HILL_COUNTRY, body: "ETA 40 min" });
    await app.settle();
    const c = caseNow();
    assert.equal(c.status, "vendor_assigned");
    assert.equal(c.facts.dispatch.etaMinutes, 40);
    assert.ok(messagesTo(app, MAYA.phone).some((m) => /Hill Country Plumbing has accepted/.test(m.body)));
    assert.ok(messagesTo(app, SAM).some((m) => /access details/.test(m.body)), "agent never sends access codes — a person does");
  });

  await t.test("the unit above answers vaguely → a LOCAL model reads it", async () => {
    await sim.sms(app, { from: JORDAN, body: "Hmm, the floor by my bathroom vanity feels a little damp? Not sure if that's new." });
    await app.settle();
    const c = caseNow();
    assert.equal(c.facts.neighborCheck.finding, "possible_leak");
    assert.ok(messagesTo(app, HILL_COUNTRY).some((m) => /check 3B first/.test(m.body)));
    const call = app.store.listModelCalls({ caseId: c.id }).find((m) => m.task === "maintenance.classify_reply");
    assert.equal(call.tier, "local");
  });

  await t.test("on-call level 1 doesn't acknowledge in 10 min → level 2 is paged; ACK stops the ladder", async () => {
    await app.fastForward(8 * MINUTE + 1000);
    assert.equal(callsTo(app, ALEX).length, 1);
    await sim.sms(app, { from: ALEX, body: "ACK" });
    await app.settle();
    const c = caseNow();
    assert.equal(c.facts.escalation.ackedBy, "S-02");
    assert.equal(c.facts.escalation.active, false);
    assert.ok(messagesTo(app, MAYA.phone).some((m) => /Alex Kim from our team/.test(m.body)));
  });

  await t.test("30-minute check-in, arrival, and the vendor's free-text findings", async () => {
    await app.fastForward(30 * MINUTE);
    assert.ok(messagesTo(app, MAYA.phone).some((m) => /Reply 1 if it has stopped/.test(m.body)));
    await sim.sms(app, { from: HILL_COUNTRY, body: "On site now" });
    await app.settle();
    assert.equal(caseNow().status, "on_site");

    await app.fastForward(25 * MINUTE);
    await sim.sms(app, {
      from: HILL_COUNTRY,
      body: "Found a burst supply line under the 3B bathroom vanity. Shut off and replaced it, water has stopped. 2B ceiling drywall is soaked and needs to be cut out and replaced, estimate $1,150.",
    });
    await app.settle();
    const c = caseNow();
    assert.equal(c.status, "mitigated");
    assert.equal(c.facts.resolution.sourceUnit, "3B");
    assert.equal(c.facts.resolution.followUps[0].estimate_usd, 1150);
  });

  await t.test("repair over the owner's limit waits for approval; the request respects quiet hours", async () => {
    const [approval] = app.store.listApprovals({ status: "pending" });
    assert.equal(approval.approverId, "O-01");
    assert.match(approval.reason, /exceeds the owner's \$750 pre-approval/);
    const ownerAsk = app.store.listActions({ caseId: caseNow().id }).find((a) => a.payload.to === DANA && /Reply YES/.test(a.payload.body));
    assert.equal(ownerAsk.status, "pending", "deferred to 8 AM — it's not an emergency any more");

    await sim.sms(app, { from: MAYA.phone, body: "1" });
    await app.settle();
    assert.equal(caseNow().facts.checkin.answer, "stopped");

    await app.fastForward(7.5 * HOUR); // → about 8:05 AM
    assert.ok(messagesTo(app, DANA).some((m) => /Reply YES/.test(m.body)));
    await sim.sms(app, { from: DANA, body: "YES" });
    await app.settle();
    assert.equal(caseNow().status, "repair_scheduled");
    assert.equal(app.world.state.workOrders.length, 2);
  });

  await t.test("Rentvine reports the repair done → resolved, then closed after 72 h", async () => {
    await sim.rentvineWorkOrder(app, { workOrderId: caseNow().external.repairWorkOrderId, status: "completed" });
    await app.settle();
    assert.equal(caseNow().status, "resolved");
    const { rentvineWorkOrderId, repairWorkOrderId } = caseNow().external;
    const statusOf = (id) => app.world.state.workOrders.find((w) => w.workOrderId === id).status;
    assert.equal(statusOf(rentvineWorkOrderId), "completed", "the emergency work order closed when the leak was stopped");
    assert.equal(statusOf(repairWorkOrderId), "completed");
    await app.fastForward(73 * HOUR);
    assert.equal(caseNow().status, "closed");
  });

  await t.test("the whole incident used two small local-model calls and no frontier calls", () => {
    const used = app.store.listModelCalls().filter((m) => m.outcome === "ok");
    assert.deepEqual(used.map((m) => m.task).sort(), ["maintenance.classify_reply", "maintenance.vendor_report"]);
    assert.ok(used.every((m) => m.tier === "local"));
  });
});
