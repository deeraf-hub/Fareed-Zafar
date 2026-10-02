# Integrations

Each system talks to Mortar in two ways:
- **in**: a verified webhook, either direct or relayed by n8n
- **out**: a connector called only by the outbox, with retries and idempotency keys

Every connector has a `simulated` twin with the same operations, so going live is one environment variable per system.

## Systems

| System | In (→ Mortar) | Out (Mortar →) | Verification | Go live |
|---|---|---|---|---|
| **Twilio** | `POST /webhooks/twilio/sms`, `/gather` (keypress), `/call-status` | `sendSms`, `placeCall` (inline TwiML `<Gather>`, one digit, our own reference in the action URL) | `X-Twilio-Signature` (HMAC-SHA1 over URL + sorted params; tolerates an explicit `:443`/`:80` as Twilio's SDK does) | `TWILIO_MODE=live`, SID/token/number or Messaging Service; `PUBLIC_BASE_URL` must match the URL Twilio calls; US traffic needs an A2P 10DLC campaign |
| **Email** | Inbound mailbox via n8n (IMAP) → `POST /events` | `sendEmail` via Postmark | Mortar HMAC (`X-Mortar-Signature`) | `EMAIL_MODE=live`, `POSTMARK_SERVER_TOKEN`, `EMAIL_FROM`; import `n8n/01-inbound-email.json` |
| **Follow Up Boss** | `POST /webhooks/followupboss` (stage changes made by people) | Leads via `POST /v1/events` (FUB's recommended intake: dedupes, triggers lead flow); outbound prospects via `POST /v1/people?deduplicate=true` (no automations); notes, tasks, appointments, stage + merged tags | `FUB-Signature`: HMAC-SHA256 of the base64 body, keyed with the X-System-Key | `FUB_MODE=live`, `FUB_API_KEY`, `FUB_SYSTEM_NAME`, `FUB_SYSTEM_KEY`; register the webhook |
| **Rentvine** | Work-order status changes via n8n polling (`n8n/04-rentvine-workorders.json`) → `POST /events` | `createWorkOrder` (`POST /maintenance/work-orders`), `updateWorkOrder` (POST to `/maintenance/work-orders/{id}` with bare fields) | Mortar HMAC | `RENTVINE_MODE=live`, base URL, key + secret, and the account's priority/status ids (`GET /maintenance/work-order/statuses`) |
| **ShowMojo** | Leads and showings: n8n relay (`03-showmojo-relay.json`) or direct `POST /webhooks/showmojo` | — (ShowMojo keeps owning confirmations and reminders) | Mortar HMAC, or Bearer token on the direct route | Point ShowMojo's notification webhook at n8n; adjust the field mapping once |
| **Weather (NWS)** | Hourly via n8n (`02-weather-hourly.json`) → `POST /directory/sync` | — | Mortar HMAC | Import the workflow; no API key (NWS asks for a descriptive User-Agent) |
| **Enrichment** | — | `lookup` (paid, per record) | — | Vendor-specific (BatchData, PDL, Apollo…): one adapter in `src/connectors/index.js` |
| **Models** | — | Ollama / OpenAI-compatible (local), Anthropic (frontier) | — | `LOCAL_MODEL_PROVIDER`, `ANTHROPIC_API_KEY`; see [Models & tokens](models-and-tokens.md) |

## Mortar's endpoints

| Endpoint | For | Auth |
|---|---|---|
| `POST /webhooks/twilio/sms` · `/gather` · `/call-status` | Twilio | Twilio signature |
| `POST /webhooks/followupboss` | Follow Up Boss | FUB signature |
| `POST /webhooks/showmojo` | ShowMojo (direct) | Bearer `SHOWMOJO_WEBHOOK_TOKEN` |
| `POST /events` | Anything relayed by n8n: email, Rentvine, ShowMojo, lead sources, outcomes | `X-Mortar-Signature: sha256=<HMAC of the raw body>` |
| `POST /directory/sync` | Directory data: properties, units, people, on-call rota, lines, weather | `X-Mortar-Signature` |
| `GET /api/state` · `/api/cases/:id` · `/api/stream` (SSE) | Console | `CONSOLE_TOKEN` (Bearer or `?token=`) |
| `POST /api/approvals/:id` · `/api/cases/:id/takeover` · `/api/leadgen/learn` | Console, n8n cron | `CONSOLE_TOKEN` |
| `GET /healthz` · `GET /metrics` | Load balancer, Prometheus | — (restrict at the network layer) |

`/events` accepts three body shapes:
- a full envelope (`type` + `idempotencyKey`)
- an inbound email (`event: "email.received"`)
- a normalized notification (`event` + `id`)

The provider's id becomes the idempotency key, so n8n retries are harmless.

## n8n: glue, not brains

n8n does what it is best at: connecting to things, polling and scheduling. Decisions stay in Mortar, where they are versioned, tested and traced. All six workflows sign their requests the same way:

```
Code node: build the exact JSON string  →  Crypto node: HMAC-SHA256(string, MORTAR_WEBHOOK_SECRET)
  →  HTTP node: POST that same string as the raw body, header X-Mortar-Signature: sha256=<hex>
```

| Workflow | Trigger | Does |
|---|---|---|
| `01-inbound-email.json` | IMAP (maintenance mailbox) | Each email → `message.received` (Mortar spots auto-replies from the headers) |
| `02-weather-hourly.json` | Every hour | NWS KAUS observation → °F → `/directory/sync` (feeds the SOP's temperature rules) |
| `03-showmojo-relay.json` | ShowMojo webhook | Lead / showing scheduled / showing completed → leasing events; other notifications dropped |
| `04-rentvine-workorders.json` | Every 2 minutes | Recent work orders → diffed against the last seen status → `workorder.updated` only on real changes |
| `05-oncall-rota.json` | Every 15 minutes | A spreadsheet rota (published CSV) → Mortar's escalation ladder; a rota with a gap fails loudly |
| `06-nightly-learning.json` | 2:15 AM | Runs the lead-scorer learning cycle; formats a one-line summary to send anywhere |

`test/n8n.test.js` runs these workflows the way n8n would:
1. It executes each Code node's JavaScript on sample inputs.
2. It signs the output exactly as the Crypto node does.
3. It sends the result to a live Mortar webhook server and asserts the effect: a P1 case, a weather update, a leasing case, a ladder.

That is how the sparse-array bug in the rota workflow was caught (see the engineering notes).

**Setup:**
1. In n8n, import the six files.
2. Set the environment variables:
   - `MORTAR_URL` and `MORTAR_WEBHOOK_SECRET`
   - `MORTAR_CONSOLE_TOKEN`, `RENTVINE_BASE_URL`, `RENTVINE_STATUS_IDS` and `ONCALL_SHEET_CSV_URL` as needed
   - `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`
3. Attach the IMAP and Rentvine credentials, then activate.

`docker compose --profile n8n up` starts n8n with these variables and mounts `./n8n` at `/workflows`.

## Going live, one system at a time

1. `cp .env.example .env`; set `MORTAR_WEBHOOK_SECRET` and `CONSOLE_TOKEN`; leave every connector `simulated`.
2. Sync the directory (properties, units, people, rota) through `/directory/sync` or n8n.
3. Turn on the models: `LOCAL_MODEL_PROVIDER=ollama`, and `ANTHROPIC_API_KEY` with `FRONTIER_MODEL` pinned. Run `npm run eval` against them.
4. Flip one connector to `live` (start with email or FUB). Watch the console and `/metrics` for a day.
5. Then the next system. Twilio goes last, after A2P registration.
