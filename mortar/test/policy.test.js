import test from "node:test";
import assert from "node:assert/strict";
import { createPolicy } from "../src/core/policy.js";

// Policy is a list of plain rules; these pin the verdicts that matter most.
const quietStore = { countCaseActionsSince: () => 0, countMessagesTo: () => 0 };
const policy = createPolicy({ store: quietStore, timezone: "America/Chicago" });
const NIGHT = new Date("2026-10-08T04:30:00Z"); // 11:30 PM in Austin
const DAY = new Date("2026-10-08T16:00:00Z"); // 11:00 AM

const tenant = { id: "T-2B", role: "tenant", attributes: { consent: { sms: "granted", email: "granted" } } };
const sms = (extra = {}) => ({ operation: "sendSms", payload: { to: "+15125550142", body: "Hello" }, recipient: { partyId: tenant.id, role: "tenant" }, purpose: "transactional", ...extra });
const ctx = (extra = {}) => ({ now: DAY, caseRecord: { id: "MC-1", partyId: tenant.id, flags: {} }, property: { ownerId: "O-01", attributes: { approvalLimitUsd: 750 } }, recipient: tenant, allowedContacts: [], ...extra });

test("quiet hours defer contact we initiate — never emergencies or replies someone is waiting for", () => {
  assert.equal(policy.check(sms(), ctx({ now: NIGHT })).verdict, "defer");
  assert.equal(policy.check(sms({ purpose: "emergency" }), ctx({ now: NIGHT })).verdict, "allow");
  assert.equal(policy.check(sms({ inReplyTo: true }), ctx({ now: NIGHT })).verdict, "allow");
});

test("spend over the owner's limit needs approval; emergency mitigation is exempt (SOP)", () => {
  const order = (purpose) => ({ operation: "createWorkOrder", connector: "rentvine", payload: {}, spendUsd: 1150, purpose });
  const v = policy.check(order("transactional"), ctx());
  assert.equal(v.verdict, "approve");
  assert.equal(v.approverId, "O-01");
  assert.equal(policy.check(order("emergency"), ctx()).verdict, "allow");
});

test("hard rules block: STOP, fair-housing language, missing CAN-SPAM footer", () => {
  assert.equal(policy.check(sms(), ctx({ recipient: { ...tenant, attributes: { consent: { sms: "revoked" } } } })).verdict, "block");
  assert.equal(policy.check(sms({ purpose: "leasing", payload: { to: "+15125550161", body: "It's perfect for young professionals!" } }), ctx()).verdict, "block");
  const marketing = { operation: "sendEmail", payload: { to: "o@example.com", body: "Want help managing your rental?" }, recipient: { partyId: "PR-1", role: "prospect" }, purpose: "marketing" };
  assert.equal(policy.check(marketing, ctx({ recipient: { attributes: { consent: { email: "none" } } } })).rule, "canSpamFooter");
});

test("model-written text that promises or admits something waits for a person", () => {
  const v = policy.check(sms({ generated: true, payload: { to: "+15125550142", body: "Sorry — this is our fault and we'll pay for your hotel." } }), ctx());
  assert.equal(v.verdict, "approve");
  assert.match(v.reason, /promises payment|admits liability/);
});

test("approved actions skip the human rules but still obey hard and timing rules", () => {
  const risky = sms({ generated: true, payload: { to: "+15125550142", body: "We'll pay for the repair." } });
  assert.equal(policy.check(risky, ctx({ approved: true })).verdict, "allow");
  assert.equal(policy.check(risky, ctx({ approved: true, now: NIGHT })).verdict, "defer");
});

test("loop guards: runaway agent blocked, per-recipient caps", () => {
  const busy = createPolicy({ store: { countCaseActionsSince: () => 40, countMessagesTo: () => 0 }, timezone: "America/Chicago" });
  assert.equal(busy.check(sms(), ctx()).rule, "runawayGuard");
  const chatty = createPolicy({ store: { countCaseActionsSince: () => 0, countMessagesTo: () => 6 }, timezone: "America/Chicago" });
  assert.equal(chatty.check(sms(), ctx()).rule, "frequencyCap");
  assert.equal(chatty.check(sms({ purpose: "emergency" }), ctx()).verdict, "allow", "emergencies have their own, higher cap");
});
