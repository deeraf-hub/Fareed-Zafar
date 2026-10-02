import { commitmentIssues, fairHousingIssues, foreignContactDetails, inQuietHours } from "./compliance.js";
import { HOUR, DAY, nextLocalTime } from "./clock.js";
import { usd } from "./format.js";

/**
 * The validation stage. Every planned action passes through these rules, in order,
 * before anything leaves the building:
 *
 *   block    — never allowed (opt-outs, fair-housing language, runaway agent)
 *   approve  — allowed only after a person says yes (spend over limit, sensitive
 *              cases, risky generated text, human has taken over)
 *   defer    — allowed later (quiet hours for non-urgent contact)
 *   allow    — goes to the outbox now
 *
 * Rules are plain functions so the full list reads like a policy document.
 */

const MESSAGE_OPS = new Set(["sendSms", "sendEmail"]);
const CONTACT_OPS = new Set(["sendSms", "sendEmail", "placeCall"]);
const QUIET_HOURS_ROLES = new Set(["tenant", "lead", "prospect", "owner"]);

const isMessage = (a) => MESSAGE_OPS.has(a.operation);
const isContact = (a) => CONTACT_OPS.has(a.operation);
const textOf = (a) => a.payload.body ?? a.payload.say ?? "";

const block = (rule, reason) => ({ verdict: "block", rule, reason });
const approve = (rule, reason, approverId = null) => ({ verdict: "approve", rule, reason, approverId });
const defer = (rule, reason, until) => ({ verdict: "defer", rule, reason, until });

export function createPolicy({ store, timezone }) {
  const hardRules = [
    function runawayGuard(a, c) {
      if (!c.caseRecord) return null;
      const since = new Date(c.now.getTime() - HOUR).toISOString();
      if (store.countCaseActionsSince(c.caseRecord.id, since) >= 40) return block("runawayGuard", "more than 40 actions on this case in an hour — agent paused");
      return null;
    },
    function smsOptOut(a, c) {
      if (a.operation === "sendSms" && c.recipient?.attributes?.consent?.sms === "revoked") return block("smsOptOut", "recipient replied STOP — SMS suppressed");
      return null;
    },
    function marketingEmailOptOut(a, c) {
      if (a.operation === "sendEmail" && a.purpose === "marketing" && c.recipient?.attributes?.consent?.email === "unsubscribed")
        return block("marketingEmailOptOut", "recipient unsubscribed from marketing email");
      return null;
    },
    function marketingSmsConsent(a, c) {
      if (a.operation === "sendSms" && a.purpose === "marketing" && c.recipient?.attributes?.consent?.sms !== "granted")
        return block("marketingSmsConsent", "no SMS marketing consent on file (TCPA) — use email");
      return null;
    },
    function canSpamFooter(a) {
      if (a.operation === "sendEmail" && a.purpose === "marketing" && !/unsubscribe/i.test(textOf(a)))
        return block("canSpamFooter", "marketing email without an unsubscribe line (CAN-SPAM)");
      return null;
    },
    function fairHousing(a) {
      if (!isMessage(a) || !["leasing", "marketing"].includes(a.purpose)) return null;
      const issues = fairHousingIssues(textOf(a));
      return issues.length ? block("fairHousing", `fair housing: ${issues.join("; ")}`) : null;
    },
  ];

  const humanRules = [
    function playbookRequested(a) {
      return a.requiresApproval ? approve("playbookRequested", a.requiresApproval, a.approverId ?? null) : null;
    },
    function generatedContent(a, c) {
      if (!a.generated || !isMessage(a)) return null;
      const text = textOf(a);
      const issues = [
        ...commitmentIssues(text),
        ...foreignContactDetails(text, c.allowedContacts ?? []).map((x) => `contains someone else's contact details (${x})`),
      ];
      if (issues.length) return approve("generatedContent", `model-written text ${issues.join("; ")}`);
      const max = a.operation === "sendSms" ? 480 : 4000;
      if (text.length > max) return approve("generatedContent", `model-written text is ${text.length} chars (max ${max})`);
      return null;
    },
    function spendLimit(a, c) {
      // Per the emergency SOP, the minimum work to stop active damage proceeds immediately.
      const limit = c.property?.attributes?.approvalLimitUsd;
      if (a.spendUsd && a.purpose !== "emergency" && limit !== undefined && a.spendUsd > limit)
        return approve("spendLimit", `${usd(a.spendUsd)} exceeds the owner's ${usd(limit)} pre-approval`, c.property.ownerId);
      return null;
    },
    function humanInControl(a, c) {
      if (isMessage(a) && c.caseRecord?.flags?.humanInControl && a.recipient?.partyId === c.caseRecord.partyId && a.purpose !== "emergency")
        return approve("humanInControl", "a team member has taken over this conversation");
      return null;
    },
    function sensitiveCase(a, c) {
      // Vetted templates (acknowledgements, safety steps) may go out; anything a model wrote waits for a person.
      if (isMessage(a) && a.generated && c.caseRecord?.flags?.legalSensitive && a.recipient?.partyId === c.caseRecord.partyId)
        return approve("sensitiveCase", "legal/health-sensitive case — model-written replies are approved by a person");
      return null;
    },
    function frequencyCap(a, c) {
      // Loop guard. Emergencies legitimately need many updates, so they have their own,
      // higher cap and don't count against the everyday one.
      if (!isMessage(a)) return null;
      const emergency = a.purpose === "emergency";
      const cap = emergency ? 15 : 6;
      const since = new Date(c.now.getTime() - DAY).toISOString();
      const sent = store.countMessagesTo(a.payload.to, since, { emergency });
      return sent >= cap ? approve("frequencyCap", `${sent} ${emergency ? "" : "non-emergency "}messages to this recipient in 24h (cap ${cap})`) : null;
    },
  ];

  const timingRules = [
    function quietHours(a, c) {
      // Quiet hours govern contact we initiate — not a reply the person is waiting for.
      if (!isContact(a) || a.purpose === "emergency" || a.inReplyTo || !QUIET_HOURS_ROLES.has(a.recipient?.role)) return null;
      const tz = c.property?.timezone ?? timezone;
      if (!inQuietHours(c.now, tz)) return null;
      return defer("quietHours", "quiet hours (9 PM–8 AM) — scheduled for 8:00 AM", nextLocalTime(c.now, tz, 8).toISOString());
    },
  ];

  /**
   * @param action  a planned action
   * @param ctx     { now, caseRecord, property, recipient, allowedContacts, approved }
   *                `approved: true` when a person already approved this exact action.
   */
  function check(action, ctx) {
    const groups = ctx.approved ? [hardRules, timingRules] : [hardRules, humanRules, timingRules];
    for (const rules of groups) {
      for (const rule of rules) {
        const verdict = rule(action, ctx);
        if (verdict) return verdict;
      }
    }
    return { verdict: "allow", rule: null, reason: null };
  }

  return {
    check,
    rules: [...hardRules, ...humanRules, ...timingRules].map((r) => r.name),
  };
}
