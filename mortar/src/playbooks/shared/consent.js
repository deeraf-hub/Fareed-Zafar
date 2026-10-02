import { isOptIn, isOptOut, isUnsubscribeRequest } from "../../core/compliance.js";

/**
 * Consent changes are handled the same way in every playbook, before anything else:
 * deterministically, recorded on the person (long-term memory), honored by policy.
 *
 * Twilio replies to STOP itself and blocks further sends from that number, but it
 * still forwards the STOP to us — and consent must hold across every sender we use,
 * so Mortar keeps its own record. Since April 2025, revocation "by any reasonable
 * means" counts, so phrased requests ("please stop texting me") are honored too.
 */
export function consentChange(event, sender, now) {
  if (event.type !== "message.received" || !sender) return null;
  const text = event.payload.text ?? "";
  const channel = event.payload.channel;
  const consent = sender.attributes?.consent ?? {};
  const at = now.toISOString();

  if (channel === "sms" && (isOptOut(text) || isUnsubscribeRequest(text))) {
    return {
      rule: "sms_opt_out",
      summary: `${sender.name} opted out of SMS — suppressed across all numbers (Twilio sends the confirmation)`,
      partyUpdates: [{ partyId: sender.id, attributes: { consent: { ...consent, sms: "revoked", smsChangedAt: at } } }],
    };
  }
  if (channel === "sms" && isOptIn(text)) {
    return {
      rule: "sms_opt_in",
      summary: `${sender.name} opted back in to SMS`,
      partyUpdates: [{ partyId: sender.id, attributes: { consent: { ...consent, sms: "granted", smsChangedAt: at } } }],
    };
  }
  if (channel === "email" && isUnsubscribeRequest(text)) {
    return {
      rule: "email_unsubscribe",
      summary: `${sender.name} unsubscribed from marketing email`,
      partyUpdates: [{ partyId: sender.id, attributes: { consent: { ...consent, email: "unsubscribed", emailChangedAt: at } } }],
    };
  }
  return null;
}

/** YES / NO answers to an approval request sent by SMS ("Reply YES to approve"). */
export function approvalAnswer(text) {
  const value = String(text ?? "").trim();
  if (/^(yes|y|approve(d)?|ok(ay)?|go ahead|do it|sounds good)\b/i.test(value)) return "approved";
  if (/^(no|n|reject(ed)?|decline(d)?|don'?t|hold off|wait)\b/i.test(value)) return "rejected";
  return null;
}
