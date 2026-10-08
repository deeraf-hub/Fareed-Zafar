# Visual preview and recruiter walkthrough

> **Local demo — external services simulated.** The preview runs the real workflow logic from `n8n/ai-chatbot-whatsapp-instagram.json` on your machine. WhatsApp, Instagram, Google Sheets, Google Calendar, Gmail and the AI model are replaced by local stand-ins. Nothing is sent anywhere.

## Run it

```bash
cd whatsapp-instagram-ai-chatbot/dev
npm install          # luxon only
npm run preview      # http://localhost:8091
```

| URL | What it is |
|---|---|
| `http://localhost:8091/` | **Chat preview.** Type messages as a customer (WhatsApp or Instagram), see which workflow nodes ran, the guardrail verdict, the simulated Leads / Conversations sheets, calendar events, owner emails and the exact request the Ask Claude node would send. |
| `http://localhost:8091/walkthrough` | **Recruiter walkthrough.** Seven animated scenes, about 3½ minutes, with Start / Pause / Resume / Restart / Prev / Next, a progress bar and captions. Runs in its own isolated session. |

Keyboard on the walkthrough: `Space` play/pause, `←` `→` previous/next scene, `R` restart. Animations follow your system's reduced-motion setting (typing becomes instant; captions keep their reading time). No audio.

## What is real and what is simulated

| Part | In the preview | Label on screen |
|---|---|---|
| The seven **Code nodes** (normalize, context, prompt, parse + guardrails, slot validation, finalize, race resolver) | Executed as-is from the workflow file | green `real` |
| **Set / IF / Switch** nodes | Their n8n expressions are evaluated locally by a small executor (`dev/preview-lib/engine.js`) that walks the real node graph | blue `logic` |
| **Google Sheets** | In-memory tabs per session (`Knowledge` loaded from `google-sheets/Knowledge.csv`) | amber `simulated` |
| **Google Calendar** | In-memory events per session; free/busy, create, list, delete | amber `simulated` |
| **Gmail** | Owner emails go to an outbox you can read; nothing is sent | amber `simulated` |
| **WhatsApp / Instagram send** | Replies go to an outbox shown as chat bubbles; nothing is delivered | amber `simulated` |
| **Ask Claude** (Anthropic API) | A local rule-based responder answers in the same JSON shape the real model is constrained to. It is not Claude and does not call any API. The request body shown is exactly what the node would send. | amber `simulated` |
| **Verify Instagram Signature** (HMAC) | Accepts the demo marker; the real node recomputes Meta's signature | amber `simulated` |

The walkthrough's "wrong-answer safeguard" scene uses a **test hook**: the simulated responder is told to misquote a price so the real `Parse Claude Response` node can be seen rejecting it. The hook is labelled in the scene and in the chat preview checkbox.

## Scenes

1. **Introduction** — the business problem and the channels.
2. **Approved FAQ** — a price question, the cited knowledge row, the verified answer.
3. **Appointment booking** — name → service → day/time → explicit confirmation → slot validation → (simulated) availability → event → lead row → owner email. Slots are a fixed 30 minutes from `slot_minutes` in Client Config, for every service.
4. **Human hand-off** — an unsupported question, the owner alert, paused replies.
5. **Wrong-answer safeguard** — an invented price blocked by the real price guard.
6. **Technical overview** — the six workflow sections, with the nodes that ran highlighted.
7. **Honest closing** — implemented, tested, and what still needs live credentials.

Each scene starts from a clean session, so scenes can be replayed or jumped to in any order. Customers are fictional (Ayesha Khan, Sara Malik, Hamza Iqbal) with made-up numbers.

## Tests

```bash
npm test        # 42 unit tests on the Code nodes
npm run smoke   # 10 smoke tests that drive the whole workflow graph through the preview API
npm run check   # both
```

The smoke tests cover: FAQ with cited row, the complete booking sequence, a taken slot, duplicate delivery, hand-off + human pause + resume, the price guard, a non-text message, session reset isolation, and the workflow map.

## Recording a recruiter-facing video (3–4 minutes)

1. Start the server, open `http://localhost:8091/walkthrough` in a clean browser window at about 1280×800, and hide bookmarks and other tabs.
2. Record the browser window (Loom, OBS, or the OS screen recorder). Keep the **"Local demo — external services simulated."** label visible in every shot. No audio is produced by the page; narrate over it if you like.
3. Press **Start** and let it run. Use **Pause** on the booking confirmation, the hand-off email and the price-guard verdict if you want to talk through them.
4. Suggested narration, one line per scene:
   - *"Clinics get the same questions all day; this answers them on WhatsApp and Instagram."*
   - *"Answers come only from the clinic's own sheet; the cited row is highlighted."*
   - *"The model collects details and asks for a yes; the workflow validates the slot, checks the calendar and writes the confirmation."*
   - *"Anything outside the sheet goes to a human; the bot stays silent until the owner hands it back."*
   - *"Even a confident wrong price is blocked by code, not by the model."*
   - *"One n8n file, six sections; every client-specific value lives in one node."*
   - *"Built and tested offline; live credentials and acceptance testing are the next step."*
5. Finish on scene 7 so the honest status is the last thing on screen. Do not claim live delivery, real model responses, Google connectivity, real emails, production readiness, client work or hiring outcomes.
6. Optional second clip: the chat preview at `/`, typing two or three of your own questions and opening the *Model request* tab to show the real prompt.

## Files

| File | Purpose |
|---|---|
| `dev/preview-server.js` | HTTP server: static pages + `/api/...`, one isolated in-memory session per id |
| `dev/preview-lib/engine.js` | Mini n8n executor: walks the real graph, runs Code nodes, evaluates expressions, routes IF/Switch |
| `dev/preview-lib/simulators.js` | Provider stand-ins and the rule-based model responder |
| `dev/preview-lib/csv.js` | CSV parser for the knowledge base |
| `dev/preview.html`, `dev/preview.js` | Chat preview page |
| `dev/walkthrough.html`, `dev/walkthrough.js` | Recruiter walkthrough page and scene player |
| `dev/preview.css` | Shared Bright Smile styling |
| `dev/preview-smoke.js` | Smoke tests |

## API (for your own experiments)

```
GET  /api/health
GET  /api/knowledge                         → sheet rows + Client Config values
GET  /api/workflow                          → nodes, sections, kinds
GET  /api/session/<id>/state                → leads, conversations, calendar, outbox, emails
POST /api/session/<id>/message              { channel, contact_id, contact_name, text, message_id?, type?, hooks? }
POST /api/session/<id>/lead-status          { contact_key, status: "bot" | "human" }
POST /api/session/<id>/reset
```

`hooks.invented_price` forces the simulated responder to misquote a price (test hook); `hooks.reset_draft` clears its per-contact memory. The response carries the reply, decision, guardrails, cited rows, the full node trace and anything newly written.
