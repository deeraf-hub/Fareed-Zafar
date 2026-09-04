"""Command line entry point: ``python -m aiauto <command>``.

Every workflow is reachable from here, and every command accepts ``--offline``
so the whole pipeline can be demonstrated — including the eval report — with no
API key and no network.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .config import Settings
from .content import generate_post
from .llm import ClaudeLLM, LLM, describe_api_error
from .models import BrandProfile, ContentBrief, Platform
from .suites import SUITES, run_suite
from .testing import FakeLLM
from .triage import route, triage_message

DEMO_BRAND = BrandProfile(
    name="Karachi Coffee Roasters",
    industry="specialty coffee retail",
    tone="warm, unfussy, a little playful",
    audience="city professionals aged 25-40 who care where their beans come from",
    banned_words=["cheap", "world's best", "guaranteed"],
)


def build_llm(offline: bool) -> LLM:
    return FakeLLM() if offline else ClaudeLLM(Settings.from_env())


def cmd_post(args: argparse.Namespace) -> int:
    brief = ContentBrief(
        merchant=DEMO_BRAND,
        platform=Platform(args.platform),
        topic=args.topic,
        call_to_action=args.cta,
    )
    result = generate_post(build_llm(args.offline), brief)
    print(json.dumps(result.output.model_dump(), indent=2, ensure_ascii=False))
    print(f"\ncost ${result.usage.cost_usd:.4f}", file=sys.stderr)
    return 0


def cmd_triage(args: argparse.Namespace) -> int:
    result = triage_message(build_llm(args.offline), DEMO_BRAND, args.message)
    payload = result.output.model_dump(mode="json")
    payload["route"] = route(result.output)
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    print(f"\ncost ${result.usage.cost_usd:.4f}", file=sys.stderr)
    return 0


def cmd_report(args: argparse.Namespace) -> int:
    if args.offline:
        print("The reporting agent needs the real API — it runs a tool loop.", file=sys.stderr)
        return 2
    from .agent import run_report_agent

    result = run_report_agent(args.question)
    print(result.output)
    print(f"\ncost ${result.usage.cost_usd:.4f}", file=sys.stderr)
    return 0


def cmd_eval(args: argparse.Namespace) -> int:
    report = run_suite(args.suite, build_llm(args.offline), repeat=args.repeat)
    print(report.render())
    if args.json:
        Path(args.json).write_text(json.dumps(report.to_dict(), indent=2), encoding="utf-8")
        print(f"\nwrote {args.json}", file=sys.stderr)
    # Non-zero exit below the threshold, so this can gate a CI job.
    return 0 if report.pass_rate >= args.threshold else 1


def cmd_serve(args: argparse.Namespace) -> int:
    import uvicorn

    uvicorn.run("aiauto.api.main:app", host=args.host, port=args.port, reload=args.reload)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="aiauto", description=__doc__)
    parser.add_argument("--offline", action="store_true", help="use the scripted model, no API calls")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("post", help="generate one social post")
    p.add_argument("topic")
    p.add_argument("--platform", default="instagram", choices=[x.value for x in Platform])
    p.add_argument("--cta", default=None)
    p.set_defaults(func=cmd_post)

    p = sub.add_parser("triage", help="triage one inbound message")
    p.add_argument("message")
    p.set_defaults(func=cmd_triage)

    p = sub.add_parser("report", help="run the reporting agent")
    p.add_argument("question", nargs="?", default="Write this week's report for Karachi Coffee Roasters.")
    p.set_defaults(func=cmd_report)

    p = sub.add_parser("eval", help="run an eval suite")
    p.add_argument("suite", choices=sorted(SUITES))
    p.add_argument("--repeat", type=int, default=1, help="runs per case, for consistency")
    p.add_argument("--threshold", type=float, default=1.0, help="pass rate required for exit 0")
    p.add_argument("--json", default=None, help="also write the full report here")
    p.set_defaults(func=cmd_eval)

    p = sub.add_parser("serve", help="run the HTTP service")
    p.add_argument("--host", default="0.0.0.0")
    p.add_argument("--port", type=int, default=8000)
    p.add_argument("--reload", action="store_true")
    p.set_defaults(func=cmd_serve)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return args.func(args)
    except Exception as exc:  # one readable line beats a traceback at the terminal
        print(describe_api_error(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
