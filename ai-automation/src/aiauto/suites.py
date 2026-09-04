"""Wiring between the eval datasets and the workflows they exercise.

Kept separate from the harness so the harness stays generic: it knows about
cases, graders, and reports, and nothing about coffee shops.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

from .content import generate_post
from .evaluation.runner import EvalCase, EvalReport, load_cases, run_eval
from .llm import LLM
from .models import BrandProfile, ContentBrief, Usage
from .triage import triage_message

DATASETS = Path(__file__).parent / "evaluation" / "datasets"


def social_workflow(llm: LLM) -> Callable[[dict[str, Any]], tuple[dict[str, Any], Usage]]:
    def run(payload: dict[str, Any]) -> tuple[dict[str, Any], Usage]:
        brief = ContentBrief(**payload)
        result = generate_post(llm, brief)
        return result.output.model_dump(), result.usage

    return run


def triage_workflow(llm: LLM) -> Callable[[dict[str, Any]], tuple[dict[str, Any], Usage]]:
    def run(payload: dict[str, Any]) -> tuple[dict[str, Any], Usage]:
        brand = BrandProfile(**payload["merchant"])
        result = triage_message(llm, brand, payload["message"], payload.get("sender"))
        return result.output.model_dump(mode="json"), result.usage

    return run


SUITES: dict[str, tuple[str, Callable[[LLM], Any]]] = {
    "social": ("social_posts.jsonl", social_workflow),
    "triage": ("triage.jsonl", triage_workflow),
}


def load_suite(name: str) -> list[EvalCase]:
    filename, _ = SUITES[name]
    return load_cases(DATASETS / filename)


def run_suite(name: str, llm: LLM, repeat: int = 1) -> EvalReport:
    if name not in SUITES:
        raise KeyError(f"unknown suite {name!r}; available: {sorted(SUITES)}")
    _, factory = SUITES[name]
    return run_eval(name, load_suite(name), factory(llm), repeat=repeat)
