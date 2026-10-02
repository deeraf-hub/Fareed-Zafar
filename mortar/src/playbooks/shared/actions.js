/**
 * Action builders shared by every playbook. An action is a declarative description
 * of one side effect; nothing runs until the policy allows it and the outbox picks
 * it up. `key` must be unique per logical action within a case (it becomes part of
 * the idempotency key); `once: true` makes it unique per case regardless of event.
 */

const recipientOf = (party) => ({ partyId: party.id, role: party.role, name: party.name });

export function sms({ key, to, body, purpose, from = null, label, ...extra }) {
  return {
    key,
    connector: "twilio",
    operation: "sendSms",
    label: label ?? `SMS → ${to.name}`,
    payload: { to: to.phone, body, ...(from ? { from } : {}) },
    recipient: recipientOf(to),
    purpose,
    ...extra,
  };
}

export function email({ key, to, subject, body, purpose, label, ...extra }) {
  return {
    key,
    connector: "email",
    operation: "sendEmail",
    label: label ?? `Email → ${to.name}`,
    payload: { to: to.email, subject, body },
    recipient: recipientOf(to),
    purpose,
    ...extra,
  };
}

export function call({ key, to, say, gather, caseId, purpose, label, ...extra }) {
  return {
    key,
    connector: "twilio",
    operation: "placeCall",
    label: label ?? `Call → ${to.name}`,
    payload: { to: to.phone, say, gather, caseId },
    recipient: recipientOf(to),
    purpose,
    ...extra,
  };
}

/** Reach a person on their preferred channel (or every channel, for emergencies). */
export function notify({ key, to, body, subject, purpose, channels, ...extra }) {
  const wanted = channels ?? [to.attributes?.preferredChannel ?? (to.phone ? "sms" : "email")];
  const actions = [];
  if (wanted.includes("sms") && to.phone) actions.push(sms({ key: `${key}-sms`, to, body, purpose, ...extra }));
  if (wanted.includes("email") && to.email) actions.push(email({ key: `${key}-email`, to, subject: subject ?? "Update from Northwind Residential", body, purpose, ...extra }));
  if (!actions.length && to.phone) actions.push(sms({ key: `${key}-sms`, to, body, purpose, ...extra }));
  if (!actions.length && to.email) actions.push(email({ key: `${key}-email`, to, subject: subject ?? "Update from Northwind Residential", body, purpose, ...extra }));
  return actions;
}

export const firstName = (party) => String(party?.name ?? "there").split(/\s+/)[0];
