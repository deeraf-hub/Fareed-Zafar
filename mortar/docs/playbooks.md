# Playbooks

A playbook is one business workflow, written as plain functions over structured state:
- `claim`: is this event mine, and which case?
- `open`: a first event becomes a new case.
- `decide`: what situation is this? Rules only; ask for a model only if needed.
- `plan`: actions, timers, facts, the next status.
- `summarize`: the rolling summary.

Each playbook has an explicit state machine, so an illegal transition is a bug that fails loudly.

## Maintenance & emergencies — `src/playbooks/maintenance/`

**Covers:** tenant communications, intake and triage, emergency identification and escalation, vendor dispatch and coordination, work-order follow-up, owner communications, exception management.

```
New → Dispatching → Vendor assigned → On site → Mitigated → Repair scheduled → Resolved → Closed
        (also: Triaged · Awaiting info · Scheduled · Human review)
```

| Step | Decided by | Detail |
|---|---|---|
| Severity | **Rules** (`rules.js`) | P1/P2/P3 patterns from the emergency SOP. Look-alikes are cut out first (chirping detector, fireplace, hydrant). Weather rules come from the message or the feed (no heat ≤ 40°F, no AC ≥ 95°F or a vulnerable resident). |
| …when rules can't | **Local model** (`maintenance.triage`) | Used when no rule matched, the message is long and mixed, or hazard words sit behind a routine rule. It may only *raise* severity. If it is unsure, the frontier model is asked; if no model is available, the case becomes P2 and a person checks. |
| Safety steps | **Vetted templates** | Chosen by category (water, gas, fire, electrical, sewage, security, injury, structural, cold, heat), filled with retrieved facts such as this unit's shutoff valve. Never generated. If no template applies, no steps are sent rather than wrong ones. |
| Context | **SQL + scoped retrieval** | Unit → property → owner → approval limit → after-hours vendors → on-call rota; the building guide only for the shutoff location |
| Vendors | **Rules** (`dispatch.js`) | Vendor ladder by trade and priority, after-hours filter. Voice "press 1 / 2" plus SMS. A 10-minute timeout moves to the next vendor. Accept, decline, delay, ETA, on site and mitigated are parsed by rule. |
| Free-text findings | **Local model** (`maintenance.vendor_report`) | Becomes structured follow-up work: trade, description, estimate, root cause, source unit |
| On-call | **Escalation ladder** (`core/escalation.js`) | Pages level 1 → 2 → 3 → all staff (bounded rounds). The first ACK owns the case and gets a brief. |
| Unit above (stacked buildings) | **Rules + local model** | Asked to check without names or unit numbers. Clear replies are parsed by rule; hedged ones go to `classify_reply`. Entering an occupied unit needs a person's approval. |
| Follow-through | **Timers** | 30-minute check-in (reply 1 / 2), vendor arrival, the "is it still leaking?" reopen path, close 72 hours after resolution |
| Money | **Policy** | Mitigation proceeds (SOP). A follow-up repair over the owner's limit is held for the owner's approval (SMS YES/NO); the request respects quiet hours. |
| Sensitive cases | **Frontier model + a person** | Legal threat / rent withholding / health risk: a vetted acknowledgement now, a frontier draft that a person approves, and the history as structured facts |
| Rentvine | **Connector** | Work order created at intake; status mirrored (in progress → completed when mitigated); the repair gets its own work order; Rentvine webhooks resolve the case |

The executable spec is `test/scenario.leak.test.js`: eleven steps from the 11:30 PM email to *closed*, with exactly two local-model calls.

## Leasing — `src/playbooks/leasing/`

**Covers:** inquiry response, prospect qualification, self-tour scheduling, tour reminders (ShowMojo sends those), post-tour follow-up, objection identification, application nudges, lead routing, leasing-team escalation.

```
New → Engaged → Tour scheduled → Toured → Applied → Leased
        (also: Nurture · Lost · Human review)
```

| Step | Decided by | Detail |
|---|---|---|
| Reading the inquiry | **Local model** (`leasing.read_inquiry`) | Pulls move-in date, household size, pets (type, count, weight), tour interest, preferred times and each question out of one free-text message |
| Answering | **Code, from the listing record** | Rent, deposit, availability, pets, touring and screening come straight from structured listing data |
| Long-tail questions | **Retrieval + local model** (`knowledge.answer`) | "Is there a fenced yard?" is answered only from retrieved documents. If the answer isn't grounded, a person answers. |
| Fair housing | **Rules + policy** | Steering questions ("is it a safe area?", "good for families?") get the standard fair-housing answer. Generated leasing text that steers is blocked. |
| Pets | **Rules** | Policy checks. Exceptions go to the leasing manager, never decided by the agent. |
| Hot leads | **Rules** | Wants a tour, moves in soon and has no blocking issue → routed to the leasing manager with a brief |
| Tours | **ShowMojo events + timers** | Tour prep 2 hours before. A follow-up at start + 75 minutes, since ShowMojo has no "completed" event (an explicit one pre-empts the timer). |
| Objections | **Local model** (`leasing.classify_reply`) | "Loved it but it's a stretch on price" → acknowledged and routed to a person. The agent never negotiates rent. |
| CRM | **Follow Up Boss** | Lead via `POST /v1/events` (FUB's recommended intake); tasks, notes and stages mirrored. A person moving the lead in FUB wins. |

## Owner lead generation — `src/playbooks/leadgen/`

**Covers:** prospect discovery, enrichment, intent signals, scoring and segmentation, personalized outreach, sequences, response classification, nurturing, meeting booking, CRM sync, attribution, learning from results.

```
Discovered → Qualified → Ready to send → In sequence → Replied → Meeting booked → Signed
        (also: Nurture · Lost · Disqualified · No contact · Suppressed · Human review)
```

| Step | Decided by | Detail |
|---|---|---|
| ICP | **Rules** | 1–20 doors, all in the market's cities, not a client, not suppressed. Portfolio owners (> 20 doors) go to a person. |
| Intent signals | **Code** (`learning.js`) | Nine explainable 0/1 features: absentee owner, listed for rent, 30+ days on market, price cut, self-managed, 2–10 doors, recent purchase, eviction filing, code violation |
| Score | **Logistic model (plain math)** | Probability of a booked meeting with per-feature contributions, so every score is explainable. Tiers: A ≥ 70, B ≥ 30, C below. |
| Spend | **Tiered** | A and B get paid enrichment; C gets no spend and no outreach (nurture). Spend is tracked per lookup. |
| Research | **Frontier model**, A-tier only (`leadgen.research_brief`) | Several weak signals become one credible angle. A person reviews the first email. |
| Personalization | **Local model**, B-tier (`leadgen.personalize`) | One specific opening line, with a deterministic opener as fallback |
| Variant choice | **Thompson sampling** | A Beta-Bernoulli bandit over subject lines, per tier |
| Sequencing | **Timers + rules** | Email steps on day 0, 3 and 7 inside business-hours send windows in the recipient's time zone, with a CAN-SPAM footer. SMS only with consent (TCPA). |
| Replies | **Rules first, then local model** (`leadgen.read_reply`) | Unsubscribe, auto-reply, bounce and slot picks are rules. Intent, dates and questions go to the local model. Questions are answered from grounded knowledge. |
| Meetings | **Code** | Slots offered, a picked slot parsed by rule, booked as a Follow Up Boss appointment |
| CRM | **Follow Up Boss** | Outbound prospects use `POST /v1/people?deduplicate=true`, so lead-flow automations never fire on people who didn't ask. Stages and tags are mirrored. People's changes win. |
| Learning | **Nightly cycle** | Outcomes update the bandit immediately and become training samples. The nightly refit (L2-regularized logistic regression) is promoted only if held-out log-loss improves. |

## Shared

- `shared/actions.js`: SMS, email, call and notify builders. An action is data until the outbox runs it.
- `shared/consent.js`: STOP / START / unsubscribe handling, applied before anything else in every playbook.
- `shared/tasks.js`: `knowledge.answer`, grounded answers that refuse when the documents don't cover the question.
