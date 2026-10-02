# Reliability & human-in-the-loop

Mortar assumes everything fails sometimes: providers redeliver, processes crash, connectors time out, models go down or answer badly, people don't pick up. Each failure has a designed outcome, and most have a test.

## What can fail, and what happens

| Failure | What Mortar does | Where · test |
|---|---|---|
| A provider redelivers a webhook | Unique idempotency key → stored once, ignored after (`200`, not a second case) | `events.idempotency_key` · `scenario.leak`, `n8n` |
| The process dies mid-event | The event row was persisted before processing; on start, `recover()` re-queues it. State commits in one transaction, so nothing is half-applied | `processor.js`, `pipeline.js` |
| The process dies after commit, before sending | The outbox row is still `pending`; `in_flight` rows are re-queued on start | `outbox.js` |
| A connector times out / returns 5xx | Retry with backoff 2 s → 10 s → 30 s → 2 min → 10 min (±20% jitter), up to 6 attempts | `outbox.js` · console **Twilio SMS outage ×2** |
| A connector rejects permanently (4xx, bad number) | Dead-letter at once, emit `action.failed`, the playbook falls back: emergency SMS → voice call with the same vetted steps; vendor unreachable → next vendor; otherwise → a person | `planActionFailed` · `scenario.safety` |
| The local model is down or slow | Next tier (frontier); a circuit breaker skips the dead provider for 60 s | `router.js` · console **Take local model down** |
| A model returns invalid JSON | One repair round showing the exact schema errors → next tier → deterministic fallback | `router.js` |
| A model is unsure | Below the task's confidence floor → next tier; still unsure → the case is flagged for a person | `router.js`, `planNewIssue` |
| The frontier budget is spent | Frontier tasks are skipped (recorded in the ledger); local/deterministic paths continue | `router.js` |
| No model at all | Triage → P2 + a person double-checks; unreadable vendor update → case owner alerted; sensitive reply → a deterministic brief for the manager | `scenario.sensitive` |
| Two events race on one case | Optimistic concurrency (`version`) → the loser re-runs against fresh state | `store.saveCase`, `pipeline.js` |
| A timer fires after the world changed | Timers are events; the playbook re-decides with current state ("vendor already accepted" → no-op) | `decideTimer` (`stale_timer`) |
| The agent starts looping | Pleasantries and auto-replies get no reply; frequency caps (6/day routine, 15/day emergency); **runaway guard**: 40 actions on one case in an hour → blocked | `policy.js`, `compliance.js` |
| Nobody on call answers | Ladder: level 1 → 2 → 3 → all staff, waiting 10, 20, 40 min between rounds; after 3 rounds paging stops, the case stays flagged, a late ACK still takes it | `escalation.js` · `escalation.test` |
| The weather feed breaks | Readings older than 3 h are ignored — stale data can't set severity | `directory.outsideTempF` · `scenario.weather` |
| A background worker silently stops | Regression tests run the real pollers on an idle queue, then check new work still executes | `workers.test` |

**Delivery semantics.** Actions are delivered *at least once*. The idempotency key goes to every connector, so providers that support one can deduplicate. A crash in the narrow window after a provider accepted a message and before Mortar recorded it can repeat that one message, and never lose it. That trade-off is deliberate.

## Validation: four verdicts, thirteen rules

Every planned action passes `src/core/policy.js` before anything leaves the building. Rules are plain functions, so the list reads like a policy document. Groups run in order, and the first verdict wins.

| Group | Rule | Verdict | Why |
|---|---|---|---|
| Hard | `runawayGuard` | block | >40 actions on one case in an hour: the agent is paused |
| | `smsOptOut` | block | The recipient replied STOP (TCPA/CTIA) |
| | `marketingEmailOptOut` | block | Unsubscribed from marketing email |
| | `marketingSmsConsent` | block | No SMS marketing consent on file (TCPA), so email is used |
| | `canSpamFooter` | block | A marketing email without an unsubscribe line |
| | `fairHousing` | block | Leasing/marketing text that steers or describes an ideal or excluded resident |
| Human | `playbookRequested` | approve | The playbook asked (entry into an occupied unit, A-tier first touch) |
| | `generatedContent` | approve | Model-written text that promises payment, guarantees, admits liability, offers a concession or gives legal advice; contains someone else's contact details; or is too long |
| | `spendLimit` | approve | Spend over the owner's pre-approval. Emergency mitigation is exempt per the SOP |
| | `humanInControl` | approve | A team member has taken over this conversation |
| | `sensitiveCase` | approve | Legal/health-sensitive case: model-written replies wait for a person |
| | `frequencyCap` | approve | Too many messages to one person in 24 h (purpose-aware) |
| Timing | `quietHours` | defer | 9 PM–8 AM for contact Mortar *initiates*; emergencies and replies someone is waiting for go now |

Policy judges each action against the case **as it will be** after this plan (`projectCase`), not as it was. Approved actions re-enter validation with the human rules satisfied; the hard and timing rules still apply.

## Where people come in

| Mechanism | How it works |
|---|---|
| **Approvals** | Held actions land in "Needs a person" with the reason. Approve or reject in the console, editing the drafted text first, or by **SMS YES / NO** from the designated approver (the owner, for spend over their limit). The decision is an event, so it is traced like everything else |
| **Escalation ladder** | Voice call ("press 1 to acknowledge") plus SMS ("reply ACK"). The first ACK owns the case; the ladder stops; the owner gets a brief built from structured state |
| **Takeover** | `POST /api/cases/:id/takeover`, or a person changing the lead in Follow Up Boss, sets `humanInControl`: the agent drafts, a person sends |
| **People win** | Stage changes made by people in Follow Up Boss, and work-order changes in Rentvine, are followed, never fought |
| **Exceptions** | Dead letters, unreadable updates, low-confidence triage and ungrounded answers become flagged cases with a clear reason, not silent failures |

What stays human by design: rent pricing and concessions, pet and policy exceptions, entry into an occupied unit, spend over the owner's limit, anything legal or health-sensitive, and the first email to a top-tier owner prospect.

## Observability

| Signal | Where |
|---|---|
| **Per-event trace** | All nine stages, each with a one-line summary, details and duration; stored on the event row and streamed to the console |
| **Case timeline** | Every inbound message, decision, model call, outbound message and escalation, in order |
| **Model ledger** | Every call and deliberate skip: task, tier, provider, model, outcome, tokens, cost, latency |
| **Live console** | Server-Sent Events, so the console updates the moment something happens; KPIs vs the naive baseline |
| **`/metrics`** | Prometheus: `mortar_events_total{type,outcome}`, `mortar_model_calls_total{tier,outcome}`, `mortar_model_tokens_total`, `mortar_model_cost_usd_total`, `mortar_decisions_by_rules_ratio`, `mortar_tokens_saved_ratio`, `mortar_outbox_actions{status}`, `mortar_approvals_pending`, `mortar_cases_open` |
| **Logs** | Structured JSON (`LOG_FORMAT=json`) with case and event ids |

Alerts worth setting from day one:
- dead letters > 0
- an approval pending for more than 30 minutes
- any circuit breaker open
- frontier spend above 80% of the daily budget
- event failures > 0
- the outbox `pending` count growing for 10 minutes
