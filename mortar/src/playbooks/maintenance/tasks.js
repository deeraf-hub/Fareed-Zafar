import { z } from "zod";
import { defineTask } from "../../models/task.js";
import { contextPack } from "../../models/context.js";
import { assessMessage, parseVendorReply, parseNeighborReply, parseCheckinReply, isPleasantry } from "./rules.js";

/**
 * Maintenance — the only four places a model is involved, and why.
 *
 *   triage          local → frontier   no rule matched, the message is long/mixed, or hazard words
 *                                      sit behind a routine rule (a second look — it can only raise)
 *   vendor_report   local → frontier   a vendor's free-text findings → structured follow-up work
 *   classify_reply  local → frontier   a reply the deterministic parsers couldn't read
 *   sensitive_reply frontier only      legal/health-sensitive drafting (a person approves it)
 *
 * Everything else in this playbook — severity for emergencies, safety steps, vendor
 * selection, escalation, ETAs, YES/NO/1/2 replies, timers — is ordinary code.
 */

const CATEGORIES = [
  "water_leak", "plumbing", "electrical", "hvac", "appliance", "gas", "fire", "sewage", "security",
  "lockout", "pest", "mold", "life_safety_device", "structural", "general", "non_maintenance",
];

export const triage = defineTask({
  name: "maintenance.triage",
  why: "No rule matched, the message is long and mixed, or a routine rule fired on a message with hazard words (a second look that can only raise severity). A small local model reads intent well; frontier only if it is unsure.",
  tiers: ["local", "frontier"],
  minConfidence: 0.6,
  maxOutputTokens: 200,
  schema: z.object({
    is_maintenance: z.boolean(),
    category: z.enum(CATEGORIES),
    urgency: z.enum(["P1", "P2", "P3"]),
    summary: z.string().describe("15 words or fewer, plain language"),
    room: z.string().nullable(),
    hazards: z.array(z.enum(["active_water", "electrical_near_water", "gas", "fire", "injury", "sewage", "none"])),
    confidence: z.number().describe("probability from 0 to 1 that the urgency is right"),
  }),
  system: `You triage messages sent to a residential property manager's maintenance line. Reply with JSON that matches the schema.
Urgency:
- P1: life safety or active property damage happening now (water coming in, gas smell, fire or smoke, sparks, sewage backup, break-in, injury).
- P2: affects habitability or risks damage within 24 hours (no heat or AC, no water, refrigerator out, lockout, mold, a spreading ceiling stain).
- P3: routine repairs.
If the message is not about the condition of the home (rent, lease, parking, noise, packages), set is_maintenance to false and category to non_maintenance, urgency P3.
When torn between two urgency levels, choose the more urgent one.`,
  prompt: ({ text, home }) =>
    contextPack(
      [
        { title: "Message from resident", body: text, priority: 1, maxTokens: 500 },
        { title: "Home", body: home, priority: 2, maxTokens: 80 },
      ],
      { budgetTokens: 650 }
    ).text,
  simulate: ({ text }) => {
    const a = assessMessage(text);
    const nonMaintenance = !a.severity && /\b(rent|lease|renew|parking|package|noise|deposit|pay(ment)?|portal|move[- ]out)\b/i.test(text);
    return {
      is_maintenance: !nonMaintenance,
      category: nonMaintenance ? "non_maintenance" : a.category ?? "general",
      urgency: a.severity ?? (nonMaintenance ? "P3" : /\b(spreading|getting worse|wet|damp|drip)\b/i.test(text) ? "P2" : "P3"),
      summary: String(text).split(/[.!?]/)[0].split(/\s+/).slice(0, 15).join(" "),
      room: a.room,
      hazards: a.safety === "water" ? ["active_water"] : a.safety ? [a.safety === "electrical" ? "electrical_near_water" : a.safety].filter((h) => ["gas", "fire", "injury", "sewage", "electrical_near_water"].includes(h)) : ["none"],
      confidence: a.severity || nonMaintenance ? 0.85 : 0.65,
    };
  },
});

export const vendorReport = defineTask({
  name: "maintenance.vendor_report",
  why: "Vendors write findings in free text ('burst line under 3B vanity, drywall needs replacing, ~$1,150'). Turning that into follow-up work orders is extraction — a local model's job.",
  tiers: ["local", "frontier"],
  minConfidence: 0.5,
  maxOutputTokens: 300,
  schema: z.object({
    status: z.enum(["accepted", "declined", "on_site", "mitigated", "completed", "delayed", "other"]),
    eta_minutes: z.number().nullable(),
    root_cause: z.string().nullable().describe("12 words or fewer"),
    source_unit: z.string().nullable().describe("unit label where the problem originated, e.g. 3B"),
    work_done: z.string().nullable(),
    follow_up_work: z.array(
      z.object({
        trade: z.enum(["plumbing", "drywall", "paint", "water_mitigation", "electrical", "mold", "general"]),
        description: z.string(),
        estimate_usd: z.number().nullable(),
      })
    ),
    confidence: z.number(),
  }),
  system: `You read updates that maintenance vendors send about a job and turn them into structured status. Reply with JSON that matches the schema.
Use only facts stated in the message — never invent costs, units or causes. "mitigated" means the active problem is stopped but repairs remain; "completed" means nothing else is needed.`,
  prompt: ({ text, job }) =>
    contextPack(
      [
        { title: "Vendor message", body: text, priority: 1, maxTokens: 450 },
        { title: "Job", body: job, priority: 2, maxTokens: 80 },
      ],
      { budgetTokens: 600 }
    ).text,
  simulate: ({ text, job }) => {
    const parsed = parseVendorReply(text);
    const units = [...String(text).matchAll(/\b(\d{1,2}[A-Z])\b/g)].map((m) => m[1]);
    const followUps = [];
    if (/\bdrywall|ceiling (needs|repair)|cut out\b/i.test(text)) {
      followUps.push({ trade: "drywall", description: `Replace water-damaged drywall${job?.unit ? ` in ${job.unit}` : ""}`, estimate_usd: parsed.estimateUsd });
    }
    if (/\b(dry(ing)? out|fans|dehumidif|mitigation)\b/i.test(text)) followUps.push({ trade: "water_mitigation", description: "Dry out affected area", estimate_usd: null });
    const cause = String(text).match(/\b(burst|broken|cracked|failed|loose|leaking)\s+([a-z ]{3,28}?)(?=\s+(under|in|at|behind|on)\b|[,.])/i);
    return {
      status: parsed.status === "completed" && followUps.length ? "mitigated" : parsed.status ?? "other",
      eta_minutes: parsed.etaMinutes,
      root_cause: cause ? `${cause[1]} ${cause[2]}`.toLowerCase() : null,
      source_unit: units.find((u) => u !== job?.unit) ?? null,
      work_done: String(text).match(/\b(replaced|repaired|shut off|capped)[^.]*/i)?.[0] ?? null,
      follow_up_work: followUps,
      confidence: parsed.status ? 0.8 : 0.45,
    };
  },
});

export const classifyReply = defineTask({
  name: "maintenance.classify_reply",
  why: "Most replies are parsed by rules (1/2, YES/NO, 'all dry', 'thanks'). The rest — hedged or mixed replies — need a reader. A local model is enough.",
  tiers: ["local", "frontier"],
  minConfidence: 0.55,
  maxOutputTokens: 150,
  schema: z.object({
    intent: z.enum(["issue_resolved", "still_happening", "possible_leak", "no_leak_found", "question", "new_issue", "update", "thanks", "other"]),
    needs_human: z.boolean(),
    summary: z.string().describe("12 words or fewer"),
    confidence: z.number(),
  }),
  system: `You classify a reply in an ongoing maintenance case for a property manager. Reply with JSON that matches the schema.
"possible_leak" means the person reports any sign of water — damp, wet, dripping — even if unsure. Set needs_human when the person is upset, asks for a person, or raises something the agent cannot act on.`,
  prompt: ({ text, who, askedFor, caseSummary }) =>
    contextPack(
      [
        { title: "Reply", body: text, priority: 1, maxTokens: 300 },
        { title: "Who replied", body: who, priority: 2 },
        { title: "What we asked them", body: askedFor, priority: 2 },
        { title: "Case summary", body: caseSummary, priority: 3, maxTokens: 120 },
      ],
      { budgetTokens: 500 }
    ).text,
  simulate: ({ text }) => {
    const neighbor = parseNeighborReply(text);
    const checkin = parseCheckinReply(text);
    let intent = "update";
    if (/\b(damp|wet|drip|water|moist|puddle)\b/i.test(text) && !/\b(dry|no water)\b/i.test(text)) intent = "possible_leak";
    else if (neighbor === "no_leak") intent = "no_leak_found";
    else if (checkin === "stopped") intent = "issue_resolved";
    else if (checkin === "still_leaking") intent = "still_happening";
    else if (isPleasantry(text)) intent = "thanks";
    else if (/\?\s*$/.test(text)) intent = "question";
    const near = String(text).match(/\b(?:near|by|under|around|behind)\s+(?:my\s+|the\s+)?([a-z]+(?:\s+[a-z]+)?)/i)?.[1];
    const summary =
      intent === "possible_leak" ? `possible dampness${near ? ` near the ${near.toLowerCase()}` : ""}` : String(text).split(/\s+/).slice(0, 12).join(" ");
    return {
      intent,
      needs_human: /\b(angry|unacceptable|manager|person|lawyer|ridiculous)\b/i.test(text),
      summary,
      confidence: intent === "update" ? 0.5 : 0.75,
    };
  },
});

export const sensitiveReply = defineTask({
  name: "maintenance.sensitive_reply",
  why: "Legal threats, rent withholding and health risk in one message: the wording matters, the volume is tiny, and a person approves the draft. Worth a frontier model.",
  tiers: ["frontier"],
  effort: "medium",
  maxOutputTokens: 700,
  cacheable: false,
  schema: z.object({
    reply_to_resident: z.string().describe("120 words or fewer"),
    internal_brief: z.string().describe("80 words or fewer, for the property manager"),
    risk_flags: z.array(z.enum(["legal_threat", "rent_withholding", "health_risk", "repeat_issue", "habitability", "other"])),
    recommended_next_steps: z.array(z.string()),
    confidence: z.number(),
  }),
  system: `You draft messages for a property manager replying to a resident whose message is legally or medically sensitive. A person reviews your draft before anything is sent.
Rules for reply_to_resident: warm, specific and brief (120 words or fewer). Acknowledge the problem and its impact without admitting fault or liability. Do not give legal advice and do not discuss rent withholding or the resident's legal options. Do not promise compensation, refunds or outcomes. Commit only to the next step and timeframe you are given. Sign off as the property management team.
internal_brief: what happened, relevant history, risks, and what the manager should do next.`,
  prompt: ({ text, resident, history, nextStep, policy }) =>
    contextPack(
      [
        { title: "Resident's message", body: text, priority: 1, maxTokens: 450 },
        { title: "Resident", body: resident, priority: 1 },
        { title: "Relevant history (structured facts, not transcripts)", body: history, priority: 2, maxTokens: 200 },
        { title: "Committed next step", body: nextStep, priority: 1 },
        { title: "Policy excerpts", body: policy, priority: 3, maxTokens: 250 },
      ],
      { budgetTokens: 1100 }
    ).text,
  simulate: ({ resident, issue, concerns, history, nextStep }) => {
    const flags = [
      concerns.includes("legal threat") && "legal_threat",
      concerns.includes("rent withholding") && "rent_withholding",
      concerns.includes("health risk") && "health_risk",
      history.length && "repeat_issue",
    ].filter(Boolean);
    return {
      reply_to_resident: `Hi ${resident.first}, thank you for writing, and I'm sorry the ${issue} problem is back${concerns.includes("health risk") ? " — I understand the health worry it's causing your household" : ""}. I've reviewed your earlier requests${history.length ? ` (${history.length} previous visits)` : ""}, and this time we want to find the underlying cause, not just treat the surface. ${nextStep}. We'll share what we find and the plan to fix it properly. — Northwind Residential property management`,
      internal_brief: `${ordinal(history.length + 1)} report of ${issue} at ${resident.unit}. Concerns raised: ${concerns.join(", ") || "none"}. Prior work: ${history.join(" | ") || "none"}. Recommend a specialist inspection for a hidden moisture source and a personal call today; do not discuss rent or legal questions in writing.`,
      risk_flags: flags,
      recommended_next_steps: ["Call the resident personally today", `Book a ${issue} specialist inspection within 24 hours`, "Look for a hidden source (exhaust duct, plumbing behind the vanity)"],
      confidence: 0.8,
    };
  },
});

export const maintenanceTasks = [triage, vendorReport, classifyReply, sensitiveReply];

function ordinal(n) {
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 100 >= 11 && n % 100 <= 13 ? 0 : n % 10] ?? "th";
  return `${n}${suffix}`;
}
