import { z } from "zod";
import { defineTask } from "../../models/task.js";
import { contextPack } from "../../models/context.js";
import { topicsOf, parseLeadReply, splitQuestions } from "./rules.js";

/**
 * Leasing — where a model helps, and why.
 *
 *   read_inquiry    local   free-text inquiries ("2 cats + a small dog, moving ~Nov 1, can I see it Sat?")
 *                           → structured fields. The ANSWERS then come from the listing record.
 *   classify_reply  local   replies the rule parser can't place (objections, mixed messages)
 *
 * Long-tail questions use the shared knowledge.answer task (retrieval-grounded).
 */

export const readInquiry = defineTask({
  name: "leasing.read_inquiry",
  why: "Rental inquiries are free text with several facts in one breath. Reading them is a small-model job; answering them is not a model job at all.",
  tiers: ["local", "frontier"],
  minConfidence: 0.5,
  maxOutputTokens: 260,
  schema: z.object({
    move_in_date: z.string().nullable().describe("ISO date YYYY-MM-DD if stated or clearly implied, else null"),
    household_size: z.number().nullable(),
    pets: z.array(z.object({ type: z.enum(["dog", "cat", "other"]), count: z.number(), weight_lb: z.number().nullable() })),
    wants_tour: z.boolean(),
    preferred_times: z.string().nullable(),
    questions: z.array(z.string()).describe("each distinct question, short, in the prospect's words"),
    confidence: z.number(),
  }),
  system: `You read rental inquiries for a property manager and extract facts. Reply with JSON that matches the schema.
Only record what the prospect actually said. Do not infer anything about protected characteristics (family status, religion, national origin, disability). Today's date is given so you can resolve relative dates.`,
  prompt: ({ text, today, listing }) =>
    contextPack(
      [
        { title: "Inquiry", body: text, priority: 1, maxTokens: 450 },
        { title: "Today", body: today, priority: 1 },
        { title: "Listing", body: listing, priority: 3, maxTokens: 60 },
      ],
      { budgetTokens: 600 }
    ).text,
  simulate: ({ text, today }) => {
    const t = String(text);
    const pets = [];
    const cats = t.match(/\b(\d+|one|two|three)\s+cats?\b/i) ?? (/\bcat\b/i.test(t) ? ["", "1"] : null);
    if (cats) pets.push({ type: "cat", count: wordNum(cats[1]), weight_lb: null });
    const dog = t.match(/\b(?:(\d+|one|two|a|small|little|big|large)\s+)?(?:[a-z]+\s+)?dogs?\b/i);
    if (dog) {
      const weight = t.match(/(\d{1,3})\s*(?:lb|lbs|pounds?)\b/i);
      pets.push({ type: "dog", count: wordNum(dog[1]) || 1, weight_lb: weight ? Number(weight[1]) : /\b(small|little)\b/i.test(t) ? 20 : null });
    }
    const month = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
    let moveIn = null;
    if (month) {
      const m = "janfebmaraprmayjunjulaugsepoctnovdec".indexOf(month[1].toLowerCase()) / 3;
      const year = Number(today.slice(0, 4)) + (m < Number(today.slice(5, 7)) - 1 ? 1 : 0);
      moveIn = `${year}-${String(m + 1).padStart(2, "0")}-${String(month[2]).padStart(2, "0")}`;
    }
    const questions = splitQuestions(t);
    return {
      move_in_date: moveIn,
      household_size: null,
      pets,
      wants_tour: /\b(see it|tour|showing|visit|view|look at)\b/i.test(t),
      preferred_times: t.match(/\b(this|next)\s+(weekend|saturday|sunday|week)\b|\b(saturday|sunday|monday|tuesday|wednesday|thursday|friday)\b/i)?.[0] ?? null,
      questions,
      confidence: 0.8,
    };
  },
});

export const classifyLeadReply = defineTask({
  name: "leasing.classify_reply",
  why: "After a tour, people answer in sentences (\"loved it but it's a stretch on price\"). Spotting the objection is classification — local-model work.",
  tiers: ["local", "frontier"],
  minConfidence: 0.55,
  maxOutputTokens: 160,
  schema: z.object({
    intent: z.enum(["schedule_tour", "question", "apply", "objection", "not_interested", "reschedule", "positive", "other"]),
    objection: z.enum(["price", "size", "condition", "location", "commute", "timing", "pets", "other"]).nullable(),
    question: z.string().nullable(),
    summary: z.string().describe("12 words or fewer"),
    confidence: z.number(),
  }),
  system: `You classify a rental prospect's reply for a leasing team. Reply with JSON that matches the schema.
An objection is a reason they might not rent (price, size, condition, location, commute, timing, pets). If they ask something, copy the question.`,
  prompt: ({ text, stage }) =>
    contextPack(
      [
        { title: "Reply", body: text, priority: 1, maxTokens: 300 },
        { title: "Where they are", body: stage, priority: 2 },
      ],
      { budgetTokens: 420 }
    ).text,
  simulate: ({ text }) => {
    const t = String(text);
    const parsed = parseLeadReply(t);
    let objection = null;
    if (/\b(price|pricey|expensive|stretch|budget|afford|too much|rent is high|high rent)\b/i.test(t)) objection = "price";
    else if (/\b(small|tiny|cramped|not enough room)\b/i.test(t)) objection = "size";
    else if (/\b(commute|far from|drive)\b/i.test(t)) objection = "commute";
    else if (/\b(dated|old|needs work|dirty|worn)\b/i.test(t)) objection = "condition";
    const question = splitQuestions(t)[0] ?? null;
    const intent = objection ? "objection" : parsed ?? (question ? "question" : /\b(loved|great|liked|nice|perfect)\b/i.test(t) ? "positive" : "other");
    return { intent, objection, question, summary: t.split(/\s+/).slice(0, 12).join(" "), confidence: intent === "other" ? 0.5 : 0.8 };
  },
});

export const leasingTasks = [readInquiry, classifyLeadReply];

function wordNum(w) {
  if (!w) return 1;
  const n = Number(w);
  if (!Number.isNaN(n)) return n;
  return { one: 1, two: 2, three: 3, a: 1 }[String(w).toLowerCase()] ?? 1;
}

export { topicsOf };
