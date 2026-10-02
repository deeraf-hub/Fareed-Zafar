import { localParts, nextLocalTime, MINUTE } from "../../core/clock.js";

/**
 * Lead generation — deterministic rules: who is in the ideal customer profile, when
 * we may email, and the replies that never need a model to understand.
 */

export const MARKET_CITIES = new Set(["Austin", "Round Rock", "Pflugerville", "Cedar Park", "Georgetown", "Leander", "Hutto", "Kyle", "Buda", "Manor", "Lakeway"]);

/** ICP: owns 1–20 doors, all in our market, not already a client, not suppressed. */
export function icpCheck(record, { suppressed = false, existingClient = false } = {}) {
  const reasons = [];
  const props = record.properties ?? [];
  if (!props.length) reasons.push("no properties on record");
  if (props.some((p) => !MARKET_CITIES.has(p.city))) reasons.push(`property outside our market (${props.find((p) => !MARKET_CITIES.has(p.city)).city})`);
  if ((record.doors ?? 1) > 20) reasons.push(`${record.doors} doors — portfolio-size owner, route to a person`);
  if (existingClient) reasons.push("already a client");
  if (suppressed) reasons.push("on the suppression list");
  return { ok: reasons.length === 0, reasons };
}

/**
 * Cold email goes out in a business-hours window in the recipient's market
 * (Tue–Thu 9:30 AM tend to perform; we allow Mon–Fri 9:30–11:30 and 1:30–3:30).
 */
export function nextSendWindow(now, timeZone) {
  const { weekday, hour, minute } = localParts(now, timeZone);
  const t = hour * 60 + minute;
  const weekdayOk = weekday >= 1 && weekday <= 5;
  if (weekdayOk && ((t >= 570 && t < 690) || (t >= 810 && t < 930))) return now;
  let candidate = nextLocalTime(now, timeZone, t < 810 && t >= 690 && weekdayOk ? 13 : 9, 30);
  for (let i = 0; i < 7; i++) {
    const { weekday: d } = localParts(candidate, timeZone);
    if (d >= 1 && d <= 5) return candidate;
    candidate = nextLocalTime(new Date(candidate.getTime() + MINUTE), timeZone, 9, 30);
  }
  return candidate;
}

/** Three meeting slots on the owner-relations calendar: next business day 10 AM and 2 PM, the day after at 11 AM. */
export function offerSlots(now, timeZone) {
  const mornings = [];
  let cursor = nextLocalTime(new Date(now.getTime() + 2 * 60 * MINUTE), timeZone, 8, 0);
  while (mornings.length < 2) {
    const { weekday } = localParts(cursor, timeZone);
    if (weekday >= 1 && weekday <= 5) mornings.push(cursor);
    cursor = nextLocalTime(new Date(cursor.getTime() + MINUTE), timeZone, 8, 0);
  }
  const at = (morning, hour) => new Date(morning.getTime() + (hour - 8) * 60 * MINUTE).toISOString();
  return [at(mornings[0], 10), at(mornings[0], 14), at(mornings[1], 11)];
}

/** "2", "option 2", "#2", or the weekday/time of an offered slot. */
export function pickSlot(text, slots, timeZone) {
  const t = String(text ?? "").toLowerCase();
  const numeric = t.match(/^\s*(?:option\s*|#)?([123])\b/) ?? t.match(/\b(?:option|number|#)\s*([123])\b/);
  if (numeric) return Number(numeric[1]) - 1;
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const matches = slots
    .map((iso, i) => ({ i, p: localParts(new Date(iso), timeZone) }))
    .filter(({ p }) => t.includes(days[p.weekday]) || t.includes(days[p.weekday].slice(0, 3)))
    .filter(({ p }) => {
      const hour = t.match(/\b(\d{1,2})(?::\d{2})?\s*(am|pm)?\b/);
      if (!hour) return true;
      let h = Number(hour[1]);
      if (hour[2] === "pm" && h < 12) h += 12;
      if (!hour[2] && h < 8) h += 12;
      return h === p.hour;
    });
  return matches.length === 1 ? matches[0].i : null;
}

const NOT_INTERESTED = /\b(not interested|no thanks|no thank you|we('re| are) (all )?set|already have (a )?(property )?manag|we manage (it )?ourselves|not looking|please don'?t contact)\b/i;

/** Replies with one obvious meaning. Everything else is read by the local model. */
export function parseProspectReply(text) {
  const t = String(text ?? "");
  if (NOT_INTERESTED.test(t)) return /already have|manag/i.test(t) ? "already_managed" : "not_interested";
  if (/^\s*(yes|sure|interested|sounds good|let'?s talk|happy to chat)\b[^?]*$/i.test(t)) return "interested";
  return null;
}
