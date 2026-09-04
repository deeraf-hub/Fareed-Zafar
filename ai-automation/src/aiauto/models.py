"""Pydantic schemas — the contract between Claude, the API, and n8n.

Every model here doubles as a JSON Schema handed to Claude via structured
outputs, so a malformed generation is impossible rather than merely unlikely.
"""

from __future__ import annotations

from enum import Enum
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class Platform(str, Enum):
    facebook = "facebook"
    instagram = "instagram"
    linkedin = "linkedin"
    tiktok = "tiktok"


# Hard limits we enforce locally; the prompt states them too, but the grader is
# what actually decides whether a generation ships.
PLATFORM_LIMITS: dict[Platform, dict[str, int]] = {
    Platform.facebook: {"max_chars": 600, "max_hashtags": 5},
    Platform.instagram: {"max_chars": 900, "max_hashtags": 15},
    Platform.linkedin: {"max_chars": 1300, "max_hashtags": 5},
    Platform.tiktok: {"max_chars": 220, "max_hashtags": 8},
}


class BrandProfile(BaseModel):
    """Everything the model needs to sound like one specific merchant."""

    name: str
    industry: str
    tone: str = Field(default="friendly, professional")
    audience: str = Field(default="general consumers")
    # Words the brand must never use — legal, trademark, or house-style bans.
    banned_words: list[str] = Field(default_factory=list)
    # Optional style anchor: two or three previous posts that worked.
    sample_posts: list[str] = Field(default_factory=list)


class ContentBrief(BaseModel):
    merchant: BrandProfile
    platform: Platform
    topic: str
    call_to_action: str | None = None
    language: str = "English"


class SocialPost(BaseModel):
    """One ready-to-schedule post."""

    caption: str
    hashtags: list[str] = Field(default_factory=list)
    call_to_action: str
    # Handed to an image/video generator (Canva, Firefly, a diffusion model).
    image_prompt: str
    # Accessibility text — required on every asset we publish.
    alt_text: str


class Urgency(str, Enum):
    low = "low"
    normal = "normal"
    high = "high"


class Triage(BaseModel):
    """Structured read of one inbound customer message."""

    intent: Literal[
        "order_status", "pricing", "complaint", "booking", "spam", "other"
    ]
    urgency: Urgency
    sentiment: Literal["positive", "neutral", "negative"]
    language: str
    summary: str
    suggested_reply: str
    # False whenever a human must look at it before anything is sent.
    safe_to_auto_reply: bool


class Usage(BaseModel):
    """Token accounting for one call, carried alongside every result."""

    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_input_tokens: int = 0
    cost_usd: float = 0.0

    def __add__(self, other: "Usage") -> "Usage":
        return Usage(
            model=self.model,
            input_tokens=self.input_tokens + other.input_tokens,
            output_tokens=self.output_tokens + other.output_tokens,
            cache_read_input_tokens=self.cache_read_input_tokens
            + other.cache_read_input_tokens,
            cost_usd=round(self.cost_usd + other.cost_usd, 6),
        )


class Result(BaseModel, Generic[T]):
    """A workflow result plus what it cost to produce."""

    output: T
    usage: Usage
