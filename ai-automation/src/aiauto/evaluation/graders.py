"""Graders: the checks that decide whether one generation passed.

Deterministic graders first. They are free, instant, and catch the failures that
actually recur — a caption over the limit, a banned word, the wrong intent
label. An LLM judge is used only for the part no rule can express (does this
read like the brand?), and its score is reported separately so a soft judgement
can never quietly overrule a hard rule.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Callable

from ..llm import LLM


@dataclass(frozen=True)
class Grade:
    name: str
    passed: bool
    score: float  # 0.0–1.0
    detail: str = ""


Grader = Callable[[dict[str, Any], dict[str, Any]], Grade]


def _text_of(output: dict[str, Any]) -> str:
    """All human-readable text in an output, lowercased."""
    parts = [v for v in output.values() if isinstance(v, str)]
    for v in output.values():
        if isinstance(v, list):
            parts += [item for item in v if isinstance(item, str)]
    return " ".join(parts).lower()


def field_equals(case: dict[str, Any], output: dict[str, Any]) -> Grade:
    """Every key under ``expect`` must match the output exactly."""
    expected = case.get("expect", {})
    mismatches = [
        f"{key}={output.get(key)!r} (expected {value!r})"
        for key, value in expected.items()
        if output.get(key) != value
    ]
    matched = len(expected) - len(mismatches)
    return Grade(
        name="field_equals",
        passed=not mismatches,
        score=matched / len(expected) if expected else 1.0,
        detail="; ".join(mismatches),
    )


def no_banned_words(case: dict[str, Any], output: dict[str, Any]) -> Grade:
    banned = case.get("banned_words", [])
    text = _text_of(output)
    hits = [w for w in banned if re.search(rf"\b{re.escape(w.lower())}\b", text)]
    return Grade(
        name="no_banned_words",
        passed=not hits,
        score=0.0 if hits else 1.0,
        detail=f"found {hits}" if hits else "",
    )


def max_length(case: dict[str, Any], output: dict[str, Any]) -> Grade:
    limit = case.get("max_chars")
    if limit is None:
        return Grade("max_length", True, 1.0, "no limit set")
    caption = str(output.get("caption", ""))
    ok = len(caption) <= limit
    return Grade(
        name="max_length",
        passed=ok,
        score=1.0 if ok else 0.0,
        detail="" if ok else f"{len(caption)} chars > {limit}",
    )


def max_hashtags(case: dict[str, Any], output: dict[str, Any]) -> Grade:
    limit = case.get("max_hashtags")
    if limit is None:
        return Grade("max_hashtags", True, 1.0, "no limit set")
    tags = output.get("hashtags") or []
    ok = len(tags) <= limit
    return Grade(
        name="max_hashtags",
        passed=ok,
        score=1.0 if ok else 0.0,
        detail="" if ok else f"{len(tags)} hashtags > {limit}",
    )


def required_fields(case: dict[str, Any], output: dict[str, Any]) -> Grade:
    """Named fields must be present and non-empty."""
    required = case.get("required_fields", [])
    missing = [f for f in required if not str(output.get(f, "")).strip()]
    return Grade(
        name="required_fields",
        passed=not missing,
        score=(len(required) - len(missing)) / len(required) if required else 1.0,
        detail=f"empty: {missing}" if missing else "",
    )


def must_mention(case: dict[str, Any], output: dict[str, Any]) -> Grade:
    """Every phrase under ``must_mention`` has to appear somewhere in the output."""
    phrases = case.get("must_mention", [])
    text = _text_of(output)
    missing = [p for p in phrases if p.lower() not in text]
    return Grade(
        name="must_mention",
        passed=not missing,
        score=(len(phrases) - len(missing)) / len(phrases) if phrases else 1.0,
        detail=f"missing: {missing}" if missing else "",
    )


def must_not_fabricate(case: dict[str, Any], output: dict[str, Any]) -> Grade:
    """Catch the failure that costs a merchant money: an invented number.

    Any price, percentage, or date in the output must also appear in the brief.
    Crude, deliberately so — it has no false negatives on the failure that
    matters, and its false positives are quick for a reviewer to dismiss.
    """
    source = str(case.get("input", "")) + " " + str(case.get("context", ""))
    pattern = r"(?:\d+(?:[.,]\d+)?\s?%|(?:rs\.?|\$|pkr|usd)\s?\d[\d,.]*|\b\d{1,2}/\d{1,2}\b)"
    invented = [
        token
        for token in re.findall(pattern, _text_of(output), flags=re.I)
        if token.lower().strip() not in source.lower()
    ]
    return Grade(
        name="must_not_fabricate",
        passed=not invented,
        score=0.0 if invented else 1.0,
        detail=f"figures not in the brief: {invented}" if invented else "",
    )


GRADERS: dict[str, Grader] = {
    "field_equals": field_equals,
    "no_banned_words": no_banned_words,
    "max_length": max_length,
    "max_hashtags": max_hashtags,
    "required_fields": required_fields,
    "must_mention": must_mention,
    "must_not_fabricate": must_not_fabricate,
}


JUDGE_SYSTEM = """You grade social media copy against a rubric. You are strict \
and you explain yourself in one sentence.

Score 1-5:
5 — publishable as-is; on brand, specific, and it earns the reader's attention.
4 — publishable after a small edit.
3 — generic. Nothing wrong, nothing that could only be this merchant.
2 — off brand, or vague enough to be about anything.
1 — unusable: wrong audience, wrong tone, or it invents facts.

Score the copy only. Ignore formatting and hashtag counts — those are checked \
elsewhere."""


def llm_judge(llm: LLM, case: dict[str, Any], output: dict[str, Any]) -> Grade:
    """Rubric-score one generation. Passes at 4 or above."""
    from pydantic import BaseModel, Field

    class Verdict(BaseModel):
        score: int = Field(ge=1, le=5)
        reason: str

    user = "\n".join(
        [
            f"BRIEF: {case.get('input', '')}",
            f"BRAND: {case.get('brand', 'unspecified')}",
            "",
            "COPY:",
            str(output.get("caption") or output.get("suggested_reply") or ""),
        ]
    )
    verdict, _ = llm.structured(
        system=JUDGE_SYSTEM, user=user, schema=Verdict, effort="low"
    )
    return Grade(
        name="llm_judge",
        passed=verdict.score >= 4,
        score=(verdict.score - 1) / 4,
        detail=f"{verdict.score}/5 — {verdict.reason}",
    )
