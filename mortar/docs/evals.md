# Evals

```bash
npm run eval                                  # all suites, with whatever model tiers .env configures
npm run eval -- --suite triage                # triage | holdout | replies
npm run eval -- --json                        # machine-readable (CI)
LOCAL_MODEL_PROVIDER=ollama npm run eval      # the same sets against a real local model
```

The harness calls the **production decision functions**: `assessMessage`, `needsTriageModel`, `resolveSeverity`, `decideVendor`, `decideNeighbor`, `decideResident`, `resolveVendorStatus`, `neighborFinding` and `residentReplyRoute`, plus the real model router. It scores exactly what the running system would do, not a re-implementation that could drift.

## Datasets

| Set | Size | What it is |
|---|---|---|
| `triage.json` (development) | 81 | Resident messages labeled P1 / P2 / P3 / non-maintenance against `data/knowledge/emergency-sop.md`. Includes look-alikes ("smoke detector chirping", "fire hydrant", "burned toast"), weather-dependent cases with a `weatherF` reading, mixed messages and one long message with the emergency buried at the end |
| `triage-holdout.json` | 20 | Written after the rules were tuned, **never used to tune them**. Report-only |
| `replies.json` | 30 | Replies inside an open P1 case: vendor (keypad and SMS, including polite declines and delays), the unit above (clear and hedged), the resident (1/2, thanks, questions, new issues, hedged "still feels wet") |

## Metrics and gates

| Metric | Why it matters | Gate |
|---|---|---|
| **Emergency recall** | A missed P1 is the failure that matters most | **100% on the development set** (exit code 1 otherwise) |
| Emergency precision | False P1s wake people at night | reported |
| Under-triage / over-triage | Under is dangerous, over is costly | reported |
| **Unsafe reply misses** | "Still leaking" read as resolved, a decline read as accepted (the ladder would wait on nobody), a found leak read as dry | **zero** |
| Decided by rules alone | How often no model was needed | reported |
| Model tokens and spend vs naive | The token-efficiency claim, measured | reported |

`npm test` includes `test/eval.test.js`, so a rule or model change that breaks a gate fails the build, not just a separate eval run.

## Results (simulated model tiers)

| Suite | Result |
|---|---|
| Development triage (81) | Recall **100%** (36/36) · precision 100% · accuracy 95.1% · rules alone 74% · 5,218 model tokens vs 86,693 naive (−94%) |
| Holdout triage (20) | Recall **62.5%** (5/8) · accuracy 70% · report-only |
| Replies (30) | Accuracy **100%** · unsafe misses **0** · rules alone 73% |

The four remaining development-set misses all come from the simulated stand-in model. All four sit on the maintenance / non-maintenance boundary: a fire hydrant on the street, a loud neighbor, pool hours, and a heater that bangs but works. None is an emergency. Rule-decided results are exact in any mode. Model-decided rows mean something only when you run a real model, which takes one environment variable.

## History: how the numbers got here

This is the honest part, and why evals exist.

1. **The first run, against the first 56 messages: emergency recall 73% (19/26), with 11 under-triaged.** The gaps were real:
   - The SOP's temperature rules weren't implemented at all. "No heat and it's 30 degrees outside" came out P2; the SOP says P1.
   - Common phrasing slipped through: "stopped working", "isn't cooling", "ceiling collapsed", a hot outlet that "smells like burning plastic", a water heater "leaking all over the floor".
   - Replies had three unsafe misses: two polite vendor declines read as unreadable, and a "new issue" mention that was only logged.
   - Fix: rules for each SOP gap, the weather feed, a broader vendor parser, and routing for new problems in open cases → recall 100%, zero unsafe misses.
2. **The first holdout: 70% (7/10) by rules alone.** Fresh phrasing exposed four more gaps:
   - "I can smell smoke"
   - storm water "coming in under the front door"
   - a fall with an injury
   - a power outage
   - Fixed and **merged into the development set** (now 81).
3. **The second holdout (current): 62.5% (5/8).** It found a design flaw, not just phrasing. In "my kitchen is filling up with water from the dishwasher, it won't stop", the *dishwasher* rule (P3) matched, and any rule match skipped the model. So a routine keyword could hide an emergency.
   - The fix is architectural: below P1, hazard words buy a **second look** from the local model, which can only raise severity.
   - The other holdout misses ("smell of natural gas", "smashed our sliding door glass") are left unfixed on purpose. A real local model reads them, since no rule matched. Fixing them would turn the holdout into a second development set.

**How this should run in production:**
- Every misrouted message, whether a person corrected the priority or reopened a case, becomes an eval case.
- Keep a frozen holdout sampled from real traffic and re-sample it each quarter.
- Gate model and rule changes on the development set, and watch the holdout for drift.
