// ============================================================================
// 4 · PARSE CLAUDE RESPONSE + GUARDRAILS
// ----------------------------------------------------------------------------
// Reads the model's JSON and then applies DETERMINISTIC checks that the model
// cannot talk its way around. Any failed check → "handoff" (safe default).
//   • unreadable / refused / errored API response
//   • empty reply
//   • the model itself asked for a human
//   • confidence below the threshold set in Client Config
//   • PRICE GUARD: every money amount in the reply must exist in the knowledge base
//   • the customer explicitly asked for a person
// Output adds: ai, guard[], needs_human, decision ("answer" | "book" | "handoff"), lead_merged
// ============================================================================

const ctx = $('Build Claude Request').first().json;
const res = $input.first().json || {};
const config = ctx.config;

// --- 1. Read the structured JSON -------------------------------------------
let ai = null;
let problem = null;
if (res.error) problem = 'ai_api_error';
else if (res.stop_reason === 'refusal') problem = 'ai_refusal';
else if (res.stop_reason === 'max_tokens') problem = 'ai_output_truncated';
else {
  try {
    const text = (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    ai = JSON.parse(text);
  } catch (e) {
    problem = 'ai_output_unreadable';
  }
}
if (!ai || typeof ai !== 'object') { ai = {}; problem = problem || 'ai_output_unreadable'; }

// --- 2. Normalize fields with safe defaults ----------------------------------
const INTENTS = ['faq', 'booking', 'lead', 'handoff', 'smalltalk'];
ai.intent = INTENTS.includes(ai.intent) ? ai.intent : 'faq';
ai.reply = String(ai.reply || '').trim();
ai.confidence = Math.max(0, Math.min(1, Number(ai.confidence) || 0));
ai.needs_human = Boolean(ai.needs_human);
ai.handoff_reason = ai.handoff_reason ? String(ai.handoff_reason) : null;
ai.lead = Object.assign({ name: null, phone: null, email: null, service_interest: null }, ai.lead || {});
ai.booking = Object.assign({ requested: false, service: null, date: null, time: null, ready_to_book: false }, ai.booking || {});

// --- 3. Guardrails (outside the model) ---------------------------------------
const guard = [];
if (problem) guard.push(problem);
if (!ai.reply) guard.push('empty_reply');
if (ai.needs_human) guard.push(ai.handoff_reason ? `model: ${ai.handoff_reason}` : 'model_requested_handoff');

const threshold = Number(config.handoff_confidence_threshold) || 0.6;
if (!problem && ai.confidence < threshold) guard.push(`low_confidence (${ai.confidence} < ${threshold})`);

// Price guard: any currency amount in the reply must appear in the approved knowledge base.
const MONEY = /(?:PKR|Rs\.?|₨|\$|USD|€|EUR|£|GBP|AED|SAR|INR|₹)\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?(?:PKR|Rs\.?|USD|EUR|GBP|AED|SAR|INR|dollars|rupees|euros|pounds)\b/gi;
const kbNumbers = new Set((String(ctx.kb_text).match(/\d[\d,]*(?:\.\d+)?/g) || []).map((n) => n.replace(/,/g, '')));
for (const amount of ai.reply.match(MONEY) || []) {
  const n = (amount.match(/\d[\d,]*(?:\.\d+)?/) || [''])[0].replace(/,/g, '');
  if (n && !kbNumbers.has(n)) { guard.push(`price_not_in_knowledge_base: ${amount.trim()}`); break; }
}

// Explicit request for a person (checked on the customer's own words).
if (/\b(human|real person|speak to (?:someone|a person|the doctor|the owner)|talk to (?:someone|a person|the doctor|the owner)|manager|complaint|complain)\b/i.test(ctx.message.text)) {
  guard.push('customer_asked_for_human');
}

const needs_human = guard.length > 0;
const b = ai.booking;
const booking_ready = !needs_human && b.ready_to_book && b.service && b.date && b.time;
const decision = needs_human ? 'handoff' : booking_ready ? 'book' : 'answer';

// --- 4. Merge lead details: this turn > existing sheet row > channel profile --
const old = ctx.lead || {};
const lead_merged = {
  name: ai.lead.name || old.name || ctx.message.contact_name || '',
  phone: ai.lead.phone || old.phone || (ctx.message.channel === 'whatsapp' ? ctx.message.contact_id : ''),
  email: ai.lead.email || old.email || '',
  service_interest: ai.lead.service_interest || b.service || old.service_interest || '',
};

const usage = res.usage || {};
const tokens_used = (Number(usage.input_tokens) || 0) + (Number(usage.cache_read_input_tokens) || 0) + (Number(usage.cache_creation_input_tokens) || 0) + (Number(usage.output_tokens) || 0);

return [{ json: { ...ctx, ai, guard, needs_human, decision, lead_merged, tokens_used } }];
