# The same design as a Make.com scenario

The n8n workflow in this folder is the reference implementation. If a client or the agency prefers **Make**, the design maps one-to-one onto Make modules. Build it as two scenarios (Make has no multi-trigger scenario).

## Scenario 1 · "Inbound → Reply" (one per client)

| n8n node | Make module | Notes |
|---|---|---|
| WhatsApp Trigger | **WhatsApp Business Cloud → Watch Events** | Use the "messages" event. Or a *Custom webhook* if you want the raw Meta payload. |
| Instagram Inbound (POST) + Verify (GET) | **Webhooks → Custom webhook** | Make answers Meta's `hub.challenge` for you when you register the webhook URL in the Meta app; enable "Show advanced settings → Get request headers / query". Or **Instagram for Business → Watch Messages** / ManyChat → Make. |
| Normalize Message | **Tools → Set multiple variables** (+ a short **JavaScript / Custom JS** module if you have the Code app, otherwise two parallel routes: one per channel) | Produce `channel, contact_id, contact_key, contact_name, text, message_id`. |
| Client Config | **Tools → Set multiple variables** at the top of the scenario | Same field list as the n8n Set node. |
| Load Knowledge Base | **Google Sheets → Search Rows** (Knowledge tab, no filter) → **Array aggregator** → **Text aggregator** | Build the `## CATEGORY\n- title: content` text. |
| Lookup Lead | **Google Sheets → Search Rows** (Leads, `contact_key = …`, limit 1) | |
| Load Conversation History | **Google Sheets → Search Rows** (Conversations, `contact_key = …`, sort by timestamp desc, limit 10) → **Array aggregator** | |
| Assemble Context + Triage | **Router** with three filters: `message_id already in history` → stop; `lead.status = human AND handoff_at within 12 h` → human route; else → bot route | |
| Build Claude Request + Ask Claude | **Anthropic Claude → Create a Message** (or **HTTP → Make a request** to `https://api.anthropic.com/v1/messages`) | Send the same `system`, `messages` and `output_config.format` JSON body as `prompts/system-prompt.md`. Use HTTP if the Claude app does not expose `output_config` yet. |
| Parse Claude Response (guardrails) | **JSON → Parse JSON** (with the schema) → **Tools → Set variables** for `needs_human`, `decision` (use `if()`, `contains()`, and a regex `match()` for the price guard) | Price guard: `match(reply; "(PKR|Rs\.?|\$)\s?\d[\d,]*")` then check each number with `contains(kb_text; number)`. |
| Route Decision | **Router** (answer / book / handoff) | |
| Validate Booking Slot | **Tools → Set variables** with `parseDate()`, `formatDate()`, `addMinutes()` + a filter on weekday/hours | |
| Check Calendar Availability | **Google Calendar → Get Free/Busy Information** | Busy array empty → free. |
| Create Calendar Event | **Google Calendar → Create an Event** | |
| List Events In Slot + Resolve Booking Race + Delete Our Event | **Google Calendar → Search Events** (slot range) → **Filter** (an overlapping event with an earlier `created`) → **Google Calendar → Delete an Event** | Closes the free/busy-then-insert race. |
| Verify Instagram Signature | **Webhooks → Custom webhook** with *Get request headers* + **Tools → Set variable** `sha256(body; secret)` using `sha256()`/`hmac` functions, then a **Filter** on the `x-hub-signature-256` header | Make exposes the raw body only when JSON pass-through is enabled. |
| Finalize Reply + Route by Channel | **Router** on `channel` | |
| Send WhatsApp Reply | **WhatsApp Business Cloud → Send a Message** (text) | |
| Send Instagram Reply | **HTTP → Make a request** `POST https://graph.facebook.com/v23.0/{page-id}/messages` with `Authorization: Bearer <page token>` | Or **Instagram for Business → Send a Message** where available. |
| Upsert Lead | **Google Sheets → Search Rows** (already done) → **Router**: found → **Update a Row**, not found → **Add a Row** | Make has no native upsert for Sheets. |
| Append Conversation Log | **Google Sheets → Add a Row** | |
| Owner Alert Needed? + Notify Owner | **Filter** (`decision = handoff OR booking_confirmed`) → **Gmail → Send an Email** | |

## Scenario 2 · "Human mode" (same scenario, the `human` route)

Google Sheets → Add a Row (Conversations, intent `human_mode`) → Gmail → Send an Email. No reply module on this route.

## Make-specific notes

- Make bills per **operation**; this scenario is roughly 14–18 operations per customer message (three Sheets searches are the biggest share). For high-volume clients cache the knowledge base in a Data Store instead of reading the sheet every time.
- Keep the "one scenario per client" rule: it keeps API keys, logs and billing separate, matching the agency's ownership terms.
- Error handling: add an **error handler** on the Claude/HTTP module with a *Resume* directive that sets `decision = handoff`, so the customer always receives the safe hand-off message.
