# n8n workflows

Two workflows, exported from n8n and importable as-is: open n8n → **Workflows** →
**Import from File**.

Neither holds an API key, a prompt, or a merchant's brand rules. They call the
`aiauto` service over HTTP and stay orchestration.

## Before importing

Set these in n8n under **Settings → Variables**, or as environment variables on
the n8n container (`docker-compose.yml` already passes the first two):

| Variable | Used by | What it is |
|---|---|---|
| `AIAUTO_BASE_URL` | both | e.g. `http://aiauto:8000` |
| `AIAUTO_API_TOKEN` | both | must match the service's `AIAUTO_API_TOKEN` |
| `MERCHANT_NAME`, `MERCHANT_INDUSTRY` | triage | the merchant this n8n instance serves |
| `REVIEW_WEBHOOK_URL` | content | where drafts go for approval (Slack incoming webhook) |
| `CONTENT_LOG_WEBHOOK_URL` | content | where published posts are logged |
| `ALERT_WEBHOOK_URL`, `QUEUE_WEBHOOK_URL` | triage | urgent alerts, and the human queue |
| `FB_PAGE_ID`, `FB_PAGE_TOKEN` | content | the Page being published to |
| `WHATSAPP_PHONE_ID`, `WHATSAPP_TOKEN` | triage | the Cloud API sender |

The outbound integrations are plain HTTP Request nodes on purpose — they import
and run without an OAuth dance. Swap in the native Slack, Google Sheets or
Facebook nodes once you have credentials configured; the shape does not change.

## 01 — Daily content pipeline

```
Every weekday 09:00
  └─ Posting plan            (one item per merchant: brand sheet, topic, platforms)
      └─ Generate campaign   POST {AIAUTO_BASE_URL}/content/campaign
          └─ One item per platform
              └─ Needs a human look?
                  ├─ true  → Send for approval  ─┐
                  └─ false → Publish to page    ─┴─ Log the post
```

The review gate is a single IF node, currently "LinkedIn goes to a human". That
is the right place to encode whatever the client actually agreed to — some
merchants approve everything, some approve nothing.

Because the service validates every draft against the platform's limits and the
merchant's banned words, a 422 from `Generate campaign` means the copy was
generated and *rejected* — the response body names which rule it broke. Leave
n8n's default "stop on error" on: a broken caption should stop the run, not get
published.

## 02 — Inbox triage and reply

```
Message received (webhook)
  └─ Triage the message      POST {AIAUTO_BASE_URL}/inbox/triage
      └─ Route (switch on output.route)
          ├─ auto_reply    → Send the reply       ─┐
          ├─ escalate_now  → Alert the owner      ─┤
          ├─ human_queue   → Add to the human queue┤─ Acknowledge
          └─ drop          → Ignore               ─┘
```

Point the Messenger→WhatsApp forwarder in the root of this repository at the
webhook URL and post `{ "message": "...", "sender_name": "...",
"sender_phone": "..." }`. The forwarder tells you a message arrived; this
workflow decides what to do about it.

`drop` still returns 200 to the caller. Silently discarding spam is correct;
silently timing out on it is not.

## Testing a workflow without publishing anything

Set `FB_PAGE_ID` and `WHATSAPP_PHONE_ID` to a test Page and Meta's test number,
or replace the publish nodes with a `webhook.site` URL. Run the trigger manually
from the n8n editor and read the output of `One item per platform` — that is
exactly what would have been posted.
