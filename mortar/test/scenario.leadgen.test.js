import test from "node:test";
import assert from "node:assert/strict";
import { testApp } from "./helpers.js";
import * as sim from "../src/demo/simulate.js";
import { PROSPECTS } from "../src/demo/seed.js";
import { runLearningCycle } from "../src/playbooks/leadgen/learning-cycle.js";
import { HOUR } from "../src/core/clock.js";

const THU_MORNING = "2026-10-08T15:15:00Z"; // 10:15 AM Central
const OWNERS_INBOX = "owners@northwind.example";
const byName = (app, name) => app.store.listCases({ playbook: "leadgen" }).find((c) => c.title.startsWith(name));
const emailsTo = (app, address) => app.world.state.messages.filter((m) => m.direction === "outbound" && m.to === address);

test("owner lead generation: score → tiered spend → sequence → replies → booked meeting → learning", async (t) => {
  const app = testApp({ start: THU_MORNING });
  await sim.discover(app, PROSPECTS.records);
  await app.settle();

  await t.test("ICP filter and scoring are plain code; data spend only on tiers A and B", () => {
    assert.equal(byName(app, "Jason Park").status, "disqualified", "outside the market");
    assert.equal(byName(app, "Derek Hollis").status, "disqualified", "26 doors → a person, not a sequence");
    assert.ok(emailsTo(app, "jamie@northwind.example").some((m) => /Portfolio owner/.test(m.subject)));
    assert.equal(byName(app, "Olivia Turner").status, "nurture");
    assert.equal(byName(app, "Grant Whitaker").status, "no_contact", "phone only, no SMS consent → no texts");
    const spend = app.store.getKV("leadgen:spend");
    assert.equal(spend.lookups, 8);
    assert.equal(app.world.state.enrichmentLookups.length, 8);
  });

  await t.test("A-tier: frontier brief, first email waits for a person; B-tier: local opener, sent in the send window", () => {
    const priya = byName(app, "Priya Raman");
    assert.equal(priya.priority, "A");
    assert.equal(priya.facts.openingSource, "frontier");
    assert.equal(emailsTo(app, "priya.raman@example.com").length, 0);
    const pending = app.store.listApprovals({ status: "pending" });
    assert.equal(pending.length, 3);
    assert.ok(pending.every((a) => a.approverId === "S-05"));

    const sofia = byName(app, "Sofia Alvarez");
    assert.equal(sofia.priority, "B");
    assert.equal(sofia.facts.openingSource, "local");
    const [first] = emailsTo(app, "sofia.alvarez@example.com");
    assert.match(first.body, /unsubscribe/, "CAN-SPAM opt-out present");
    assert.doesNotMatch(first.body, /Hi Sofia,\s+Sofia/, "no double greeting");

    const frontier = app.store.listModelCalls().filter((m) => m.outcome === "ok" && m.tier === "frontier");
    assert.equal(frontier.length, 3, "frontier spend only on the 3 A-tier owners");
  });

  await t.test("a person approves an A-tier first touch → it sends and the rest of the sequence is scheduled", async () => {
    const approval = app.store.listApprovals({ status: "pending" }).find((a) => a.summary.includes("Priya"));
    await sim.decideApproval(app, { approvalId: approval.id, decision: "approved", by: "Jamie Lee" });
    await app.settle();
    assert.equal(emailsTo(app, "priya.raman@example.com").length, 1);
    assert.ok(app.store.listTimers(byName(app, "Priya Raman").id).some((x) => x.kind === "sequence_step"));
  });

  await t.test("reply with a question → grounded answer from the service docs + meeting slots; '2' books it in FUB", async () => {
    await sim.email(app, { from: "sofia.alvarez@example.com", to: OWNERS_INBOX, subject: "Re: your rental", body: "Yes, I'd be open to a call. What are your fees?" });
    await app.settle();
    const offer = emailsTo(app, "sofia.alvarez@example.com").at(-1);
    assert.match(offer.body, /8% of collected rent/);
    assert.match(offer.body, /1\) Fri 10:00 AM/);

    await sim.email(app, { from: "sofia.alvarez@example.com", to: OWNERS_INBOX, subject: "Re: your rental", body: "2 works for me" });
    await app.settle();
    const sofia = byName(app, "Sofia Alvarez");
    assert.equal(sofia.status, "meeting_booked");
    assert.equal(app.world.state.fubAppointments.length, 1);
    assert.equal(app.world.state.fubPeople.find((p) => p.email === "sofia.alvarez@example.com").stage, "Appointment Set");
  });

  await t.test("'maybe after the holidays' → nurture with a dated check-back; 'unsubscribe' → suppressed for good", async () => {
    await sim.email(app, { from: "natalie.brooks@example.com", to: OWNERS_INBOX, subject: "Re", body: "Not a good time right now, maybe after the holidays." });
    await sim.email(app, { from: "beth.kowalski@example.com", to: OWNERS_INBOX, subject: "Re", body: "Please unsubscribe me." });
    await app.settle();
    const natalie = byName(app, "Natalie Brooks");
    assert.equal(natalie.status, "nurture");
    assert.match(natalie.facts.checkBackOn, /^2027-01/);
    const beth = byName(app, "Beth Kowalski");
    assert.equal(beth.status, "suppressed");
    assert.equal(app.store.getParty(beth.partyId).attributes.consent.email, "unsubscribed");
  });

  await t.test("an out-of-office auto-reply is not a reply", async () => {
    await sim.email(app, { from: "hassan.farouk@example.com", to: OWNERS_INBOX, subject: "Out of office", body: "I'm away until Monday.", headers: { "Auto-Submitted": "auto-replied" } });
    await app.settle();
    assert.equal(byName(app, "Hassan Farouk").status, "outreach");
  });

  await t.test("the sequence runs on timers; silence ends in nurture and teaches the bandit", async () => {
    await app.fastForward(14 * 24 * HOUR);
    const hassan = byName(app, "Hassan Farouk");
    assert.equal(hassan.status, "nurture");
    assert.equal(emailsTo(app, "hassan.farouk@example.com").length, 3);
    const bandit = app.store.getKV("leadgen:bandit");
    assert.ok(bandit.B[hassan.facts.variant].b > 0);
  });

  await t.test("learning cycle: refits the scorer on history + live outcomes, promotes only if better", () => {
    const entry = runLearningCycle(app.store, app.clock.now());
    assert.equal(entry.promoted, true);
    assert.ok(entry.holdoutLogLoss.candidate < entry.holdoutLogLoss.current);
    assert.ok(entry.liveSamples >= 1);
    const absentee = entry.changes.find((c) => c.feature === "absentee");
    assert.ok(absentee.to > absentee.from, "absentee owners convert better than the prior assumed");
    assert.equal(app.store.getKV("leadgen:weights").version, 1);
  });
});
