import { z } from "zod";
import { defineTask } from "../../models/task.js";
import { contextPack } from "../../models/context.js";
import { parseProspectReply } from "./rules.js";

/**
 * Lead generation — model spend is allocated by expected value:
 *
 *   research_brief   frontier   A-tier only (a few a day): synthesize the signals into an
 *                               angle worth a person's review. ~$0.02 against a client worth
 *                               thousands a year.
 *   personalize      local      B-tier at volume: one natural opening line from structured
 *                               facts. Falls back to a deterministic opener.
 *   read_reply       local      every reply the rules can't place; frontier only if unsure.
 *
 * C-tier gets no enrichment spend and no model calls at all. Scoring is plain math.
 */

const facts = ({ first, properties, signals, mailingCity, doors, enrichment }) => ({
  first,
  owns: `${doors} door(s)`,
  mailing_city: mailingCity,
  properties: properties.map((p) => `${p.address}, ${p.city} — ${p.listedForRent ? `listed ${p.daysOnMarket} days${p.priceCuts ? `, ${p.priceCuts} price cut(s)` : ""}` : "not listed"}`).join("; "),
  signals: signals.join("; "),
  occupation: enrichment?.title ?? "unknown",
});

export const researchBrief = defineTask({
  name: "leadgen.research_brief",
  why: "Top-tier prospects only: turning several weak signals into one credible angle is judgment, and the value per prospect justifies a frontier call. A person reviews the first email.",
  tiers: ["frontier", "local"],
  effort: "low",
  maxOutputTokens: 400,
  schema: z.object({
    angle: z.string().describe("the single most relevant reason to talk, 15 words or fewer"),
    opening_line: z.string().describe("first sentence of the email body (after 'Hi {first},'), 30 words or fewer, specific and factual"),
    hooks: z.array(z.string()),
    avoid: z.array(z.string()).describe("things not to say"),
    confidence: z.number(),
  }),
  system: `You help a property management company write the first line of a cold email to a rental-property owner. Reply with JSON that matches the schema.
Use only the facts provided. Be specific and respectful; never imply you know private information, never mention evictions, code violations or financial distress directly, and never pressure. Plain language, no hype.
The email already opens with "Hi {first}," — don't start the line with a greeting or their name.`,
  prompt: (input) => contextPack([{ title: "Owner facts", body: facts(input), priority: 1, maxTokens: 300 }], { budgetTokens: 380 }).text,
  simulate: ({ first, properties, mailingCity, signals }) => {
    const listed = properties.find((p) => p.listedForRent && p.daysOnMarket > 30) ?? properties[0];
    const remote = signals.some((s) => /out of state/i.test(s));
    return {
      angle: remote ? "Long-distance owner with a rental sitting vacant" : "Rental sitting vacant longer than the market",
      opening_line: remote
        ? `Keeping ${listed.address} filled from ${mailingCity} can't be easy — it's been listed about ${Math.round(listed.daysOnMarket / 7)} weeks, while similar ${listed.city} homes are leasing in about three.`
        : `I noticed ${listed.address} has been on the rental market for about ${Math.round(listed.daysOnMarket / 7)} weeks — longer than most ${listed.city} homes right now.`,
      hooks: ["21-day average time to lease", "no fee while vacant", "free rent estimate"],
      avoid: ["mentioning price cuts directly", "assuming financial stress"],
      confidence: 0.82,
    };
  },
});

export const personalize = defineTask({
  name: "leadgen.personalize",
  why: "B-tier volume: one natural, specific opening line. Small local model, zero marginal cost; a deterministic opener is the fallback.",
  tiers: ["local"],
  maxOutputTokens: 120,
  schema: z.object({ opening_line: z.string().describe("30 words or fewer"), confidence: z.number() }),
  system: `Write the first sentence of a short, friendly email from a property manager to a rental-property owner. Reply with JSON that matches the schema.
Use only the facts given. Specific, factual, no hype, no pressure, never mention evictions, violations or money trouble. 30 words or fewer.
The email already opens with "Hi {first}," — don't start with a greeting or their name.`,
  prompt: (input) => contextPack([{ title: "Owner facts", body: facts(input), priority: 1, maxTokens: 250 }], { budgetTokens: 300 }).text,
  simulate: ({ first, properties, mailingCity, signals }) => {
    const p = properties[0];
    const remote = signals.some((s) => /out of state/i.test(s));
    const line = p.listedForRent
      ? `I saw ${p.address} is up for rent in ${p.city}${remote ? ` — managing it from ${mailingCity} must keep you busy` : ""}.`
      : `I work with a number of owners near ${p.address} in ${p.city}${remote ? ` and know managing from ${mailingCity} takes coordination` : ""}, so I thought a quick hello might be useful.`;
    return { opening_line: line, confidence: 0.8 };
  },
});

export const readReply = defineTask({
  name: "leadgen.read_reply",
  why: "Owners reply in sentences (“maybe after the holidays — what do you charge?”). Intent + date + question extraction is classification: local first, frontier only when unsure.",
  tiers: ["local", "frontier"],
  minConfidence: 0.6,
  maxOutputTokens: 200,
  schema: z.object({
    intent: z.enum(["interested", "question", "not_now", "not_interested", "already_managed", "wrong_person", "referral", "other"]),
    follow_up_date: z.string().nullable().describe("YYYY-MM-DD if they say when to check back"),
    question: z.string().nullable(),
    sentiment: z.enum(["positive", "neutral", "negative"]),
    confidence: z.number(),
  }),
  system: `You read replies to a property manager's outreach email and classify them. Reply with JSON that matches the schema.
"interested" = open to a call or more info. "question" = asks something but isn't clearly interested. "not_now" = interested later; give follow_up_date when they say when. Copy any question verbatim.`,
  prompt: ({ text, today }) => contextPack([{ title: "Reply", body: text, priority: 1, maxTokens: 300 }, { title: "Today", body: today, priority: 1 }], { budgetTokens: 360 }).text,
  simulate: ({ text, today }) => {
    const t = String(text);
    const parsed = parseProspectReply(t);
    const question = t.split(/(?<=[.!?])\s+/).find((s) => s.trim().endsWith("?")) ?? null;
    let intent = parsed ?? "other";
    let followUp = null;
    const later = t.match(/\b(after the holidays|next year|in (january|february|march|april|may|june|july|august|september|october|november|december)|next (month|quarter|spring|summer))\b/i);
    if (later) {
      intent = "not_now";
      const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
      const named = months.indexOf((later[2] ?? "").toLowerCase());
      const year = Number(today.slice(0, 4));
      const month = named >= 0 ? named : /holidays|next year/i.test(later[0]) ? 0 : (Number(today.slice(5, 7)) % 12);
      followUp = `${month < Number(today.slice(5, 7)) - 1 || /holidays|next year/i.test(later[0]) ? year + 1 : year}-${String(month + 1).padStart(2, "0")}-05`;
    } else if (!parsed && question) intent = /\b(yes|sure|interested|sounds good|open to)\b/i.test(t) ? "interested" : "question";
    else if (!parsed && /\b(wrong (person|number|email)|not the owner|sold (it|the house))\b/i.test(t)) intent = "wrong_person";
    else if (!parsed && /\b(my (friend|brother|sister|neighbor)|you should (talk|reach out) to)\b/i.test(t)) intent = "referral";
    return { intent, follow_up_date: followUp, question, sentiment: /\b(no|not|stop)\b/i.test(t) ? "negative" : /\b(yes|great|sure|thanks)\b/i.test(t) ? "positive" : "neutral", confidence: intent === "other" ? 0.45 : 0.8 };
  },
});

export const leadgenTasks = [researchBrief, personalize, readReply];
