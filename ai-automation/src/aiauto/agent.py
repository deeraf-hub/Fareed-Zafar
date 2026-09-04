"""A tool-using agent that writes the weekly client report.

This is the one place in the project where an agent is the right tier: the
question ("how did we do, and what should we change") is open-ended, the model
decides which numbers it needs, and being wrong is cheap because a human reads
the report before the client does.

The loop itself is the SDK's — ``client.beta.messages.tool_runner`` calls the
decorated functions and feeds results back until Claude is done. What is worth
owning is the tool surface: three tools that return small, already-aggregated
JSON, rather than one tool that dumps a table and burns the context window.
"""

from __future__ import annotations

import json
from pathlib import Path

import anthropic
from anthropic import beta_tool

from .config import Settings, cost_usd
from .metrics import MetricsStore
from .models import Result, Usage

# The tool runner calls plain module-level functions, so the store lives here
# and is swapped by `use_store()` in tests and by the API at startup.
_STORE = MetricsStore()


def use_store(path: Path | str) -> None:
    """Point the agent's tools at a different metrics file."""
    global _STORE
    _STORE = MetricsStore(path)


@beta_tool
def list_merchants() -> str:
    """List every merchant that has post metrics available."""
    return json.dumps(_STORE.merchants())


@beta_tool
def get_performance(merchant: str, days: int = 7) -> str:
    """Get aggregated social performance for one merchant.

    Args:
        merchant: The merchant name, exactly as returned by list_merchants.
        days: How many days back from the most recent post to include.
    """
    rows = _STORE.window(merchant, days)
    if not rows:
        return json.dumps({"error": f"no posts found for {merchant!r} in the last {days} days"})
    return json.dumps({"merchant": merchant, "days": days, **_STORE.summarise(rows)})


@beta_tool
def compare_periods(merchant: str, days: int = 7) -> str:
    """Compare the most recent N days against the N days before them.

    Args:
        merchant: The merchant name, exactly as returned by list_merchants.
        days: Length of each period in days.
    """
    rows = _STORE.window(merchant, days * 2)
    if not rows:
        return json.dumps({"error": f"no posts found for {merchant!r}"})
    cutoff = max(r.posted_on for r in rows)
    split = cutoff.toordinal() - days + 1
    current = [r for r in rows if r.posted_on.toordinal() >= split]
    previous = [r for r in rows if r.posted_on.toordinal() < split]
    return json.dumps(
        {
            "merchant": merchant,
            "current_period": _STORE.summarise(current),
            "previous_period": _STORE.summarise(previous),
        }
    )


AGENT_TOOLS = [list_merchants, get_performance, compare_periods]

SYSTEM_PROMPT = """You write the weekly social media report that a merchant's \
account manager sends to the client.

Use the tools to get the numbers. Never state a figure you did not read from a \
tool result, and never estimate one that a tool could have given you.

Structure every report as:
1. Headline — one sentence on how the week went.
2. The numbers — posts, impressions, engagements, engagement rate, and the \
change against the previous period, with the direction stated plainly.
3. What worked — the best performing post and a concrete reason it may have won.
4. Next week — two or three specific, actionable recommendations tied to the \
numbers above.

Write for a busy non-technical reader. No jargon, no hedging, no bullet point \
that could apply to any merchant in any week."""


def run_report_agent(
    question: str,
    settings: Settings | None = None,
    client: anthropic.Anthropic | None = None,
    max_turns: int = 12,
) -> Result[str]:
    """Answer a reporting question, letting Claude pull the data it needs."""
    settings = settings or Settings.from_env()
    client = client or anthropic.Anthropic(timeout=settings.request_timeout_s)

    runner = client.beta.messages.tool_runner(
        model=settings.model,
        max_tokens=settings.max_tokens,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        tools=AGENT_TOOLS,
        messages=[{"role": "user", "content": question}],
    )

    total = Usage(model=settings.model)
    final = None
    for turn, message in enumerate(runner, start=1):
        final = message
        u = message.usage
        total = total + Usage(
            model=settings.model,
            input_tokens=getattr(u, "input_tokens", 0) or 0,
            output_tokens=getattr(u, "output_tokens", 0) or 0,
            cache_read_input_tokens=getattr(u, "cache_read_input_tokens", 0) or 0,
            cost_usd=cost_usd(
                settings.model,
                getattr(u, "input_tokens", 0) or 0,
                getattr(u, "output_tokens", 0) or 0,
            ),
        )
        if turn >= max_turns:
            # A runaway loop is a bug, not a result worth paying for.
            break

    if final is None:
        raise RuntimeError("the agent produced no messages")
    if getattr(final, "stop_reason", None) == "refusal":
        raise RuntimeError("Claude declined the reporting request")

    text = "".join(b.text for b in final.content if b.type == "text")
    return Result[str](output=text, usage=total)
