# State & memory

**Rule: a model never sees a transcript.** It sees the new message, the few facts the task needs, and a one-line summary that *code* rebuilt from structured state. Customer history lives in the database, where code can query it for free.

## Four kinds of memory

| Memory | Where | Written by | Read by |
|---|---|---|---|
| **Facts** — what is true about this case right now | `cases.facts` (JSON), `cases.status`, `priority`, `external`, `flags` | The pipeline, from plan fragments, in one transaction | Rules (every event), policy, context packs |
| **Rolling summary** — one line a person or model can read | `cases.summary` | `playbook.summarize(case)` — **code, not a model** | Context packs, the console, staff briefs |
| **Timeline** — what happened, for people and audit | `case_log`, `events.trace` | The pipeline | The console, the audit; never sent to a model in bulk |
| **Learned state** — what the system has learned | `kv` (lead-scorer weights, bandit arms, learning log), `parties.attributes` (consent, preferences) | Learning cycle, outcomes, consent changes | Rules (scoring, variant choice), policy (consent) |

Plus the **directory** (`parties`, `properties`, `units`): who someone is, which unit is above, which vendors take after-hours plumbing calls, the owner's approval limit. Directory lookups are SQL and cost nothing.

## A real example

From the 11:30 PM leak, after the unit above replied (captured from the running system):

```
Case summary (code-built):
  Vendor assigned · P1 Water leak · Vendor: Hill Country Plumbing, ETA 12:12 AM ·
  Paging on-call (level 1) · Unit above: possible leak · WO-5511

Facts: severity, category, trades, room, rulesFired, issueSummary, report, afterHours,
       shutoff, dispatch, escalation, neighborCheck
```

The only model call at that step was `maintenance.classify_reply` on the local tier, and this is the entire prompt it received (96 tokens, plus an 81-token system prompt that never changes):

```
## Reply
Hmm, the floor by my bathroom vanity feels a little damp? Not sure if that's new.

## Who replied
resident of the unit directly above the leak

## What we asked them
check under sinks, toilet, tub and water heater for water

## Case summary
Vendor assigned · P1 Water leak · Vendor: Hill Country Plumbing, ETA 12:12 AM · Paging on-call (level 1) · Unit above: asked · WO-5511
```

The resident's full history at that moment was 39 log entries (~2,400 tokens), and it grows with every event. The prompt stays the same size however long the case runs.

## How a context pack is built

`src/models/context.js` — `contextPack(sections, { budgetTokens })`:

1. Each section has a title, a body, a **priority** (1 = must include) and an optional `maxTokens` cap.
2. Sections are added in priority order until the budget is spent. Long sections are truncated, and low-priority ones are dropped and recorded.
3. Objects render as compact `key: value` lines, which are cheaper than JSON and easier for small models.

Every task declares its own pack and budget next to the playbook that uses it (`src/playbooks/*/tasks.js`). The budgets are small: 500–900 tokens.

## Why code writes the summary

- **Free and instant:** no model call per event to "update memory".
- **Correct:** the summary is a projection of the facts. It can't drift from them, and it can't hallucinate a vendor or an ETA.
- **Status first:** each summary starts with the current state ("Vendor assigned · P1 Water leak · …"), so people and models read the important part first.

## Consistency

- **Optimistic concurrency.** `cases.version` increments on every save, and `saveCase` updates only `WHERE version = ?`. If a timer and an SMS race on the same case, the loser gets a `ConflictError` and the pipeline re-runs it against fresh state (up to three attempts).
- **Validation against the future.** Policy judges each action against `projectCase(case, plan)`, the case *as it will be* once this plan commits. A case this very plan marks "legal-sensitive" is already sensitive when its first model-written reply is checked. This was a real bug before; see the engineering notes.
- **Idempotency everywhere.**
  - Events dedupe on the provider's id (MessageSid, Message-ID, webhook id).
  - Outbox rows dedupe on `caseId:eventId:actionKey`. Once-per-case actions dedupe on `caseId:actionKey`.
  - Connectors pass the idempotency key on to providers that support it.

## Learned state (lead generation)

| State | What it is | Updated |
|---|---|---|
| `leadgen:weights` | Logistic-regression weights over nine explainable intent features | Nightly learning cycle; promoted only if held-out log-loss improves |
| `leadgen:bandit` | Per tier: Beta(α, β) for each subject-line variant (Thompson sampling) | Immediately: any human reply that isn't a "no" is a win for the variant |
| `leadgen:outcomes` | Feature vector + label per prospect: booked meeting = 1, definitive no = 0 | When the outcome happens |
| `leadgen:suppression` | Unsubscribed / do-not-contact addresses | On the request, before anything else is sent |
| `leadgen:spend` | Paid enrichment lookups and dollars | Each lookup |
| `leadgen:learning-log` | Every cycle's metrics and decision | Each cycle |

Learning-state updates are declarative operations (`append`, `increment`, `set`) in the plan. They commit in the same transaction as the case update, so an outcome is never counted twice or lost.

## Porting to RDS / Postgres

The schema is plain SQL. The changes are mechanical:
- TEXT-JSON columns become JSONB.
- Worker claims use `FOR UPDATE SKIP LOCKED`.
- The `kv` table can stay as is or move to Redis for the hot keys.

Nothing in the playbooks knows which database is underneath.
