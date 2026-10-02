import test from "node:test";
import assert from "node:assert/strict";
import { testApp, messagesTo, onlyCase } from "./helpers.js";
import * as sim from "../src/demo/simulate.js";

const DENISE = { phone: "+15125550131", email: "denise.carter@example.com" };
const MESSAGE =
  "This is the third time I'm writing about the mold smell in the bathroom. My son has asthma and I'm not paying rent until this is fixed properly. If nobody does anything I'm calling a lawyer.";

test("legal + health-sensitive message: frontier model drafts, a person approves", async () => {
  const app = testApp();
  await sim.sms(app, { from: DENISE.phone, body: MESSAGE });
  await app.settle();

  const c = onlyCase(app, "maintenance");
  assert.equal(c.status, "human_review");
  assert.equal(c.flags.legalSensitive, true);

  // The vetted acknowledgement goes out immediately; the model-written reply does not.
  const sent = messagesTo(app, DENISE.phone);
  assert.equal(sent.length, 1);
  assert.match(sent[0].body, /escalated case MC-0001 to Sam Patel/);

  const [approval] = app.store.listApprovals({ status: "pending" });
  assert.match(approval.reason, /model-written replies are approved by a person/);
  assert.match(approval.actions[0].payload.body, /underlying cause/);

  // The frontier model saw structured history (2 prior work orders), not transcripts.
  const frontier = app.store.listModelCalls().filter((m) => m.tier === "frontier" && m.outcome === "ok");
  assert.equal(frontier.length, 1);
  assert.equal(frontier[0].task, "maintenance.sensitive_reply");
  assert.ok(frontier[0].inputTokens < 1200, `context pack stayed small (${frontier[0].inputTokens} tokens)`);

  // The manager gets a brief by email.
  const brief = app.world.state.messages.find((m) => m.to === "sam@northwind.example");
  assert.match(brief.body, /3rd report of mold/);

  // A person edits and approves → the edited text is what goes out.
  await sim.decideApproval(app, { approvalId: approval.id, decision: "approved", edits: { "sensitive-reply-sms": { body: "Hi Denise — Sam here. I'm so sorry. I'll call you at 9 AM and a mold specialist is booked for tomorrow." } } });
  await app.settle();
  assert.match(messagesTo(app, DENISE.phone).at(-1).body, /Sam here/);
});

test("no frontier model available → the manager still gets a deterministic brief", async () => {
  const app = testApp({ providers: {} });
  await sim.sms(app, { from: DENISE.phone, body: MESSAGE });
  await app.settle();
  const c = onlyCase(app, "maintenance");
  assert.equal(c.status, "human_review");
  assert.equal(app.store.listApprovals({ status: "pending" }).length, 0, "nothing model-written to approve");
  const brief = app.world.state.messages.find((m) => m.to === "sam@northwind.example");
  assert.match(brief.body, /Concerns: legal threat, rent withholding, health risk, repeat issue/);
});
