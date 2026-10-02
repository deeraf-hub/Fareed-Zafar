# Engineering notes: what didn't work initially, and what I'd redesign

Each entry: what went wrong, why, the fix, and what now guards against it.

## Bugs that mattered

### 1. The workers stopped forever after one idle poll
- **Symptom.** In the browser, the first story step failed with "settle() did not converge". Every test had passed.
- **Cause.** `outbox.drain()` and `scheduler.tick()` merged overlapping runs with a guard: `guard = (async () => { try { … } finally { guard = null } })()`. With nothing due, the async body finished *synchronously*, so `finally` ran before the assignment, and the guard kept a settled promise forever. After one empty poll, no SMS was sent and no timer fired. The tests drove the workers through `settle()`, which only drains when something is due, so they never hit the empty path.
- **Fix.** Assign first, clear in `.finally()` on the stored promise.
- **Guard.** `test/workers.test.js`: three tests, including the real pollers on an idle queue. All three fail on the old code and pass on the new.

### 2. Every P1 without a rule-set safety type got the water steps
- **Symptom.** Found while writing the reliability doc. `safety: s.safety ?? "water"`. A gas smell triaged by the model, or a no-heat P1 from the weather rule, would have been told to close the water valve instead of "leave now". The voice fallback hard-coded the water valve too.
- **Fix.** The vetted template now follows the category (plus cold and heat templates for HVAC P1s). If nothing applies, no steps are sent rather than wrong ones, and the voice fallback uses the same template.
- **Guard.** `test/scenario.safety.test.js`.

### 3. Policy judged the case as it was, not as it would be
- **Symptom.** A model-written reply on a brand-new legal-sensitive case went out (only quiet hours delayed it). The sensitive flag was set by the same plan, after policy had looked.
- **Fix.** Validate against `projectCase(case, plan)`.
- **Guard.** `test/scenario.sensitive.test.js`.

### 4. The eval said 73% before it said 100%
- **Symptom.** The first eval run: emergency recall 19/26. The SOP's temperature rules were missing entirely, and common phrasings fell through.
- **Lesson.** Rules written from intuition miss things an eval finds in a minute. The second holdout found a structural flaw: a P3 keyword skipped the model. That's why the hazard second look exists.
- **Guard.** The eval gates in `npm test`. The full story is in [evals.md](evals.md).

### 5. The on-call ladder could page all night
- **Symptom.** After level 3, everyone was re-paged every 10 minutes with no limit: six calls and texts every 10 minutes until morning.
- **Fix.** Bounded all-staff rounds with growing gaps (10 → 20 → 40 min). After that, paging stops, the case stays flagged, and a late ACK still owns the case. This mirrors an escalation policy's "repeat N times".
- **Guard.** `test/escalation.test.js`.

### 6. The KPI overstated rule coverage
- **Symptom.** Lead gen showed "94% decided by rules alone" with 10 model calls. Calls made while processing *system* events (an enrichment result arrives, then the email gets written) weren't counted as decision points.
- **Fix.** Any event that used a model is a decision point, with its own naive baseline. Lead gen honestly reads 76%.

### 7. Look-alike phrases could hide a real hazard
- **Symptom.** Rules had an `unless` pattern that vetoed the whole rule. "There's a fire in the kitchen and the fire extinguisher is empty" would have matched "fire extinguisher" and dropped the fire rule.
- **Fix.** `ignore` spans: look-alike phrases are cut out before matching, so a real hazard elsewhere still matches.
- **Guard.** `test/rules.test.js`.

### 8. The n8n rota workflow would sync a ladder with a hole in it
- **Symptom.** A rota missing level 2 passed validation, because `Array.prototype.some` skips holes in sparse arrays.
- **Fix.** `[...ids].some(…)`.
- **Guard.** `test/n8n.test.js` executes the workflow's Code node; that's how this was caught.

### 9. Smaller ones
- **Frequency caps.** They used `Date.now()` instead of the injected clock, and they counted emergency messages against routine ones, holding a resident's normal updates during a leak. Fixed with the clock everywhere and purpose-aware caps.
- **Quiet hours on approved replies.** Once a person approved a sensitive reply, quiet hours still deferred it. A reply someone is waiting for isn't initiated contact (`inReplyTo`).
- **Stale facts in the vendor dispatch.** The first dispatch said "General request" because it read case facts before the plan applied them. The dispatch now carries its own category and room.
- **Work-order status.** The emergency work order stayed "in progress" after mitigation, and the simulated Rentvine didn't reflect external changes. Fixed both.
- **Retrieval.** The stemmer treated *valve*/*valves* differently. The markdown intro section was never indexed. A token-overlap filter dropped "fee".
- **Lead scoring.**
  - Too many A-tier owners: the threshold was raised.
  - Over-regularization pushed the absentee weight the wrong way. Retuned until it moved the right way and held-out log-loss improved (0.442 → 0.284 in the demo run).
  - The synthetic history had an unrealistic 33% positive rate.
- **Twilio signatures.** Node's `URL` silently drops `:443`, so port variants are built by hand. A hard-coded "documented" signature couldn't be reproduced, so it was replaced with a round-trip test.
- **Configuration.**
  - A blank `FRONTIER_PROVIDER=` in `.env` crashed startup; empty now means unset.
  - The console couldn't send `CONSOLE_TOKEN`, so turning on security would have locked out the UI.
  - Model ids were hard-coded with a per-model price table. Models are configuration now, pinned or discovered at startup, with prices per tier.
- **Optional embeddings could fail the whole event** if the embedding server was down. They are now a second signal, never a dependency.

## What I'd redesign today

1. **Rules as reviewed data.** Severity rules, look-alikes and templates would live in versioned config that ops can edit through a review screen. Every change would run the eval gates before it ships. Today they are code, which is safe but makes engineering a bottleneck.
2. **Postgres from day one.** The schema is ready. Multi-instance workers need `FOR UPDATE SKIP LOCKED` claims and a real queue (or Postgres `LISTEN/NOTIFY`) instead of polling.
3. **Evals from production.** Every person-corrected priority or reopened case becomes an eval case automatically. A frozen holdout gets re-sampled quarterly. Shadow mode runs a candidate model on live traffic before it decides anything.
4. **OpenTelemetry instead of home-grown traces.** The nine-stage trace maps cleanly onto spans, which would put Mortar in the same tooling as the rest of the platform.
5. **Webhooks over polling for Rentvine**, if the account supports them, plus a nightly reconciliation job either way.
6. **Inbound voice.** Many 11:30 PM emergencies arrive as phone calls. Speech-to-text into the same pipeline, with the same rules, is the next big step.
7. **Per-property playbook settings.** Approval limits, quiet hours and vendor ladders already come from data. Next would be owner-specific notification preferences and language.
