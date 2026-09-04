# aiauto — AI automation portfolio

Three job descriptions ask for the same five things: **an n8n workflow, an AI model
wired into another application, a chatbot or AI-powered automation, hands-on work
with AI APIs, and small AI projects in Python.** This directory is one coherent
system that does all five, in the domain the rest of this repository already
lives in — merchant social media and customer messages.

It is deliberately not five demos. It is one thing that runs:

```
        n8n (orchestration, no API keys, no prompts)
                       │  HTTP + JSON
                       ▼
    ┌──────────────────────────────────────────────┐
    │  aiauto service (FastAPI)                    │
    │                                              │
    │   /content/post      one platform-native post│
    │   /content/campaign  one post per platform   │
    │   /inbox/triage      classify + draft a reply│
    │   /reports/agent     tool-using report writer│
    └───────────────────────┬──────────────────────┘
                            │  Anthropic Messages API
                            ▼
                    Claude (claude-opus-5)
                    structured outputs · tool use · prompt caching

    measured by ──▶  the eval harness (graders, pass rate, consistency, cost)
```

Every generation passes through a guardrail before it can leave the process, and
every prompt change is measured by an eval suite rather than eyeballed.

---

## Run it in 60 seconds, with no API key

The whole pipeline runs against a scripted model, so you can see the shape of
the output and the eval report before spending anything:

```bash
cd ai-automation
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

python -m aiauto --offline post "the new Ethiopian blend lands Friday" --platform instagram
python -m aiauto --offline triage "My order arrived open and I want a refund."
python -m aiauto --offline eval social
python -m aiauto --offline eval triage --repeat 2
pytest                      # 79 tests, no network
```

The offline eval **fails two cases on purpose**. The scripted model returns one
fixed caption, so the `must_mention` grader correctly reports that "18%" and
"10pm" never made it into the copy. That is the harness working: a grader that
never fails is a grader nobody should trust.

## Run it for real

```bash
export ANTHROPIC_API_KEY=sk-ant-...          # or `ant auth login`
python -m aiauto post "Eid gift boxes are open for pre-order" --platform instagram
python -m aiauto eval social --repeat 3 --json report.json
python -m aiauto report "Write this week's report for Karachi Coffee Roasters."
python -m aiauto serve                        # http://localhost:8000/docs
```

Or bring up the service and n8n together, then import the two workflows from
`n8n/` in the n8n editor:

```bash
cp .env.example .env && $EDITOR .env
docker compose up --build
```

---

## What each piece is, and why it is built that way

### 1. Content generation — `src/aiauto/content.py`

A brief goes in; a caption, hashtags, a CTA, an image prompt and alt text come
out, sized for the platform it is going to.

The generation is the easy half. The half that matters is
[`validate_post`](src/aiauto/content.py): every draft is checked against the
platform's character and hashtag limits, the merchant's banned-word list, and
the presence of alt text. A draft that fails gets **exactly one** repair pass
with the specific violations quoted back to the model — and if it fails again,
the function raises instead of returning. A silent third attempt is how a bad
caption ends up on a client's page.

Structured outputs (`output_config.format`) mean the JSON is schema-valid by
construction, so there is no `json.loads` in a `try` block anywhere in this
project and no "please respond in valid JSON" pleading in a prompt.

### 2. Inbox triage — `src/aiauto/triage.py`

This is the AI half of the Messenger→WhatsApp forwarder that already lives in
this repository. The forwarder pushes every message to a phone, unfiltered.
Triage adds the judgement: intent, urgency, sentiment, language, a one-line
summary, a ready-to-send reply, and the only field that really matters —
`safe_to_auto_reply`.

The model proposes that flag; [`apply_policy`](src/aiauto/triage.py) narrows it
and can never widen it. Complaints, negative sentiment and anything urgent are
forced to "a human reads this first", regardless of what the model decided. A
prompt is a strong suggestion; an `if` is a guarantee, and the difference is
worth two lines of code.

### 3. Reporting agent — `src/aiauto/agent.py`

The one place an agent is the right tier: an open-ended question ("how did we do
and what should we change") where the model decides which numbers it needs.

Three tools — `list_merchants`, `get_performance`, `compare_periods` — each
returning small, pre-aggregated JSON. The alternative, one tool that dumps the
table and lets the model do arithmetic, burns context and invents numbers. The
loop itself is the SDK's `tool_runner`; the tool surface is the part worth
owning.

### 4. Eval harness — `src/aiauto/evaluation/`

Seven deterministic graders and an optional LLM judge, run over JSONL datasets,
reporting pass rate, per-grader breakdown, cost, p95 latency, and **consistency**
— the share of cases whose repeated runs agreed with each other.

Consistency is the number most AI demos never show and every production system
needs. A workflow that is 95% right on a single pass and disagrees with itself
one run in four is not a 95% workflow.

`must_not_fabricate` is the grader worth reading: any price, percentage or date
in the output must also appear in the brief. Crude on purpose — it has no false
negatives on the failure that actually costs a merchant money.

### 5. n8n workflows — `n8n/`

Two importable workflows, described in [`n8n/README.md`](n8n/README.md):

| File | What it does |
|---|---|
| `01-daily-content-pipeline.json` | Weekday 09:00 → build the posting plan → generate a campaign per merchant → one item per platform → LinkedIn posts go for human approval, the rest publish → log everything |
| `02-inbox-triage-and-reply.json` | Webhook from the forwarder → triage → switch on the route → auto-reply, alert the owner, queue for a human, or drop |

Neither workflow holds an API key or a prompt. n8n calls one JSON endpoint and
stays a workflow tool instead of quietly becoming the application.

### 6. The service — `src/aiauto/api/main.py`

FastAPI, bearer-token auth, a uniform `{output, cost_usd, model}` envelope so n8n
maps one shape for every endpoint, and error handling that distinguishes what the
caller can fix (422, the content broke a rule) from what it cannot (429, 502).

---

## Layout

```
ai-automation/
├── src/aiauto/
│   ├── llm.py             Claude client: structured output, caching, usage → dollars
│   ├── models.py          Pydantic schemas — the contract with Claude and with n8n
│   ├── content.py         Post generation + the validation guardrail
│   ├── triage.py          Message triage + the auto-reply safety policy
│   ├── agent.py           Tool-using reporting agent
│   ├── metrics.py         The data the agent's tools read
│   ├── evaluation/        Graders, harness, datasets
│   ├── api/main.py        FastAPI service
│   ├── testing.py         Offline doubles — why `pytest` needs no key
│   └── cli.py             python -m aiauto ...
├── n8n/                   Two importable workflows
├── tests/                 79 tests, no network
├── docs/
│   ├── REQUIREMENTS-COVERAGE.md   Every job-description bullet → the file that answers it
│   └── WORKFLOW-DOCUMENTATION.md  Runbook: operations, costs, failure modes, changing a prompt
├── Dockerfile
└── docker-compose.yml     The service + n8n, as it actually runs
```

## Design decisions worth defending

**Opus 5 everywhere, effort as the cost lever.** `claude-opus-5` on every call.
Triage runs at `medium` effort because it is high volume and narrowly scoped; the
LLM judge runs at `low`; drafting and reporting run at `high`. Tuning effort per
route is a bigger, safer saving than downgrading the model and re-testing
everything.

**The system prompt is cached, the brief is not.** The merchant brand sheet and
the house rules go in a cached system block; the volatile per-post detail rides
in the user turn. Same posts, roughly a tenth of the input cost after the first
call in each five-minute window.

**The workflows depend on a protocol, not on the SDK.** Everything downstream is
written against the `LLM` protocol in `llm.py`, which is why the test suite runs
in a second with no key and no network — and why swapping in a different provider
would touch one file.

**Failures are data.** A workflow that raises inside the eval harness is recorded
as a failed run, not an aborted eval. A crash on case 3 of 40 is itself a result
worth seeing next to the other 39.
