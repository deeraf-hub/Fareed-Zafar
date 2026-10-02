import { randomBytes } from "node:crypto";
import { fromInboundEmail, fromNormalized, fromTwilioGather, fromTwilioSms } from "../core/events.js";
import { LINES } from "./seed.js";

/**
 * Play the other side of the conversation in the demo and the tests. Each helper
 * builds the exact payload the real provider would POST (Twilio form fields, an
 * inbound-email JSON, a Rentvine/ShowMojo notification relayed by n8n) and runs it
 * through the same normalizer the webhook routes use — so the pipeline can't tell
 * a simulated event from a real one.
 */

const sid = (prefix) => `${prefix}${randomBytes(16).toString("hex")}`;
const lineFor = (playbook, channel) => Object.entries(LINES).find(([, l]) => l.playbook === playbook && l.channel === channel)?.[0];

export async function sms(app, { from, body, to = lineFor("maintenance", "sms") }) {
  app.world.recordInbound({ channel: "sms", from, to, body });
  return app.ingest(fromTwilioSms({ MessageSid: sid("SM"), From: from, To: to, Body: body, NumMedia: "0" }, app.clock.now().toISOString()));
}

export async function email(app, { from, subject, body, to = lineFor("maintenance", "email"), headers = {} }) {
  app.world.recordInbound({ channel: "email", from, to, subject, body });
  return app.ingest(
    fromInboundEmail({ messageId: `<${sid("")}@mail.example>`, from, to, subject, text: body, headers, date: app.clock.now().toISOString() }, app.clock.now().toISOString())
  );
}

/** Someone presses a key on the most recent call Mortar placed to their phone. */
export async function keypress(app, { phone, digits }) {
  const call = [...app.world.state.calls].reverse().find((c) => c.to === phone);
  if (!call) throw new Error(`No call was placed to ${phone}`);
  app.world.markCall(call.sid, digits === "1" ? "accepted" : digits === "2" ? "declined" : "answered");
  return app.ingest(fromTwilioGather({ CallSid: call.sid, Digits: digits, To: phone, From: call.from ?? "" }, { caseId: call.caseId, ref: call.gather?.ref }, app.clock.now().toISOString()));
}

/** A Rentvine work-order status change, as relayed (and signed) by n8n. */
export async function rentvineWorkOrder(app, { workOrderId, status }) {
  app.world.changeWorkOrder(workOrderId, status);
  return app.ingest(fromNormalized({ id: `rv-${workOrderId}-${status}-${Date.now()}`, event: "workorder.updated", workOrderId, status }, "rentvine", app.clock.now().toISOString()));
}

/** A ShowMojo lead/showing notification, as relayed by n8n. */
export async function showmojo(app, body) {
  return app.ingest(fromNormalized({ id: `sm-${sid("")}`, ...body }, "showmojo", app.clock.now().toISOString()));
}

/** Lead-gen discovery: one event per owner record from a data source (county records + listings). */
export async function discover(app, records, source = "county-records + rental-listings (demo)") {
  const results = [];
  for (const record of records) {
    results.push(await app.ingest({ type: "prospect.discovered", source: "leadgen-source", idempotencyKey: `prospect:${record.id}`, occurredAt: app.clock.now().toISOString(), subject: {}, payload: { source, record } }));
  }
  return results;
}

/** Decide a pending approval from the console. */
export async function decideApproval(app, { approvalId, decision, by = "Sam Patel", edits = {} }) {
  const approval = app.store.getApproval(approvalId);
  return app.ingest({
    type: "approval.decided",
    source: "console",
    idempotencyKey: `approval:${approvalId}:${decision}`,
    occurredAt: app.clock.now().toISOString(),
    subject: { caseId: approval.caseId },
    payload: { approvalId, decision, by, edits },
  });
}
