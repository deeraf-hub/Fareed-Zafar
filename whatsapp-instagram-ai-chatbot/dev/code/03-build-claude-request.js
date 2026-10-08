// ============================================================================
// 3 · BUILD CLAUDE REQUEST
// ----------------------------------------------------------------------------
// Builds the body for the Anthropic Messages API call. The design choices that
// keep the bot "limited to approved information" live here:
//   • the knowledge base is injected into the system prompt and the rules say
//     "answer ONLY from it, otherwise hand off";
//   • the reply is returned as STRICT JSON (output_config.format) so the
//     workflow — not the model — decides what is sent, booked or escalated;
//   • the model never confirms bookings; it only collects details.
// ============================================================================

const ctx = $input.first().json;
const { message, config, kb_text, history, lead } = ctx;
const zone = config.timezone || 'UTC';
const now = DateTime.now().setZone(zone);
const requireConsent = String(config.require_consent) === 'true';
const strictMode = String(config.reply_mode || 'assistant').toLowerCase() === 'strict';

const stableRules = `You are the virtual assistant of ${config.client_name} (${config.business_type}). You chat with customers on WhatsApp and Instagram.

STRICT RULES
1. Answer ONLY from the APPROVED KNOWLEDGE BASE below. If the answer is not there, do NOT guess, estimate or invent anything. Say you will check with the team and set needs_human = true.
2. Quote prices, durations, hours, addresses and policies exactly as written. Never offer discounts, promises, diagnoses or medical/legal advice.
3. Never confirm an appointment yourself. Your job is only to collect: (a) the service, (b) the date, (c) the time, (d) the customer's name. Once all four are known, repeat them back in one short message and ask the customer to confirm. Set booking.ready_to_book = true ONLY after the customer has confirmed. The booking system then checks the calendar and sends the confirmation.
4. Appointments are possible only during the booking hours listed below. If the customer asks for a time outside them, politely offer the booking hours instead.
5. Hand off to a human (needs_human = true, with a short polite reply) when the customer asks for a person, is upset or complaining, asks for medical/legal advice, asks about something not in the knowledge base, or when you are unsure.
6. Reply in the customer's language. Keep replies short: at most 3 short sentences or a short list. Plain text only — no markdown, no headings, no bold.
7. Capture lead details (name, phone, email, service interest) whenever the customer shares them.
8. If the customer message is a placeholder such as "[The customer sent a image message ...]", politely ask them to type their question.
9. confidence = how fully your reply is supported by the knowledge base (1.0 = fully supported, below 0.6 = unsure).
10. Every knowledge base row has an id in square brackets, e.g. [S1]. In kb_refs list the ids of EVERY row you used for the reply (empty list for greetings or booking steps).${strictMode ? ' For FAQ answers the system will send the referenced rows word for word, so choose the ids carefully and keep the reply short.' : ''}${requireConsent ? `
11. Before collecting booking or contact details, ask once: "May we save your name and contact details in our records to arrange your appointment? Please reply yes or no." Record the answer in lead.consent. If the customer says no, keep helping but do not store or ask again.` : ''}

BOOKING HOURS: ${config.opening_time}–${config.closing_time} (${zone}), closed on: ${config.closed_days || 'none'}. Appointment length: ${config.slot_minutes} minutes.

APPROVED KNOWLEDGE BASE
${kb_text}`;

const profile = lead
  ? `name: ${lead.name || 'unknown'}; service interest: ${lead.service_interest || 'unknown'}; previous booking: ${lead.booking_datetime || 'none'}`
  : 'new customer, no previous chats';

const liveContext = `TODAY: ${now.toFormat('cccc, d LLLL yyyy')} · current time ${now.toFormat('HH:mm')} (${zone}). Resolve relative dates such as "tomorrow" or "next Monday" into absolute dates.
CHANNEL: ${message.channel}. CUSTOMER PROFILE: ${profile}.`;

// JSON schema the model MUST follow (structured outputs) ---------------------
const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] };
const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['intent', 'reply', 'confidence', 'needs_human', 'handoff_reason', 'kb_refs', 'lead', 'booking'],
  properties: {
    intent: {
      type: 'string',
      enum: ['faq', 'booking', 'lead', 'handoff', 'smalltalk'],
      description: 'faq = question answerable from the knowledge base · booking = wants an appointment · lead = sharing contact details / interest · handoff = needs a human · smalltalk = greeting or thanks',
    },
    reply: { type: 'string', description: "The exact message to send to the customer. Plain text, short, friendly, in the customer's language." },
    confidence: { type: 'number', description: '0 to 1. How fully the reply is supported by the approved knowledge base.' },
    needs_human: { type: 'boolean', description: 'true when a human must take over this conversation.' },
    handoff_reason: { ...nullableString, description: 'Short reason when needs_human is true, otherwise null.' },
    kb_refs: { type: 'array', items: { type: 'string' }, description: 'Ids of the knowledge base rows used for this reply, e.g. ["S1", "H2"]. Empty if none were needed.' },
    lead: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'phone', 'email', 'service_interest', 'consent'],
      properties: {
        name: nullableString,
        phone: nullableString,
        email: nullableString,
        service_interest: nullableString,
        consent: { type: 'string', enum: ['yes', 'no', 'unknown'], description: 'Whether the customer agreed to have their details stored. "unknown" until they answer.' },
      },
    },
    booking: {
      type: 'object',
      additionalProperties: false,
      required: ['requested', 'service', 'date', 'time', 'ready_to_book'],
      properties: {
        requested: { type: 'boolean', description: 'true if the customer wants an appointment.' },
        service: nullableString,
        date: { ...nullableString, description: 'Absolute date as YYYY-MM-DD, resolved from TODAY.' },
        time: { ...nullableString, description: 'Start time as HH:MM in 24-hour format.' },
        ready_to_book: { type: 'boolean', description: 'true ONLY when service, date, time and name are all known AND the customer confirmed them in their latest message.' },
      },
    },
  },
};

const claude_request = {
  model: config.claude_model || 'claude-opus-5-5',
  max_tokens: 2048,
  system: [
    { type: 'text', text: stableRules, cache_control: { type: 'ephemeral' } },   // stable → cached between messages
    { type: 'text', text: liveContext },                                          // changes every call → after the cache breakpoint
  ],
  messages: [...history, { role: 'user', content: message.text }],
  output_config: {
    effort: config.claude_effort || 'low',
    format: { type: 'json_schema', schema },
  },
};

return [{ json: { ...ctx, claude_request } }];
