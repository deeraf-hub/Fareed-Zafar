# Models & tokens

**"Does this actually require an LLM?"** is a question the code answers on every event, and the trace records the answer either way. When rules decide, the Model stage says why no model was needed ("keypad '2' parsed by rule"). When a model is used, its task states why it needs one.

## Three ways to decide

| | Use it for | Cost | Examples in Mortar |
|---|---|---|---|
| **Code** | Anything with a crisp definition or a safety consequence | 0 tokens, microseconds | Emergency severity, safety steps, vendor ladder, ETAs, YES/NO/1/2, consent, quiet hours, scoring, scheduling |
| **Local model** (Ollama, vLLM, llama.cpp) | Reading free text: classification and extraction | No marginal cost; 100s of ms | Hedged replies, vendor findings → structured work, inquiry parsing, reply intent |
| **Frontier model** (Claude) | Judgment where wording matters and the volume is small | Paid; budgeted daily | Legal/health-sensitive drafts (a person approves), A-tier prospect research briefs |

## The ten model tasks

Each task is a narrow job with a zod schema, declared next to the playbook that uses it (`src/playbooks/*/tasks.js`).

| Task | Tiers | Why it needs a model |
|---|---|---|
| `maintenance.triage` | local → frontier | No rule matched, the message is long and mixed, or hazard words sit behind a routine rule (a second look that can only *raise* severity) |
| `maintenance.vendor_report` | local → frontier | Vendors write findings in free text; turning "burst line under 3B vanity, drywall needs replacing, ~$1,150" into follow-up work orders is extraction |
| `maintenance.classify_reply` | local → frontier | Most replies are parsed by rules (1/2, YES/NO, "all dry", "thanks"); hedged or mixed ones need a reader |
| `maintenance.sensitive_reply` | frontier | Legal threat + rent withholding + health risk in one message: wording matters, volume is tiny, and a person approves the draft |
| `leasing.read_inquiry` | local → frontier | Inquiries pack several facts into one breath. *Reading* them is a small-model job; *answering* them is code (from the listing record) |
| `leasing.classify_reply` | local → frontier | "Loved it but it's a stretch on price" → objection detection is classification |
| `knowledge.answer` | local → frontier | Long-tail questions ("is there a fenced yard?") answered **only** from retrieved documents. If the answer isn't grounded, a person answers |
| `leadgen.personalize` | local | One specific opening line for B-tier volume; a deterministic opener is the fallback |
| `leadgen.read_reply` | local → frontier | Owners reply in sentences ("maybe after the holidays — what do you charge?"): intent + date + question extraction |
| `leadgen.research_brief` | frontier → local | Top-tier prospects only: turning weak signals into one credible angle is judgment, and the value per prospect justifies it. A person reviews the first email |

Hard lines that no model crosses:
- **Models may raise a severity a rule set, never lower it.** A model can't talk an emergency down.
- **Safety instructions are vetted templates.** They are filled with retrieved facts, such as where this unit's shutoff valve is, and never generated.
- **Prices, pet exceptions, entry into an occupied unit and spend over the owner's limit are people's decisions.** The agent drafts and routes them.

## The router

`src/models/router.js`

```
for tier in task.tiers:                         e.g. local → frontier
  skip if: no provider · circuit open · (frontier) daily budget spent      ← recorded as a skip
  call with the task's JSON schema
  validate with zod → on failure, ONE repair round showing the exact errors
  confidence below the task's floor → keep as a candidate, try the next tier
  success → ledger + cache → return
nothing worked → { ok: false } → the playbook's deterministic fallback
```

- **Fallbacks are designed, not hoped for.**
  - Triage with no model available → P2, flagged for a person.
  - A vendor update nobody can read → the case owner is alerted.
  - No research brief → the deterministic opener.
- **Circuit breaker.** After three consecutive transport failures a provider is skipped for 60 seconds. Refusals and bad JSON don't count, because the provider isn't down.
- **Frontier budget.** `FRONTIER_DAILY_BUDGET_USD` is a hard cap. Past it, frontier tasks take the next tier or the fallback.
- **Cache.** Identical prompts for cacheable tasks return the earlier answer, and the ledger records it as `cached`.

Try it live: the console's **Take local model down** button. The next hedged reply goes `local: error → frontier: ok`, and the ledger shows both attempts.

## Providers

| Provider | Structured output | Notes |
|---|---|---|
| **Ollama** (`ollama.js`) | JSON schema in `format`: grammar-constrained decoding | Temperature 0, `think: false` for narrow jobs, `keep_alive` so the model stays warm; token counts from Ollama |
| **OpenAI-compatible** (`openai-compatible.js`) | `response_format: json_schema, strict` | vLLM, llama.cpp `llama-server`, LM Studio, or a hosted open-model endpoint |
| **Anthropic** (`anthropic.js`) | Structured outputs from the task's zod schema (`output_config.format`), parsed and validated by the SDK | Per-task `effort`; the system prompt is marked for prompt caching; server-side refusal fallback; one SDK retry, then the router decides |
| **Simulated** (`simulated.js`) | Each task's `simulate()` heuristic | Offline demo, CI and evals; every result is flagged `estimated` |

**Model choice is configuration, never code.**
- `FRONTIER_MODEL` pins an exact model id. Do that in production, and upgrade deliberately after `npm run eval`.
- Left unset, the provider asks the Anthropic Models API for the newest model of `FRONTIER_MODEL_FAMILY` that supports structured outputs and effort, and logs the choice.
- The local tier works the same way with `OLLAMA_MODEL` (unset = the first installed chat model).
- Prices are per tier (`FRONTIER_USD_PER_MTOK_IN/OUT`), not a table of model names that silently goes stale.

## Context engineering

See [State & memory](state-and-memory.md). In short:
- A model gets the new message, the facts the task needs, and the code-built rolling summary.
- Everything goes into a token-budgeted context pack (500–900 tokens), never a transcript.
- System prompts are stable, so they cache.

## Retrieval (RAG), where it earns its place

Most context is structured and comes from SQL: unit → property → owner → approval limit → vendors → on-call. Retrieval covers the unstructured rest in `data/knowledge/`: building guides, the emergency SOP, the leasing policy, management services.

1. **Scope filter first.** Only this property's documents plus global ones, so one building's notes can never leak into another's answers.
2. **Rank.** BM25 with light stemming. Embeddings are optional (`EMBEDDINGS_PROVIDER=ollama` with `EMBEDDINGS_MODEL`) and fused with reciprocal rank fusion. They are a second signal, never a dependency: if the embedding server is down, retrieval falls back to BM25.
3. **Rerank.** Property-specific chunks outrank generic ones on ties.
4. **Budget.** Only as many chunks as fit the caller's budget, e.g. 160 tokens for "where is the shutoff valve".

Where it's used:
- the shutoff location in a P1 safety message, when the unit record doesn't have it
- grounded long-tail leasing answers (`knowledge.answer`, which refuses when ungrounded)
- policy text for sensitive drafts

## Cost accounting: the naive baseline

Every non-system event, and every system event that used a model, records two numbers:
- **Used:** the model tokens and cost actually spent, from the ledger.
- **Naive:** what the design the JD warns against would have spent on the same event. That is a 700-token system prompt, the customer's full history from the store, the party, property, unit and event, plus 350 output tokens, at the frontier price.

The console's KPIs, `/metrics` and `npm run demo:cli` all report both, so token savings are computed per event rather than claimed.
