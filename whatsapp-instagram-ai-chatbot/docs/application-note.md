# Application notes (for the "To apply, send:" section)

Fill in the placeholders in `[brackets]` before sending. Everything else is written from what is actually in this repository.

---

## 1. Links or videos of automations / chatbots I've built

- **WhatsApp + Instagram AI assistant (n8n)** — this repository: `whatsapp-instagram-ai-chatbot/`. Importable workflow, Google Sheets knowledge base, Google Calendar booking, human hand-off, owner e-mails, unit-tested logic nodes and a pre-launch test checklist. Screen recording: `[link to a 3–5 minute Loom: import → Client Config → pinned test run → live WhatsApp demo → sheet rows → calendar event → hand-off e-mail]`
- **Messenger → WhatsApp forwarder (Node.js, Meta Graph API)** — root of this repository. Real-time forwarding of every Facebook Page message to a WhatsApp number, with signature verification, attachment handling and the 24-hour-window template fallback. `[repo link]`
- `[Optional: one more automation, e.g. a Make scenario or a Zapier zap, with a link]`

## 2. Tools I use

n8n (primary — self-hosted and cloud), Make.com, Zapier; Claude / GPT / Gemini APIs with structured JSON output; WhatsApp Business Cloud API, Instagram Messaging API, ManyChat; Google Sheets / Calendar / Gmail APIs; Node.js for anything the low-code tools cannot do cleanly. `[Add Vapi / Retell / ElevenLabs if you have used them.]`

## 3. Availability and turnaround

`[e.g. Available Monday–Saturday, 11:00–19:00 PKT, reachable the same day on WhatsApp.]`

For a project like the one described (FAQ bot + lead capture + Google Calendar booking + hand-off, one channel): **setup fee quote → working bot in 3–4 working days** after the client supplies the price list, hours and Meta/Google access. Second channel (Instagram or WhatsApp) **+1 day**. Trial task: **1–2 days**.

## 4. Short note: how I stop a chatbot from giving wrong answers

> I never let the model be the only line of defence. First, the bot can only answer from an approved knowledge base — the client's own price list, services and hours in a Google Sheet that is injected into the prompt on every message — and the prompt tells it to hand off instead of guessing when something is not there. Second, the model must reply in strict JSON (reply, intent, confidence, needs_human, booking fields) so the workflow, not the model, decides what gets sent. Third, the workflow runs checks the model cannot bypass: a confidence threshold, a price guard that blocks any amount that does not exist in the knowledge base, hard hand-off triggers (customer asks for a person, complaints, API errors, unreadable output), and no bookings by the model — it only collects details, the workflow checks Google Calendar and writes the confirmation. Fourth, every turn is logged with the guardrail reason, so wrong or unsure answers are visible and fixed by improving the sheet, not by hoping. And before launch I run a written test checklist covering FAQs, out-of-scope questions, discounts, medical questions, duplicate deliveries and double-booked slots.

(That is exactly how the workflow in this repository is built — see README §5.)

## 5. On the terms

Happy with project-based work, a short trial task first, a fixed percentage of the setup fee paid after the client pays, and all accounts, keys and workflows staying under the agency's ownership with limited access for me. Scope, deadline and payment agreed in writing per project.
