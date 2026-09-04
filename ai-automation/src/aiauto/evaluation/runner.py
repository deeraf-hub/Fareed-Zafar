"""The eval harness.

Run a workflow over a dataset, grade every generation, and report pass rate,
cost, and latency. ``repeat`` runs each case more than once and reports
consistency — the metric that catches the model that is right on average and
unreliable in production, which no single-pass eval will ever show you.
"""

from __future__ import annotations

import json
import statistics
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

from ..models import Usage
from .graders import GRADERS, Grade

# A workflow under test: takes a case's input payload, returns (output_dict, usage).
Workflow = Callable[[dict[str, Any]], tuple[dict[str, Any], Usage]]


@dataclass(frozen=True)
class EvalCase:
    id: str
    payload: dict[str, Any]
    graders: list[str]
    meta: dict[str, Any] = field(default_factory=dict)

    @property
    def grading_context(self) -> dict[str, Any]:
        """What the graders read: the case payload plus its expectations."""
        return {**self.payload, **self.meta}


@dataclass
class CaseRun:
    case_id: str
    attempt: int
    output: dict[str, Any]
    grades: list[Grade]
    latency_s: float
    usage: Usage
    error: str | None = None

    @property
    def passed(self) -> bool:
        return self.error is None and all(g.passed for g in self.grades)

    @property
    def score(self) -> float:
        if self.error is not None or not self.grades:
            return 0.0
        return round(statistics.mean(g.score for g in self.grades), 4)


@dataclass
class EvalReport:
    name: str
    runs: list[CaseRun]

    @property
    def pass_rate(self) -> float:
        return round(sum(r.passed for r in self.runs) / len(self.runs), 4) if self.runs else 0.0

    @property
    def mean_score(self) -> float:
        return round(statistics.mean(r.score for r in self.runs), 4) if self.runs else 0.0

    @property
    def total_cost_usd(self) -> float:
        return round(sum(r.usage.cost_usd for r in self.runs), 6)

    @property
    def p95_latency_s(self) -> float:
        if not self.runs:
            return 0.0
        ordered = sorted(r.latency_s for r in self.runs)
        return round(ordered[min(int(len(ordered) * 0.95), len(ordered) - 1)], 3)

    def consistency(self) -> float:
        """Share of cases whose repeated runs all agreed on pass/fail.

        1.0 means every case is deterministic in outcome. Anything lower is the
        number to quote when someone asks whether the automation is reliable.
        """
        by_case: dict[str, list[bool]] = {}
        for run in self.runs:
            by_case.setdefault(run.case_id, []).append(run.passed)
        repeated = [v for v in by_case.values() if len(v) > 1]
        if not repeated:
            return 1.0
        agreed = sum(1 for v in repeated if all(v) or not any(v))
        return round(agreed / len(repeated), 4)

    def failures(self) -> list[CaseRun]:
        return [r for r in self.runs if not r.passed]

    def grader_breakdown(self) -> dict[str, float]:
        """Pass rate per grader — tells you *which* rule the prompt is losing."""
        totals: dict[str, list[bool]] = {}
        for run in self.runs:
            for grade in run.grades:
                totals.setdefault(grade.name, []).append(grade.passed)
        return {k: round(sum(v) / len(v), 4) for k, v in sorted(totals.items())}

    def to_dict(self) -> dict[str, Any]:
        return {
            "eval": self.name,
            "cases": len({r.case_id for r in self.runs}),
            "runs": len(self.runs),
            "pass_rate": self.pass_rate,
            "mean_score": self.mean_score,
            "consistency": self.consistency(),
            "total_cost_usd": self.total_cost_usd,
            "p95_latency_s": self.p95_latency_s,
            "by_grader": self.grader_breakdown(),
            "failures": [
                {
                    "case_id": r.case_id,
                    "attempt": r.attempt,
                    "error": r.error,
                    "failed_graders": [
                        {"name": g.name, "detail": g.detail}
                        for g in r.grades
                        if not g.passed
                    ],
                }
                for r in self.failures()
            ],
        }

    def render(self) -> str:
        d = self.to_dict()
        lines = [
            f"eval: {d['eval']}",
            f"  cases {d['cases']}  runs {d['runs']}",
            f"  pass rate    {d['pass_rate']:.0%}",
            f"  mean score   {d['mean_score']:.2f}",
            f"  consistency  {d['consistency']:.0%}",
            f"  cost         ${d['total_cost_usd']:.4f}",
            f"  p95 latency  {d['p95_latency_s']}s",
            "  by grader:",
        ]
        lines += [f"    {name:20s} {rate:.0%}" for name, rate in d["by_grader"].items()]
        if d["failures"]:
            lines.append("  failures:")
            for f in d["failures"]:
                reason = f["error"] or ", ".join(
                    f"{g['name']}: {g['detail']}" for g in f["failed_graders"]
                )
                lines.append(f"    {f['case_id']} (attempt {f['attempt']}) — {reason}")
        return "\n".join(lines)


def load_cases(path: Path | str) -> list[EvalCase]:
    """Read a JSONL dataset. One case per line."""
    cases: list[EvalCase] = []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("//"):
            continue
        raw = json.loads(line)
        cases.append(
            EvalCase(
                id=raw["id"],
                payload=raw["payload"],
                graders=raw.get("graders", []),
                meta=raw.get("meta", {}),
            )
        )
    return cases


def run_eval(
    name: str,
    cases: list[EvalCase],
    workflow: Workflow,
    repeat: int = 1,
    extra_graders: dict[str, Callable[[dict, dict], Grade]] | None = None,
) -> EvalReport:
    """Run every case ``repeat`` times and grade the results.

    A workflow that raises is recorded as a failed run, not an aborted eval — a
    crash on case 3 of 40 is itself a result worth seeing next to the rest.
    """
    registry = {**GRADERS, **(extra_graders or {})}
    runs: list[CaseRun] = []

    for case in cases:
        for attempt in range(1, repeat + 1):
            started = time.perf_counter()
            try:
                output, usage = workflow(case.payload)
                error = None
            except Exception as exc:  # a failure mode is data, not an outage
                output, usage, error = {}, Usage(model=""), f"{type(exc).__name__}: {exc}"
            latency = time.perf_counter() - started

            grades: list[Grade] = []
            if error is None:
                context = case.grading_context
                for grader_name in case.graders:
                    grader = registry.get(grader_name)
                    if grader is None:
                        raise KeyError(f"unknown grader {grader_name!r} in case {case.id}")
                    grades.append(grader(context, output))

            runs.append(
                CaseRun(
                    case_id=case.id,
                    attempt=attempt,
                    output=output,
                    grades=grades,
                    latency_s=latency,
                    usage=usage,
                    error=error,
                )
            )

    return EvalReport(name=name, runs=runs)
