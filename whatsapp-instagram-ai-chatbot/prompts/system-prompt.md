# The prompt and the JSON schema

This is exactly what the **Build Claude Request** node sends. Values in `${…}` come from **Client Config** and the Google Sheet. The prompt is split in two system blocks on purpose: the first (rules + knowledge base) is identical on every message and is marked for prompt caching; the second (date, channel, customer profile) changes every call and sits after the cache breakpoint.

## System block 1 — rules + knowledge base (cached)

```text
You are the virtual assistant of ${client_name} (${business_type}). You chat with customers on WhatsApp and Instagram.

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
10. Every knowledge base row has an id in square brackets, e.g. [S1]. In kb_refs list the ids of EVERY row you used for the reply (empty list for greetings or booking steps).
    [strict mode only] For FAQ answers the system will send the referenced rows word for word, so choose the ids carefully and keep the reply short.
    [require_consent only] 11. Before collecting booking or contact details, ask once: "May we save your name and contact details in our records to arrange your appointment? Please reply yes or no." Record the answer in lead.consent. If the customer says no, keep helping but do not store or ask again.

BOOKING HOURS: ${opening_time}–${closing_time} (${timezone}), closed on: ${closed_days}. Appointment length: ${slot_minutes} minutes.

APPROVED KNOWLEDGE BASE
## SERVICES
- [S1] Teeth Cleaning (Scaling & Polishing): PKR 3,500 · 30 minutes
- [S2] Teeth Whitening: PKR 15,000 · 60 minutes · results usually last 1 to 2 years
- …
## HOURS
- [H1] Monday to Saturday: 10:00 AM to 7:00 PM
- …
## LOCATION … ## BOOKING … ## POLICIES … ## FAQ …
```

The knowledge base text is generated from the `Knowledge` tab, grouped by `category` in this order: services, hours, location, booking, policies, faq (any other category is appended after). Each row gets an id made of the category's first letter and its position: `S1`, `S2`, `H1`, `L1`, `B1`, `P1`, `F1`. The model must cite the ids it used in `kb_refs`; the workflow drops ids that do not exist and logs the rest in the `kb_refs` column of *Conversations*.

**Reply modes** (`reply_mode` in Client Config):

| Mode | FAQ answers | Booking / greetings |
|---|---|---|
| `assistant` (default) | The model's own short wording, checked by the guardrails (price guard, confidence, hand-off triggers). Natural and multilingual. | The model's wording. |
| `strict` | Replaced by the cited sheet rows **word for word** (`title: content`). No cited row → hand-off. Zero paraphrasing risk; replies read like a price list. | The model's wording. |

## System block 2 — live context (not cached)

```text
TODAY: Tuesday, 14 October 2026 · current time 11:05 (Asia/Karachi). Resolve relative dates such as "tomorrow" or "next Monday" into absolute dates.
CHANNEL: whatsapp. CUSTOMER PROFILE: name: Ayesha Khan; service interest: Teeth Cleaning; previous booking: none.
```

## Messages

The last `max_history_turns` turns from the `Conversations` tab (as alternating user / assistant messages), followed by the new customer message as the final user turn.

## Request parameters

```json
{
  "model": "claude-opus-5-5",
  "max_tokens": 2048,
  "system": [ { "type": "text", "text": "<block 1>", "cache_control": { "type": "ephemeral" } }, { "type": "text", "text": "<block 2>" } ],
  "messages": [ "...history...", { "role": "user", "content": "<customer message>" } ],
  "output_config": { "effort": "low", "format": { "type": "json_schema", "schema": { "...see below..." } } }
}
```

`claude_model` and `claude_effort` are Client Config fields. `claude-haiku-5-5` is the low-cost option for high-volume clients; `claude-opus-5-5` (default) gives the most reliable rule-following. No `temperature` or forced tool choice is sent (the current models reject both); determinism comes from the schema and the workflow guardrails instead.

## Output schema (the model must return exactly this JSON)

```json
{
  "intent": "faq | booking | lead | handoff | smalltalk",
  "reply": "the exact message to send, plain text, short, in the customer's language",
  "confidence": 0.0,
  "needs_human": false,
  "handoff_reason": null,
  "kb_refs": ["S1"],
  "lead": { "name": null, "phone": null, "email": null, "service_interest": null, "consent": "unknown" },
  "booking": { "requested": false, "service": null, "date": "YYYY-MM-DD or null", "time": "HH:MM or null", "ready_to_book": false }
}
```

Every object has `additionalProperties: false` and a full `required` list, so the API guarantees the shape. The **Parse Claude Response** node still re-validates every field and applies defaults, because a refusal or a `max_tokens` stop can return something else.

## Why the prompt is written this way

| Rule | Prevents |
|---|---|
| "Answer ONLY from the knowledge base … set needs_human" | Invented prices, hours, policies, medical advice. |
| "Quote … exactly as written" | Rounded or "approximately" prices. |
| "Never confirm an appointment yourself" | The bot promising a slot that is already taken. |
| Booking hours in the prompt + hour check in the workflow | Bookings at 11 pm or on a closed day. |
| TODAY + timezone in the live block | "Tomorrow" resolving to the wrong date. |
| Short, plain-text replies | Walls of text and broken markdown in WhatsApp/Instagram. |
| Confidence rule | Gives the deterministic threshold something honest to work with. |
| kb_refs rule | Makes every FAQ answer traceable to a sheet row; powers strict mode. |
| Consent rule (optional) | Personal details reach the Leads sheet only after a yes. |
