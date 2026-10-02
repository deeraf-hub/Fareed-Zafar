import { localParts } from "./clock.js";

/**
 * Deterministic compliance checks. These never go to a model: they must be
 * predictable, auditable, and identical every time.
 */

// ── Opt-out (TCPA / CTIA). Twilio also enforces these keywords at the carrier level. ──
const OPT_OUT = /^\s*(stop|stopall|unsubscribe|cancel|end|quit|optout|opt out|revoke)\s*[.!]*\s*$/i;
const OPT_IN = /^\s*(start|unstop|yes start)\s*[.!]*\s*$/i;

export const isOptOut = (text) => OPT_OUT.test(String(text ?? ""));
export const isOptIn = (text) => OPT_IN.test(String(text ?? ""));

/** Email unsubscribe requests are usually phrased, not keywords. */
export const isUnsubscribeRequest = (text) =>
  isOptOut(text) || /\b(unsubscribe|remove me|take me off|stop (emailing|contacting|texting) me|do not contact)\b/i.test(String(text ?? ""));

// ── Fair housing: outbound leasing/marketing language that could steer or discriminate ──
const FAIR_HOUSING_PATTERNS = [
  [/\b(no|not for|ideal for|perfect for|great for|best for|suited for)\s+(kids|children|families|singles|couples|seniors|students|young professionals|christians|muslims|jews|immigrants)\b/i, "describes the ideal or excluded resident"],
  [/\b(adults? only|no children|mature (person|people|couple|residents?))\b/i, "familial-status restriction"],
  [/\b(christian|muslim|jewish|catholic|hindu|church|mosque|synagogue|temple)\s+(community|neighborhood|area|family|families|home)\b/i, "religious characterization"],
  [/\b(english[- ]speaking|must speak english|no immigrants|american[- ]born)\b/i, "national-origin restriction"],
  [/\b(able[- ]bodied|no (wheelchairs?|disabled|handicapped)|must be able to (walk|climb))\b/i, "disability restriction"],
  [/\b(safe|unsafe|good|bad|dangerous|rough|sketchy)\s+(neighborhood|neighbourhood|area|part of town)\b/i, "characterizes neighborhood (steering risk)"],
  [/\b(white|black|hispanic|latino|asian|ethnic|integrated|exclusive)\s+(neighborhood|area|community)\b/i, "racial or ethnic characterization"],
];

export function fairHousingIssues(text) {
  return FAIR_HOUSING_PATTERNS.filter(([re]) => re.test(String(text ?? ""))).map(([, why]) => why);
}

/** Inbound questions that must get the standard objective-resources answer, not an opinion. */
export const isSteeringQuestion = (text) =>
  /\b(is (it|the (area|neighborhood|neighbourhood)) safe|crime|demographics?|who lives (there|here|in the)|what kind of (people|neighbors)|diverse|good schools)\b/i.test(
    String(text ?? "")
  );

// ── Generated text: promises or admissions a model must never make on our behalf ──
const COMMITMENT_PATTERNS = [
  [/\bwe('| wi)ll (pay|cover|reimburse|refund|compensate)\b/i, "promises payment"],
  [/\b(guarantee|guaranteed)\b/i, "makes a guarantee"],
  [/\b(our fault|we are (responsible|liable)|we('re| are) to blame|negligen)/i, "admits liability"],
  [/\b(waive|discount|free month|lower (the )?rent)\b/i, "offers a concession"],
  [/\b(legal advice|you should sue|withhold(ing)? rent is (fine|ok|allowed))\b/i, "gives legal advice"],
];

export function commitmentIssues(text) {
  return COMMITMENT_PATTERNS.filter(([re]) => re.test(String(text ?? ""))).map(([, why]) => why);
}

/** Phone numbers or emails in text that aren't on the allow-list (other people's PII). */
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

export function foreignContactDetails(text, allowed = []) {
  const norm = (s) => (s.includes("@") ? s.toLowerCase() : s.replace(/\D/g, "").slice(-10));
  const allow = new Set(allowed.filter(Boolean).map((a) => norm(String(a))));
  const found = [...(String(text).match(PHONE_RE) ?? []), ...(String(text).match(EMAIL_RE) ?? [])];
  return found.filter((f) => !allow.has(norm(f)));
}

// ── Quiet hours (TCPA allows 8 AM – 9 PM recipient local time for non-urgent contact) ──
export function inQuietHours(date, timeZone, { start = 21, end = 8 } = {}) {
  const { hour } = localParts(date, timeZone);
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
}
