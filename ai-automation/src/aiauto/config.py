"""Runtime configuration, read once from the environment."""

from __future__ import annotations

import os
from dataclasses import dataclass

# Claude Opus 5 is the default for every call in this project. Effort, not model
# downgrade, is the cost lever (see docs/WORKFLOW-DOCUMENTATION.md).
DEFAULT_MODEL = "claude-opus-5"

# USD per 1M tokens, used only for local cost reporting.
PRICING = {
    "claude-opus-5": {"input": 5.00, "output": 25.00},
    "claude-sonnet-5": {"input": 2.00, "output": 10.00},
    "claude-haiku-4-5": {"input": 1.00, "output": 5.00},
}


@dataclass(frozen=True)
class Settings:
    model: str = DEFAULT_MODEL
    max_tokens: int = 8000
    # "low" for high-volume classification, "high" for drafting and reporting.
    default_effort: str = "high"
    request_timeout_s: float = 120.0
    # Shared secret n8n (or any caller) must present to the FastAPI service.
    api_token: str | None = None

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            model=os.getenv("AIAUTO_MODEL", DEFAULT_MODEL),
            max_tokens=int(os.getenv("AIAUTO_MAX_TOKENS", "8000")),
            default_effort=os.getenv("AIAUTO_EFFORT", "high"),
            request_timeout_s=float(os.getenv("AIAUTO_TIMEOUT_S", "120")),
            api_token=os.getenv("AIAUTO_API_TOKEN") or None,
        )


def cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    """Estimated USD for one call. Unknown models are reported as 0.0."""
    price = PRICING.get(model)
    if price is None:
        return 0.0
    return round(
        input_tokens / 1_000_000 * price["input"]
        + output_tokens / 1_000_000 * price["output"],
        6,
    )
