# Requirements coverage

Three job descriptions, mapped bullet by bullet to the thing in this repository
that answers them. Every "where" is a file you can open and a command you can
run; nothing below is aspirational.

Run everything first, so the table means something:

```bash
cd ai-automation && pip install -e ".[dev]"
pytest                                  # 79 tests, no API key needed
python -m aiauto --offline eval social  # the harness, end to end
```

---

## Role 1 — AI Automation (junior / practical exposure)

| Requirement | Where | Evidence |
|---|---|---|
| Built an n8n workflow to automate a task | `n8n/01-daily-content-pipeline.json`, `n8n/02-inbox-triage-and-reply.json` | Two importable exports, 8 nodes each: schedule and webhook triggers, HTTP calls, a Code node, an IF review gate, a 4-way Switch. Structurally validated by `tests/test_n8n_workflows.py`. |
| Connected an AI model/API with another application | `src/aiauto/api/main.py`, `n8n/*.json` | Claude → FastAPI → n8n → Facebook Graph API and the WhatsApp Cloud API. The AI service is the only component that holds a key. |
| Created a chatbot or AI-powered automation | `src/aiauto/triage.py` | Classifies an inbound customer message, drafts the reply, and decides whether it can be sent without a human. Routed by `route()` into auto-reply / escalate / queue / drop. |
| Experimented with AI APIs or automation tools | `src/aiauto/llm.py` | Structured outputs, adaptive thinking, effort tuning per route, prompt caching on the system block, refusal handling, typed error classification in `describe_api_error`. |
| Built small AI projects using Python | the whole `src/aiauto/` package | ~1,800 lines of Python: four workflows, an eval harness, an HTTP service, a CLI. |
| Used n8n, Zapier, Make or similar | `n8n/README.md` | The n8n exports, plus the platform comparison already in the root `README.md` of this repository (Graph API direct vs n8n vs Make vs Zapier, with the trade-offs). |
| Build and maintain simple AI/automation workflows | `src/aiauto/content.py`, `triage.py`, `agent.py` | Three workflows, each with tests covering their failure paths, not just their happy paths. |
| Assist with n8n workflows and integrations | `n8n/README.md` | Setup, the variables each workflow needs, how to test one without publishing anything, and what a 422 from the service means. |
| Test AI-powered processes and identify improvements | `src/aiauto/evaluation/` | Pass rate, per-grader breakdown, consistency across repeated runs, cost, p95 latency. `--threshold` makes the eval a CI gate. |
| Document workflows and technical processes | `docs/WORKFLOW-DOCUMENTATION.md` | Operational runbook: what runs when, what it costs, how it fails, how to change a prompt safely. |

---

## Role 2 — AI Specialist (4+ years, portfolio mandatory)

| Requirement | Where | Evidence |
|---|---|---|
| Design, develop, test and implement AI / GenAI solutions | `src/aiauto/` | Four production-shaped workflows, 79 tests, a Dockerfile and a compose file that runs the system as it is meant to run. |
| Develop and optimise AI workflows for evaluation and QA | `src/aiauto/evaluation/runner.py` | A harness that grades, aggregates, and reports — including the metric most portfolios skip, run-to-run consistency. |
| LLMs, prompt engineering, AI agents, chatbots, automation | `content.py`, `triage.py`, `agent.py`, `evaluation/graders.py` | Prompts split into a cached stable half and a volatile half; a rubric-scored LLM judge; an SDK tool-runner agent; a triage chatbot. |
| Develop and improve prompts, workflows, evaluation methods | `docs/WORKFLOW-DOCUMENTATION.md` § "Changing a prompt" | The loop is written down: baseline, change one thing, re-run at `--repeat 3`, compare pass rate *and* consistency, keep the report. |
| Analyse AI outputs for accuracy, quality, consistency | `graders.py`, `content.py` | Seven deterministic graders plus a judge. `must_not_fabricate` catches invented prices, percentages and dates. `validate_post` blocks a bad draft at generation time, not at review time. |
| Support model testing, evaluation, benchmarking, QA | `python -m aiauto eval <suite> --repeat N --json report.json` | Machine-readable report: pass rate, mean score, consistency, per-grader breakdown, cost, p95 latency, and every failure with its reason. |
| Work with structured and unstructured datasets | `evaluation/datasets/*.jsonl`, `data/post_metrics.jsonl` | Unstructured in (customer messages, campaign briefs), structured out (validated Pydantic objects); 112 rows of performance data the agent reasons over. |
| Identify opportunities to automate repetitive processes | root `README.md` + `triage.py` | The forwarder solved "I miss messages". Triage solves the harder half: which messages actually need a person. |
| Integrate AI APIs and third-party platforms | `api/main.py`, `n8n/*.json` | Anthropic Messages API, Facebook Graph API, WhatsApp Cloud API, webhook targets for Slack-style alerts. |
| Monitor solutions and improve performance/reliability | `llm.py`, `api/main.py` | Per-call usage converted to dollars and returned on every response; request logging middleware; a `/healthz` probe that reports model and auth mode. |
| Document processes, workflows, testing results | `docs/` | This file and the runbook. |
| Programming in Python; APIs, JSON, third-party integrations | everywhere | Python 3.11+, Pydantic v2, FastAPI, JSONL datasets, REST throughout. |
| Prompt engineering and AI workflow design | `content.py`, `triage.py`, `agent.py` | Prompts are code here: built by functions, unit-tested for the constraints they must carry (`test_platform_limits_reach_the_prompt`), and measured by an eval suite. |

---

## Role 3 — AI Automation Engineer (LangChain/LangGraph, backend, cloud)

| Requirement | Where | Evidence |
|---|---|---|
| AI agent development, deployment | `src/aiauto/agent.py` | A three-tool agent on the Anthropic SDK's `tool_runner`, with a turn cap, usage accumulation, and refusal handling. |
| Automation scripts using Python + APIs | `src/aiauto/`, `cli.py` | Every workflow is runnable as a script, an HTTP endpoint, or an n8n step. |
| Backend support for AI projects: API integrations, data flows | `api/main.py`, `metrics.py` | A typed FastAPI service; a small store behind an interface so swapping in a real database touches one file and no tools. |
| Proof-of-concept development / rapid prototyping | `--offline` mode | The whole pipeline, evals included, demonstrable with no key — which is what makes a POC cheap to show. |
| Cloud operations, MLOps (Docker) | `Dockerfile`, `docker-compose.yml` | Unprivileged container, `HEALTHCHECK`, dependency layer separate from source, service + n8n composed together. |
| RESTful APIs, JSON, service integrations | `api/main.py` | A uniform `{output, cost_usd, model}` envelope; OpenAPI at `/docs`; bearer auth; 422 vs 429 vs 502 handled distinctly. |
| pydantic, requests-style API work | `models.py`, `api/main.py` | Pydantic v2 models double as JSON Schemas handed to Claude via structured outputs — one definition, validated on both sides. |
| Report development for stakeholders | `agent.py` | The reporting agent writes the weekly client report: headline, numbers with the period-over-period change, what worked, and what to do next week. |
| Convey complex concepts to non-technical stakeholders | `docs/`, `n8n/README.md` | Written for an account manager, not for a reviewer of this code. |
| Continuous improvement | `evaluation/` | Improvement here is measurable or it did not happen. |

---

## What this does **not** cover

Worth saying plainly, because a portfolio that claims everything is worth less
than one that is specific:

- **LangChain / LangGraph.** The agent uses the Anthropic SDK's tool runner
  directly. For a three-tool loop that is the simpler and more debuggable
  choice, but if a role's codebase is LangGraph, this shows the concepts
  (tool surface design, state, turn caps), not the library.
- **AWS (Lambda, S3, Bedrock, SageMaker).** The service is containerised and
  would deploy to ECS, Cloud Run, or a VM unchanged, but nothing here is
  AWS-specific.
- **Power BI and SQL/ETL.** Metrics are aggregated in Python over JSONL. The
  aggregation shapes (`summarise`, `compare_periods`) are the same ones a
  reporting SQL layer would produce, but there is no warehouse and no dashboard.
- **TTS / STT.** Not attempted.
- **Data annotation pipelines.** The eval datasets are hand-written, which is the
  right size here; there is no annotation tooling or inter-annotator agreement.
- **Fine-tuning or classical ML.** Everything is prompting, structured outputs,
  and evaluation against a frontier model.

The `--offline` mode, the guardrails, and the consistency metric are the parts
worth talking about in an interview. They are the parts that come from having
watched an AI automation fail in a way that reached a customer.
