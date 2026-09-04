# Runbook

What runs, when, what it costs, how it fails, and how to change it without
breaking a client's page.

---

## 1. The components

| Component | Runs as | Holds secrets? | Restart safe? |
|---|---|---|---|
| `aiauto` service | container, `uvicorn` on :8000 | yes — `ANTHROPIC_API_KEY`, `AIAUTO_API_TOKEN` | yes, stateless |
| n8n | container, :5678 | integration tokens only | yes, state in a volume |
| Eval harness | CLI, on demand or in CI | no | n/a |

The service is stateless. Every request carries everything it needs, so it can
be killed, scaled, or redeployed mid-day without draining anything.

## 2. Schedule

| When | What | Where |
|---|---|---|
| Weekdays 09:00 | Generate and publish the day's posts | n8n `01-daily-content-pipeline` |
| On every inbound message | Triage, then reply / alert / queue / drop | n8n `02-inbox-triage-and-reply` |
| Weekly, or on demand | Client report | `python -m aiauto report "..."` or `POST /reports/agent` |
| Before any prompt change ships | Eval suites | `python -m aiauto eval social --repeat 3` |

## 3. What it costs

Claude Opus 5 is $5 per million input tokens and $25 per million output.
Measured from the token counts these prompts actually produce:

| Operation | Input | Output | ≈ cost |
|---|---|---|---|
| One post | ~600 | ~600 | **$0.018** |
| A three-platform campaign | ~1,800 | ~1,800 | **$0.054** |
| One triage (medium effort) | ~400 | ~300 | **$0.010** |
| One agent report (4–6 turns) | ~15,000 | ~3,000 | **$0.15** |

Two merchants posting daily is roughly **$3/month**. Triage is the line that
grows: at 200 messages a day it is about **$60/month**, and it is the first
place to spend effort tuning rather than the first place to downgrade the model.

Three things already keep the bill down, in the order they matter:

1. **Prompt caching.** The brand sheet and house rules sit in a cached system
   block. After the first call in each five-minute window the input side of a
   repeated post costs roughly a tenth as much. Verify with
   `usage.cache_read_input_tokens` — if it is zero across repeated calls,
   something volatile has crept into the system prompt.
2. **Effort per route.** Triage runs at `medium`, the LLM judge at `low`,
   drafting and reporting at `high`. Tune this per route before touching the
   model.
3. **The repair pass is capped at one.** A bad draft costs at most two calls,
   never a retry loop.

Every response carries `cost_usd`, and the eval report totals it, so "what did
this month cost" is answerable without a billing dashboard.

## 4. Failure modes

| Symptom | Cause | What to do |
|---|---|---|
| `422` with an `issues` list | The draft broke a platform limit or a banned word twice | Read the issues. Usually the brief is asking for something the limit cannot hold — shorten the topic or raise the limit deliberately. |
| `422` "Claude declined this request" | A safety refusal | Look at the brief. A refusal on merchant copy almost always means the brief asked for a claim that should not be made. |
| `429` | Rate limited | The SDK already retried twice. n8n should retry the node with backoff; do not lower `max_tokens` to compensate. |
| `502` | Upstream API error | Check status, then retry. The service does not swallow these into an empty post. |
| Triage returns `human_queue` for everything | Usually correct — `apply_policy` forces it for complaints, negative sentiment, and anything urgent | If it is genuinely over-cautious, change `AUTO_REPLY_INTENTS`, and re-run the triage eval before shipping it. |
| Eval consistency drops below ~0.9 | The prompt has become ambiguous, or effort was lowered too far | Compare against the last saved report. Consistency falls before pass rate does — it is the early warning. |
| `cache_read_input_tokens` is 0 | A timestamp, a UUID, or unsorted JSON has entered the system prompt | Find the volatile value and move it into the user turn. |

**A grader failure is never a reason to relax the grader.** If `must_mention`
reports that "18%" is missing from the copy, the copy is wrong. The one
legitimate reason to change a grader is that it was measuring the wrong thing,
and that change gets its own commit and its own before/after eval report.

## 5. Changing a prompt safely

Prompts are code here, so they get the same discipline:

1. **Baseline.** `python -m aiauto eval social --repeat 3 --json before.json`
2. **Change one thing.** One prompt, one instruction. Two changes and you learn
   nothing from the result.
3. **Re-measure.** `python -m aiauto eval social --repeat 3 --json after.json`
4. **Compare pass rate *and* consistency.** A change that raises pass rate from
   0.83 to 0.91 while dropping consistency from 1.0 to 0.6 has made the system
   worse — you have traded a predictable failure for an unpredictable one.
5. **Read the failures, not just the number.** The report names the case, the
   grader, and the detail.
6. **Commit the report** next to the prompt change. Six weeks later "why is this
   sentence in the system prompt" has an answer.

Six cases in the social suite and eight in triage are enough to catch a
regression and small enough to run in under a minute. Grow the datasets from
real failures — every time something reaches a client that should not have, it
becomes a case.

## 6. Adding a merchant

No code change. A merchant is a `BrandProfile`: name, industry, tone, audience,
banned words, and two or three sample posts that set the voice.

1. Add a row to the posting plan in the n8n `Posting plan` node (or the sheet
   that replaces it).
2. Add two eval cases for that merchant — one ordinary post, one that exercises
   their banned words.
3. Run `python -m aiauto eval social` and read the copy before it goes live.

The sample posts do more for voice than any amount of adjective-stacking in the
tone field. Two good ones beat a paragraph of description.

## 7. Adding a platform

1. Add it to `Platform` and give it limits in `PLATFORM_LIMITS`
   (`src/aiauto/models.py`).
2. Add a line to `PLATFORM_GUIDANCE` (`src/aiauto/content.py`) — what makes a
   post work *there*, not what the platform is.
3. Add an eval case at the new limits.
4. `pytest` — `validate_post` starts enforcing the new limits with no further
   work.

## 8. Security

- The Anthropic key lives in exactly one place: the `aiauto` service. n8n never
  sees it, and no workflow export contains a credential (`tests/test_n8n_workflows.py`
  asserts this).
- `AIAUTO_API_TOKEN` gates every endpoint. Leaving it unset makes the service
  open; `/healthz` reports which mode is live so it cannot be assumed.
- Customer message text is sent to the Anthropic API for triage. That is a
  disclosure decision, not a technical one — make it explicitly, and note it in
  whatever privacy notice the merchant publishes.
- Meta's policy on Page messages still applies: the root `README.md` covers the
  24-hour customer service window and the App Review requirements. Triage does
  not change any of it.

## 9. Monitoring

- `GET /healthz` — liveness, plus the model and auth mode actually in effect.
- Request logs — method, path, status, duration, from the middleware.
- `cost_usd` on every response — log it in n8n and the monthly spend is a sum,
  not an estimate.
- The eval suites in CI with `--threshold 0.9` — a prompt regression fails the
  build instead of reaching a client.
