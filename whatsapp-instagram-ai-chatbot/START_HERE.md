# Start here

**What this is:** an importable n8n automation that runs an AI assistant on a business's WhatsApp number and Instagram DMs. It answers questions from the client's own price list, captures leads into Google Sheets, books appointments into Google Calendar, hands off to a human when unsure, and e-mails the owner.

**Read in this order**

1. `README.md` — how it works (node by node), setup in 8 steps, guardrails, deployment, limits.
2. `tests/test-cases.md` — the pre-launch checklist to run before handing over to a client.
3. `docs/application-note.md` — ready-to-personalise answers for the job application.

**What you import into n8n**

| File | Purpose |
|---|---|
| `n8n/ai-chatbot-whatsapp-instagram.json` | The chatbot (49 nodes, 6 explanatory notes). |
| `n8n/error-alert-workflow.json` | Optional but recommended: e-mails the owner when a run fails. Set it as the chatbot's *Error workflow*. |

**What you edit per client:** only the **Client Config** node (plus the verify token in *Verify Token OK?* and the credentials).

**Status:** built and unit-tested offline (42 tests, `dev/`), node parameters checked against the published n8n package. Not yet run in a live n8n instance with real Meta/Google/Anthropic accounts: README step 7 is that first live test.
