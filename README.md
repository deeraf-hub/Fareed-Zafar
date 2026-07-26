# Messenger → WhatsApp Forwarder

A small, self-hosted Node.js service that watches your **Facebook Page inbox 24/7** and forwards **every incoming Messenger message to your WhatsApp Business number in real time**, including:

- 👤 the sender's name
- 💬 the message text
- 🕒 the date and time (in your timezone)
- 📎 attachments — images, videos, documents, and voice messages

It talks to Meta's APIs directly, with **no middleman service** (no Zapier/Make fees, no third party seeing your messages).

```
Customer ──▶ Facebook Page inbox
                   │  (Messenger Platform webhook, real-time push)
                   ▼
           This service (Node.js)
     • verifies Meta's request signature
     • looks up the sender's name
     • formats name + text + date/time
     • re-uploads / links attachments
                   │  (WhatsApp Business Cloud API)
                   ▼
        Your WhatsApp number 📱
```

---

## Why this approach (vs. Zapier / Make / n8n)

| Option | Real-time? | Attachments | Cost | Maintenance | Verdict |
|---|---|---|---|---|---|
| **This service (Graph API direct)** | ✅ Webhook push, ~1–2 s | ✅ All types | Hosting only (~$0–5/mo) | Very low once deployed | **Recommended** |
| **n8n (self-hosted)** | ✅ Webhook | ✅ With custom nodes/HTTP steps | Hosting only | Medium (workflow + n8n upgrades) | Good low-code alternative |
| **Make.com** | ✅ Native Messenger "Watch messages" + WhatsApp modules | ⚠️ Partial (extra ops per file) | Per-operation fees; adds up at volume | Low | Best no-code alternative |
| **Zapier** | ⚠️ Facebook Messenger trigger is polling on lower plans | ⚠️ Limited | Highest per-task cost | Low | Works, least cost-effective |

All four ultimately use the same Meta APIs underneath — the same Meta app setup, permissions, and policy limits below apply no matter which you pick. If you'd rather not run a server, **Make.com** is the closest no-code equivalent: use the *Facebook Messenger → Watch Messages* trigger and the *WhatsApp Business Cloud → Send a Message* action, mapping sender name, text, and timestamp into the message body.

---

## ⚠️ Meta policy limitations you must know

1. **The 24-hour customer-service window (the big one).**
   WhatsApp only allows *free-form* business-initiated messages to a number that has messaged your WhatsApp Business number within the last 24 hours. Outside that window, Meta rejects the send (error `131047`) unless you use a **pre-approved message template**.
   **How this service handles it:** since the recipient is *your own phone*, simply reply (or send any message, even "ok") from your phone to your WhatsApp Business number once a day — that re-opens the window and everything forwards free-form. If the window is closed anyway, the service automatically falls back to an approved **utility template** (see Step 5) so you still get notified with the sender name and a preview.

2. **App Review / Live mode.** While your Meta app is in *Development* mode, the Messenger webhook only receives messages from people with a role on the app (you, admins, testers). To receive messages from **the general public**, the app must be switched **Live**, which requires **Advanced Access to `pages_messaging`** via App Review, and usually **Business Verification**. This is a one-time, few-days process; the use case "notify myself of my own Page's messages" is routinely approved.

3. **The WhatsApp Business number is separate from a personal WhatsApp app number.** The Cloud API number can't simultaneously be logged into the consumer WhatsApp/WhatsApp Business *app* (it can be migrated, but then the API owns it). Easiest setup: use a dedicated/new number (or Meta's free test number to start) as the *sender*, and your everyday number as the *recipient*.

4. **Pricing.** Incoming Messenger webhooks and the Graph API calls are free. WhatsApp Cloud API: messages you send *within* an open customer-service window are free; template messages sent outside the window are billed per message (utility templates cost ~fractions of a cent). At "notify me of my inbox" volume this is essentially $0 if you keep the window open.

5. **Media constraints.** WhatsApp caps media sizes (images 5 MB, video/audio 16 MB, documents 100 MB) and formats (e.g. video must be MP4/H.264). Oversized or unsupported files are forwarded as a text message containing the header + the attachment link instead, so nothing is silently lost. Messenger attachment URLs are signed CDN links that expire after a few days — fine for immediate forwarding.

6. **Messenger webhooks don't include the sender's phone number or profile beyond name/PSID**, and Meta prohibits using Page messages for anything other than servicing that conversation. Forwarding to yourself for customer service is fine; harvesting data is not.

---

## Step-by-step implementation plan

### Step 0 — Prerequisites
- A Facebook **Page** you admin, and a **Meta Business Portfolio** (business.facebook.com).
- A **Meta developer account** → create an app at [developers.facebook.com](https://developers.facebook.com) → type **Business**.
- Somewhere to run this service with a public HTTPS URL: Railway, Render, Fly.io, a $4 VPS, etc. (Meta requires HTTPS for webhooks.)

### Step 1 — Add products to the app
In the App Dashboard, add both products:
- **Messenger** (for the Page inbox webhook)
- **WhatsApp** (for the Cloud API sender)

### Step 2 — WhatsApp Cloud API setup
1. App Dashboard → **WhatsApp → API Setup**. Meta gives you a **test sender number** immediately — you can use it right away and attach a real dedicated number later.
2. Note the **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`.
3. Add your personal WhatsApp number as a **recipient** (test numbers require this; verified via SMS code) → `WHATSAPP_RECIPIENT` (international format, digits only).
4. Create a **System User** in Business Settings → generate a **permanent token** with `whatsapp_business_messaging` and `whatsapp_business_management` → `WHATSAPP_TOKEN`. (The dashboard's temporary token expires in 24 h — don't ship it.)

### Step 3 — Messenger / Page setup
1. App Dashboard → **Messenger → Settings** → connect your Page.
2. Generate a **Page access token** → `PAGE_ACCESS_TOKEN`. Use a System User token or exchange for a long-lived token so it doesn't expire.
3. App settings → Basic → copy the **App Secret** → `APP_SECRET`.

### Step 4 — Deploy this service
```bash
cp .env.example .env     # fill in every value
npm install
npm run test:whatsapp    # sends a test message to your phone — verifies Step 2 worked
npm start                # or: docker build -t fwd . && docker run --env-file .env -p 3000:3000 fwd
```
`npm run test:whatsapp` confirms your WhatsApp credentials end-to-end before you touch the webhook side; if it fails it prints the most likely cause. Then expose the service at a public HTTPS URL (for local testing, `ngrok http 3000` works).

Then register the webhook: App Dashboard → **Messenger → Settings → Webhooks**:
- Callback URL: `https://your-host/webhook`
- Verify token: the exact `VERIFY_TOKEN` value from your `.env`
- Subscribe to the **`messages`** field, and subscribe your Page.

Send your Page a Messenger message — it should appear on your WhatsApp within a second or two.

### Step 5 — Create the fallback template (recommended)
WhatsApp Manager → Account tools → **Message templates** → create a **Utility** template named `new_messenger_message` (language `en`) with body:

> New Messenger message from {{1}}: {{2}}

Once approved (usually minutes to hours), set `WHATSAPP_TEMPLATE_NAME=new_messenger_message`. This is what gets delivered when the 24-hour window is closed.

### Step 6 — Go live for the public
- App Review → request **Advanced Access** for `pages_messaging` (screencast the flow: "customer messages my Page → I get a WhatsApp notification").
- Complete **Business Verification** if prompted.
- Switch the app to **Live** mode.

### Step 7 — Reliability & minimal maintenance
- The service acknowledges webhooks instantly and processes in the background, retries WhatsApp sends with backoff, deduplicates Meta's redelivered events, and never loops on echoes of its own Page replies.
- Point an uptime monitor (UptimeRobot, free) at `GET /healthz`; your host restarts the container on failure.
- Tokens: System User tokens don't expire — the only recurring "maintenance" is nothing, unless you rotate secrets.
- Meta occasionally deprecates Graph API versions (~2-year lifetime); bump `GRAPH_API_VERSION` in `.env` when notified. That's the whole upkeep.

---

## Security

- Every webhook call is verified against Meta's `X-Hub-Signature-256` HMAC using your App Secret — forged requests are rejected with 401 (covered by unit tests: `npm test`).
- All secrets live in environment variables; `.env` is git-ignored. Never commit tokens.
- Message content goes only through Meta's own infrastructure and your server — no third-party automation platform ever sees it.
- Attachments are forwarded by link (Meta-to-Meta) when possible; the file only transits your server in the fallback path and is never written to disk.

---

## If the Cloud API onboarding is a blocker

The destination stays WhatsApp either way — these are just different ways to reach it:

1. **A BSP instead of the direct Cloud API** — Twilio, 360dialog, or Vonage resell the exact same WhatsApp Business API with easier onboarding and human support, at a small per-message markup. Same code shape, different endpoint and token; only `src/whatsapp.js` would change.
2. **Meta's free test number first** — you don't need to finish real-number onboarding to start: the test sender number Meta provides works immediately and can deliver to your (verified) personal number. Attach a permanent number later with zero code changes.
3. **Meta Business Suite push notifications** — as an interim stopgap while App Review is pending, the Business Suite app pushes Page-inbox alerts to your phone (not into WhatsApp, and without this project's formatting, but zero setup).

---

## Project layout

```
src/
  server.js           Express app: webhook verification handshake + event intake
  verifySignature.js  X-Hub-Signature-256 HMAC validation
  forwarder.js        Event → WhatsApp mapping, dedupe, formatting, attachments
  messenger.js        Sender-name lookup (Graph API) with caching
  whatsapp.js         Cloud API sender: text, media (link + upload), template fallback, retries
  config.js           Environment configuration
scripts/
  send-test.js        Credential check: sends a test WhatsApp message (npm run test:whatsapp)
test/                 Unit tests (npm test)
```
