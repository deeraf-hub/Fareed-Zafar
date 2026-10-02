# Application answers: BricksFolios, AI automation / agentic systems engineer

Paste-ready answers to the four application questions. They are plain text on purpose: no tables or bold that a form would show as symbols. Every number comes from the running system (`npm run demo:cli`, `npm run eval`).

> **Before you submit.** Run the demo, read the code, and make sure you can explain every design decision in your own words. Question 1 asks what *you personally built*, so answer it honestly. If AI coding tools helped, say how you used them and what you decided, changed, verified and fixed yourself. For an AI-engineering role that is a strength, as long as you can defend the design in a technical interview.

---

## 1. Show us something real you built

Fill in the two links and keep the description to what you can stand behind.

```
Video (4 min): <your Loom link>
Code: <your GitHub link>

Mortar is a 24/7 agentic operating layer for residential property management (maintenance emergencies, leasing and owner lead generation) across Follow Up Boss, ShowMojo, Rentvine, Twilio and n8n.

The walkthrough shows the 11:30 PM "water through the ceiling" case handled end to end with nobody watching: 13 decisions, 11 by deterministic rules, 2 small local-model calls and no frontier calls (428 model tokens vs ~49,000 for a send-everything-to-the-LLM design). It shows:
- the code behind each pipeline stage
- failures injected live (a Twilio outage, the local model going down) and how they're absorbed
- the n8n workflows and how they're tested
- the eval suite, with gates for emergency recall and unsafe misses
- the bugs the evals and end-to-end tests caught, and what I'd redesign

My role: <one or two honest sentences — what you designed, built, tested, deployed or changed>.
```

---

## 2. Design our 24/7 property-management agent

```
I'd treat the email as an event, not a chat. Everything that can be decided without a model is decided by code. A small local model reads what code can't. The frontier model is used only where wording carries risk, and people own money, risk and relationships.

1) Intake. The maintenance mailbox is relayed by n8n (IMAP trigger), signed with HMAC and posted to the agent's /events endpoint. The event is stored before anything happens, deduplicated by Message-ID, and acknowledged immediately, so a crash or a redelivery can't lose or double it.

2) Context, from structured state, not a transcript. The sender's address maps to the tenant, unit 2B, the building, the owner and their repair approval limit, the after-hours vendor list for plumbing, the on-call rota, and whether there is a unit above. These are SQL lookups: zero tokens, milliseconds. The one unstructured fact needed, where 2B's water shutoff valve is, comes from the building guide by retrieval scoped to that property.

3) Urgency is deterministic. "Water coming through the ceiling" matches an auditable P1 rule taken from the emergency SOP. "I tried calling and nobody answered" is a signal that changes the response: escalate and acknowledge the failed call. No model is involved, because a P1 must never wait on one or be talked down by one. Models may raise a severity, never lower it. If no rule matches, the local model triages; if it's unsure, the frontier model is asked; with no model at all, the default is P2 plus a person checking. Weather rules come from data too: no heat at or below 40°F is P1, using a feed n8n refreshes hourly.

4) The tenant hears back within seconds, on SMS and email. The message carries the case number, what is happening now (plumber being dispatched, on-call manager being paged), and vetted safety steps: close the valve under your kitchen sink, stay away from wet outlets, move valuables, take photos. Safety steps are templates from the SOP, never generated. A 30-minute check-in asks "reply 1 if the water has stopped, 2 if not", which is parsed by rule.

5) Vendors. A Rentvine work order is created at P1. The vendor ladder runs in code: after-hours plumbers by priority, a voice call ("press 1 to accept, 2 to decline") plus an SMS, a 10-minute timeout to the next vendor, and the ETA parsed by rule from replies like "ETA 40 min". Access details come from the on-call manager; the agent never sends lockbox codes. In a stacked building, the unit above is asked to check for water without being told who is affected. A hedged reply like "the floor feels a little damp?" is exactly where a small local model earns its place: it reads "possible leak", and the plumber is told to check 3B first. Entering an occupied unit needs a person's approval.

6) People. The on-call ladder pages level 1 by voice and SMS; no ACK in 10 minutes pages level 2. The first ACK owns the case and gets a brief built from structured state. Re-paging is bounded, never all night. The owner gets a heads-up if that's their preference. Spend over the owner's limit is held for approval: the request waits for 8 AM because of quiet hours, and the owner approves by replying YES. A message with legal or health risk gets a frontier-model draft that a person approves.

7) Follow-through to resolution. Durable timers drive every next step: check-in, vendor arrival, "still leaking" reopen, close after 72 hours. The plumber's free-text findings ("burst supply line under the 3B vanity, drywall needs replacing, about $1,150") are turned into structured follow-up work by the local model. That becomes a repair work order, which goes to owner approval and then scheduling, and the resident is told. When the vendor marks the job complete in Rentvine, n8n relays it and the case resolves.

8) Rentvine stays current throughout: work order at intake, status mirrored, the emergency order completed when the leak is stopped, the repair as its own order, the outcome in the closing description. People's changes in Rentvine are followed, never fought.

9) Nothing leaves without validation. Every action passes a policy layer first: opt-outs, quiet hours, spend limits, fair housing, a loop guard. It then goes through a transactional outbox with retries, backoff and dead letters. If the emergency SMS can't be delivered, the tenant gets a voice call with the same vetted steps.

Who does what:
- Deterministic code: severity, safety templates, routing, vendor and on-call ladders, timers, 1/2/YES/ACK parsing, policy.
- Local LLM: hedged replies and free-text findings.
- Frontier LLM: only the rare legal or health-sensitive draft, and only for human approval.
- n8n: email, Rentvine and weather relays.
- Structured state: case facts, a one-line summary that code rebuilds, the timeline, timers, the outbox.

This exact scenario runs end to end in the working system (link in question 1): 13 decisions, 11 decided by rules alone, 2 small local-model calls and no frontier calls: 428 model tokens versus about 49,000 for a send-everything-to-the-LLM design.
```

---

## 3. Architect across our systems without wasting tokens

```
I'd build one event-driven layer with one pipeline:
Event → State → Deterministic logic → Retrieval → Model if needed → Action → Validation → State update → Next action.
The rule that saves the most tokens is simple: a model never sees a customer history. It sees the new message, the few facts its task needs, and a one-line summary that code rebuilds from structured state.

APIs and webhooks. Twilio and Follow Up Boss call the layer directly with verified signatures (Twilio HMAC-SHA1, FUB's HMAC-SHA256). n8n handles polling and relays (inbound email, Rentvine work-order changes, ShowMojo leads and showings, weather, the on-call rota) and signs every request with HMAC. Every event is stored with an idempotency key before processing, so retries and redeliveries are harmless, and the webhook is acknowledged immediately. Ordering is per subject (one tenant's texts in order) and parallel across subjects. n8n is the glue; decisions live in code where they're versioned, tested and traced.

State, in Postgres on RDS:
- events: the audit log, each with a full trace
- cases: playbook, status, priority, a facts JSON, a short summary, external ids, a version for optimistic concurrency
- a case timeline
- durable timers
- a transactional outbox
- approvals
- a model ledger
The Node/Mongo platform and Rentvine feed a directory (people, units, owners, vendors, rotas) through sync jobs, so "who is this and what's their unit" is a SQL lookup.

Memory has four layers:
- facts: what is true now
- a rolling summary: built by code, so it costs nothing and can't drift from the facts
- the timeline: for people and audit, never sent to a model in bulk
- learned state: scoring weights, bandit arms, consent
Each model call gets a context pack with a token budget (500–900 tokens). In the working system, a typical local call is about 100 prompt tokens, while the same tenant's history was 2,400 tokens and growing.

Deterministic logic first. Severity from the SOP, routing, consent and STOP, quiet hours, approval limits, vendor ladders, scheduling, lead scoring, and replies like 1/2/YES/ACK/"ETA 40 min" are all code. Each playbook is an explicit state machine. When a rule decides, the trace records why no model was needed.

Local models (Ollama or vLLM, with JSON-schema-constrained output) handle classification and extraction: hedged replies, vendor findings, inquiry facts, reply intent. They cost nothing per call and run in milliseconds to seconds.

Frontier models are for judgment where wording carries risk and volume is low, such as legal or health-sensitive drafts that a person approves, and research briefs for top-tier prospects. Every call has a schema, prompt caching on stable instructions, per-task effort, a daily budget and a circuit breaker.

Routing is per task. Each task declares its tier order (usually local, then frontier) and a confidence floor. The router validates output against the schema with one repair attempt, falls through tiers, and ends in a deterministic fallback. Every call and every deliberate skip goes to a ledger with tokens, cost and latency. Each event also records what a naive design would have spent, so savings are measured, not claimed.

Retries and failures. Actions leave through a transactional outbox: written in the same transaction as the state change, executed with idempotency keys, retried with backoff and jitter, and dead-lettered into a fallback (SMS fails, so call; vendor unreachable, so next vendor; otherwise a person). Timers survive restarts. Concurrent updates to one case are caught by version checks and re-run against fresh state.

Human escalation. Every action passes policy, with four verdicts:
- allow
- defer (quiet hours)
- needs approval (spend over limit, sensitive case, risky model-written text, a person has taken over)
- block (opt-outs, fair-housing language, runaway loops)
Approvals happen in a console with edits or by SMS YES/NO. Emergencies use an on-call ladder with ACK. When a person changes a stage in Follow Up Boss, the agent follows.

Measured in the working system (link in question 1), across four end-to-end scenarios (maintenance emergency, sensitive tenant, leasing, lead generation): 58 decision points, about three quarters decided without any model, 13 local and 4 frontier calls, and roughly 97% fewer tokens than sending each event with its history to a frontier model.
```

---

## 4. Design a 24/7 agentic lead-generation system

```
I'd treat each owner prospect as a case with structured state, run every step through the same pipeline, and spend money (data, frontier tokens, people's time) in proportion to the expected value.

1) Find. n8n schedules pulls from the sources: county records, rental listings, licensing data. Code normalizes, dedupes, and emits one event per owner record. The ICP filter is deterministic: 1–20 doors, all in our market, not an existing client, not suppressed. Portfolio owners go straight to a person.

2) Intent signals and scoring, as plain code and math. Nine explainable 0/1 features:
- absentee owner
- listed for rent
- 30+ days on market
- a rent cut
- self-managed
- 2–10 doors
- a recent purchase
- an eviction filing
- a code violation
A logistic model turns them into a probability of a booked meeting, with each feature's contribution shown, so every score is explainable to sales. Tiers: A, B, C.

3) Spend by tier. Paid enrichment (email and phone) only for A and B. C gets no spend and goes to nurture. Lookups and dollars are tracked.

4) Research and personalization.
- A-tier: a frontier model turns several weak signals into one credible angle. The value per prospect justifies the call, and a person reviews the first email.
- B-tier: a small local model writes one specific opening line, with a deterministic opener as fallback.
- Subject-line variants: chosen per tier by Thompson sampling.

5) Sequences, run by code and timers: day 0, 3 and 7, inside business-hours send windows in the prospect's time zone. Email always carries a CAN-SPAM footer. SMS goes only to people with consent (TCPA). Policy blocks anything that breaks those rules or uses fair-housing-risky language.

6) Replies. Rules first: unsubscribe and STOP (suppressed immediately), auto-replies (from headers), bounces, and slot picks ("Tuesday at 2 works"). The local model handles the rest, extracting intent, dates and questions from sentences like "maybe after the holidays — what do you charge?". The frontier model is used only when the local one is unsure. Questions are answered only from our own service documents; if an answer isn't grounded, a person answers.

7) Meetings. The agent offers real slots, parses the choice and books the appointment in Follow Up Boss. High-intent replies are routed to a person with a brief built from facts.

8) Follow Up Boss stays current. Outbound prospects are created with deduplication and no lead-flow automations (they didn't ask to hear from us). Stages, tags (tier, variant, source for attribution), notes and appointments are mirrored. When a person moves a prospect in FUB, the agent follows.

9) State without histories. A prospect's case holds:
- facts: features, score, tier, variant, sequence step, last reply intent, next step, FUB id
- a one-line summary that code rebuilds
A model call gets the new reply plus that summary, never the email thread.

10) Learning.
- Every human reply updates the subject-line bandit immediately.
- Every outcome (meeting booked = 1, a definite no = 0) becomes a training sample.
- An n8n cron runs a nightly refit (L2-regularized logistic regression) and promotes the new weights only if they beat the current ones on held-out data. In the demo, held-out log-loss went from 0.442 to 0.284 and the new weights were promoted.
- Attribution tags in FUB let us compare sources, tiers and variants by booked meetings, not opens.

Code vs n8n: n8n for schedules, source pulls, relays and notifications. Code for scoring, state, sequencing, policy, reply understanding and learning, because those need tests, versioning and evals.

In the working system (link in question 1), this flow ran 38 decision points: about three quarters decided by rules or math alone, 7 local and 3 frontier calls (only for A-tier research), 2 first emails held for human review, and 96.5% fewer tokens than sending each event and its history to a frontier model.
```
