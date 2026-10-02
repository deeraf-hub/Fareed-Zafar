# Loom script: 4½ minutes

The JD asks the video to show: the problem, the architecture, actual code, models and why, the systems integrated, state and memory, failure handling, what you personally built, what didn't work, and what you'd redesign. This script covers each one in order, with what to click and what to say. Speak in your own words; the lines are a guide, not a teleprompter.

## Before you hit record

- `npm run demo` → open `http://localhost:4000`, at 1440px wide or larger, zoomed to 110%.
- Have a terminal ready (font 16pt+) for `npm run eval`.
- In your editor, open:
  - `src/core/pipeline.js`
  - `src/playbooks/maintenance/rules.js`
  - `src/playbooks/maintenance/tasks.js`
  - `src/models/router.js`
  - `src/core/policy.js`
  - `n8n/02-weather-hourly.json`
  - `docs/engineering-notes.md`
- Close notifications. Do one dry run, then press **Restart** on the story.

---

### 0:00 – 0:20 · The problem
**Show:** the console, empty.

> "A property manager's hardest hour is 11:30 PM. A tenant emails: water's coming through the ceiling, and nobody answered the phone. This is Mortar, an agentic layer across Follow Up Boss, ShowMojo, Rentvine, Twilio and n8n that handles that with nobody watching. And it decides, every time, whether a model is even needed."

### 0:20 – 1:20 · It working, live
**Do:** pick *11:30 PM — water through the ceiling* → **Start** → **Next step**.

> "Every event runs the same nine stages: event, state, deterministic logic, retrieval, model *if needed*, action, validation, state update, next action. Look at the Model stage: skipped. A rule from the emergency SOP set P1 in milliseconds. Safety steps are a vetted template with this unit's shutoff location, retrieved from the building guide. The work order, the plumber, the on-call page, the unit above and the owner all go out at once."

**Do:** open Maya's thread in *Phones & inboxes*. Then **Next step** twice (the vendor declines by keypress, the next one accepts). Then **Next step** to the neighbor's reply.

> "Here's the first model call. The neighbor upstairs says the floor 'feels a little damp?' The rules refuse to guess, so a small *local* model reads 'possible leak', and the plumber is told to check 3B first. That's about 100 prompt tokens, not the transcript."

**Do:** click the case → show the state track, the rolling summary and the timeline.

### 1:20 – 1:50 · Failure handling, live
**Do:** click **Twilio SMS outage ×2**, then **Next step**, then open the **Outbox** tab.

> "I just broke Twilio. The sends failed, retried with backoff and went through. Nothing lost, nothing doubled, because every action leaves through a transactional outbox with idempotency keys."

**Do:** click **Take local model down**, then reply as Jordan in the phone panel ("hmm, maybe some water by the toilet?"), then open the **Model ledger**.

> "Now the local model's down. The router falls through to the frontier model, and the ledger shows both attempts, with tokens and cost. If both were down there'd be a deterministic fallback and a person would be flagged."

**Do:** restore the local model.

### 1:50 – 2:40 · The code
**Show, ~10 seconds each:**
1. `pipeline.js`: "The nine stages, literally; one transaction per event."
2. `rules.js`, the `active_water_intrusion` rule and the weather rules: "Emergencies are auditable patterns. A model may raise a severity, never lower it."
3. `tasks.js`: "Every model task declares *why* it needs a model, a schema, and a tier order. Local first."
4. `router.js`: "Validate, one repair round, a confidence floor, circuit breaker, a daily frontier budget, a ledger."
5. `policy.js`: "Thirteen rules, four verdicts: allow, defer for quiet hours, needs a person, block. TCPA, CAN-SPAM, fair housing, spend limits, loop guards."

### 2:40 – 3:05 · State, memory, tokens
**Show:** the KPI row.

> "No model ever sees a customer history. It sees the new message, the facts it needs, and a one-line summary that *code* rebuilds from structured state. Across this whole incident: 13 decisions, 11 by rules alone, two local-model calls, zero frontier calls. 428 tokens against about 49,000 for the send-everything-to-GPT design. That number is computed per event, not claimed."

### 3:05 – 3:30 · Integrations and n8n
**Show:** `n8n/02-weather-hourly.json`, then the systems panel.

> "n8n is glue, not brains: email, Rentvine, ShowMojo, weather and the on-call rota come in signed with HMAC. The weather feed matters because the SOP makes no heat at 40°F a P1, and that's a rule over data, not a model. The tests execute these workflows' code and send the results to a live server."

### 3:30 – 4:00 · Evals: what didn't work
**Do:** run `npm run eval` in the terminal.

> "Evals are CI gates: 100% emergency recall, zero unsafe misses. They didn't start there. The first run caught 73% of emergencies: the SOP's temperature rules were missing and common phrasing fell through. The holdout I never tuned on still catches only 62% by rules alone, and it exposed a real design flaw: a routine 'dishwasher' keyword was skipping the model. So now hazard words buy a second look from the local model."

**Show:** `docs/engineering-notes.md`.

> "My favorite bug: both background workers silently stopped after one idle poll, a promise guard cleared before it was set. Every unit test passed. A browser end-to-end run caught it, and now three regression tests do."

### 4:00 – 4:30 · What I built, and what I'd redesign
> "What I personally did: *<be specific and honest — what you designed, built, tested, changed or deployed, and how you used AI tools>*."

> "What I'd redesign: rules as reviewed data that ops can edit behind the eval gate. Postgres on RDS from day one for multi-instance workers. Evals fed automatically from production corrections. And an inbound voice agent, because a lot of 11:30 PM emergencies are phone calls."

### 4:30 · Close
> "Automate what should be automated, and keep people where judgment, risk and relationships matter. The code and docs are linked below."
