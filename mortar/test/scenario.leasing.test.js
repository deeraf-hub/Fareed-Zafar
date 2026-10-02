import test from "node:test";
import assert from "node:assert/strict";
import { testApp, messagesTo, onlyCase, stage } from "./helpers.js";
import * as sim from "../src/demo/simulate.js";
import { HOUR, MINUTE } from "../src/core/clock.js";

const LEAD = { name: "Chris Nguyen", phone: "+15125550161", email: "chris.nguyen@example.com", smsConsent: true };
const INQUIRY =
  "Hi! Is 12 Cedar Lane still available? We have 2 cats and a small dog (about 25 lbs) and are looking to move in around November 1st. Can I see it this weekend? Is there a fenced yard? And is the neighborhood safe?";

// Thursday 10:15 AM CDT
const THU_MORNING = "2026-10-08T15:15:00Z";

test("rental inquiry → answers from the listing record, a grounded long-tail answer, fair-housing-safe, routed to FUB", async (t) => {
  const app = testApp({ start: THU_MORNING });
  const leasingCase = () => onlyCase(app, "leasing");

  await t.test("first reply: code answers the known topics; a local model reads the inquiry and answers the long tail", async () => {
    await sim.showmojo(app, { event: "listing.inquiry", listingId: "SM-12CL", prospect: LEAD, message: INQUIRY, source: "Zillow via ShowMojo" });
    await app.settle();
    const c = leasingCase();
    assert.equal(c.status, "engaged");
    assert.equal(c.facts.moveIn, "2026-11-01");
    assert.match(c.facts.petProblem, /3 pets.*2-pet limit/, "3 pets > policy max 2 → exception request, not a rejection");

    const [email] = messagesTo(app, LEAD.email);
    assert.match(email.body, /available November 1/);
    assert.match(email.body, /dogs under 40 lb/i);
    assert.match(email.body, /fenced backyard/i, "long-tail answer grounded in the listing doc");
    assert.match(email.body, /don't characterize neighborhoods/, "standard fair-housing answer");
    assert.match(email.body, /showmojo\.example/);
    assert.ok(messagesTo(app, LEAD.phone)[0].body.length < 320, "SMS stays short; details go by email");

    const first = app.store.listEvents({ caseId: c.id }).at(-1);
    assert.equal(stage(first.trace, "model").status, "local");
    const tasks = app.store.listModelCalls({ caseId: c.id }).filter((m) => m.outcome === "ok").map((m) => m.task).sort();
    assert.deepEqual(tasks, ["knowledge.answer", "leasing.read_inquiry"]);
  });

  await t.test("Follow Up Boss: lead created via /v1/events, then the queued task + note are flushed", async () => {
    const c = leasingCase();
    assert.ok(c.external.fubPersonId);
    const person = app.world.state.fubPeople.find((p) => p.id === c.external.fubPersonId);
    assert.equal(person.email, LEAD.email);
    assert.ok(app.world.state.fubTasks.some((task) => /Pet exception request/.test(task.name)));
    assert.ok(app.world.state.fubNotes.some((n) => /Move-in: 2026-11-01/.test(n.body)));
  });

  await t.test("ShowMojo booking → tour prep 2 h before, follow-up 75 min after", async () => {
    await sim.showmojo(app, { event: "showing.scheduled", listingId: "SM-12CL", showingId: "SH-77", prospect: LEAD, startsAt: "2026-10-10T16:00:00Z" }); // Sat 11 AM
    await app.settle();
    assert.equal(leasingCase().status, "tour_scheduled");
    assert.equal(app.world.state.fubPeople[0].stage, "Hot Prospect");

    await app.fastForward(2 * 24 * HOUR); // → Sat 10:15 AM … past the tour
    assert.ok(messagesTo(app, LEAD.phone).some((m) => /See you at 12 Cedar Lane/.test(m.body)));
    await app.fastForward(2 * HOUR);
    assert.equal(leasingCase().status, "toured");
    assert.ok(messagesTo(app, LEAD.phone).some((m) => /What did you think/.test(m.body)));
  });

  await t.test("price objection → acknowledged, routed to the leasing manager (agents never negotiate rent)", async () => {
    await sim.sms(app, { from: LEAD.phone, to: "+15125550177", body: "Loved the house! Honestly the rent is a bit of a stretch for us though." });
    await app.settle();
    const c = leasingCase();
    assert.equal(c.facts.objection.type, "price");
    assert.match(messagesTo(app, LEAD.phone).at(-1).body, /Pricing is set by our leasing manager, Taylor Brooks/);
    assert.ok(app.world.state.fubTasks.some((task) => /Price objection/.test(task.name)));
    assert.doesNotMatch(messagesTo(app, LEAD.phone).at(-1).body, /discount|lower/i);
  });

  await t.test("a person moves the lead in Follow Up Boss → Mortar follows (people win)", async () => {
    const personId = leasingCase().external.fubPersonId;
    await app.ingest({ type: "crm.person.updated", source: "followupboss", idempotencyKey: "fub:evt-1:" + personId, occurredAt: app.clock.now().toISOString(), subject: {}, payload: { personId, stage: "Pending" } });
    await app.settle();
    const c = app.store.getCase(leasingCase().id);
    assert.equal(c.status, "applied");
    assert.equal(c.flags.humanInControl, true);
  });
});

test("fair housing: model-written leasing text that steers is blocked by policy", async () => {
  const app = testApp({ start: THU_MORNING });
  const verdict = app.policy.check(
    { key: "x", connector: "email", operation: "sendEmail", label: "x", payload: { to: "a@b.c", body: "It's a safe neighborhood, perfect for young professionals." }, purpose: "leasing", generated: true, recipient: { role: "lead" } },
    { now: app.clock.now(), caseRecord: null, property: null, recipient: null, allowedContacts: [] }
  );
  assert.equal(verdict.verdict, "block");
  assert.match(verdict.reason, /fair housing/);
});
