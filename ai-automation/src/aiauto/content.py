"""Social content generation: brief in, ready-to-schedule post out.

The interesting part is not the generation — it is the guardrail. Every draft is
checked against the platform's hard limits and the merchant's banned-word list
before it can leave the function, and a failing draft gets exactly one repair
pass with the specific violations quoted back. A second failure raises, because
a silent third attempt is how bad captions reach a client's page.
"""

from __future__ import annotations

import re

from .llm import LLM
from .models import (
    PLATFORM_LIMITS,
    BrandProfile,
    ContentBrief,
    Platform,
    Result,
    SocialPost,
    Usage,
)

PLATFORM_GUIDANCE: dict[Platform, str] = {
    Platform.facebook: (
        "Conversational and community-facing. Lead with the benefit, not the "
        "product name. One clear link-worthy CTA."
    ),
    Platform.instagram: (
        "Visual-first. The caption supports the image; open with a hook in the "
        "first line, because the rest is collapsed behind 'more'."
    ),
    Platform.linkedin: (
        "Professional and specific. Lead with an insight or a result. No emoji "
        "walls, no more than a few hashtags."
    ),
    Platform.tiktok: (
        "Short, spoken-word rhythm, trend-aware. Write it as an on-screen "
        "caption that a voiceover could read in one breath."
    ),
}


def build_system_prompt(brand: BrandProfile) -> str:
    """Stable per-merchant instructions — this is the block that gets cached."""
    lines = [
        "You are the social media copywriter for a single merchant. You write "
        "posts that sound like that merchant, not like an AI assistant.",
        "",
        f"MERCHANT: {brand.name}",
        f"INDUSTRY: {brand.industry}",
        f"TONE: {brand.tone}",
        f"AUDIENCE: {brand.audience}",
    ]
    if brand.banned_words:
        lines += [
            "",
            "NEVER use these words or phrases: " + ", ".join(brand.banned_words) + ".",
        ]
    if brand.sample_posts:
        lines += ["", "Match the voice of these previous posts:"]
        lines += [f"- {p}" for p in brand.sample_posts]
    lines += [
        "",
        "RULES",
        "- Never invent prices, discounts, dates, stock levels, or claims that "
        "were not given to you. If the brief lacks a detail, write around it.",
        "- No medical, financial, or legal guarantees.",
        "- alt_text describes what is literally visible in the image, for a "
        "screen-reader user. It is not a second caption.",
        "- image_prompt is a brief for a designer or an image model: subject, "
        "setting, composition, mood. No text overlays described as words.",
    ]
    return "\n".join(lines)


def build_user_prompt(brief: ContentBrief) -> str:
    limits = PLATFORM_LIMITS[brief.platform]
    parts = [
        f"Write one {brief.platform.value} post in {brief.language}.",
        "",
        f"TOPIC: {brief.topic}",
        f"PLATFORM STYLE: {PLATFORM_GUIDANCE[brief.platform]}",
        f"HARD LIMITS: caption at most {limits['max_chars']} characters; "
        f"at most {limits['max_hashtags']} hashtags.",
    ]
    if brief.call_to_action:
        parts.append(f"REQUIRED CALL TO ACTION: {brief.call_to_action}")
    return "\n".join(parts)


def validate_post(post: SocialPost, brief: ContentBrief) -> list[str]:
    """Return every rule the draft breaks. Empty list means it ships."""
    limits = PLATFORM_LIMITS[brief.platform]
    issues: list[str] = []

    if len(post.caption) > limits["max_chars"]:
        issues.append(
            f"caption is {len(post.caption)} characters, limit is {limits['max_chars']}"
        )
    if len(post.hashtags) > limits["max_hashtags"]:
        issues.append(
            f"{len(post.hashtags)} hashtags, limit is {limits['max_hashtags']}"
        )
    for tag in post.hashtags:
        if not tag.startswith("#") or " " in tag:
            issues.append(f"malformed hashtag {tag!r}: must start with # and contain no spaces")
    if not post.alt_text.strip():
        issues.append("alt_text is empty")
    if not post.image_prompt.strip():
        issues.append("image_prompt is empty")

    haystack = " ".join([post.caption, post.call_to_action, post.alt_text]).lower()
    for word in brief.merchant.banned_words:
        if re.search(rf"\b{re.escape(word.lower())}\b", haystack):
            issues.append(f"uses banned word {word!r}")

    return issues


class ContentQualityError(RuntimeError):
    """A draft failed validation twice; a human should look at the brief."""

    def __init__(self, issues: list[str]) -> None:
        super().__init__("post failed validation after repair: " + "; ".join(issues))
        self.issues = issues


def generate_post(llm: LLM, brief: ContentBrief) -> Result[SocialPost]:
    """Generate, validate, repair once, then either ship or raise."""
    system = build_system_prompt(brief.merchant)
    post, usage = llm.structured(
        system=system, user=build_user_prompt(brief), schema=SocialPost
    )

    issues = validate_post(post, brief)
    if issues:
        repair = "\n".join(
            [
                build_user_prompt(brief),
                "",
                "Your previous draft broke these rules — fix every one of them "
                "and keep everything else:",
                *(f"- {issue}" for issue in issues),
                "",
                "PREVIOUS DRAFT:",
                post.caption,
            ]
        )
        post, repair_usage = llm.structured(
            system=system, user=repair, schema=SocialPost
        )
        usage = usage + repair_usage
        issues = validate_post(post, brief)
        if issues:
            raise ContentQualityError(issues)

    return Result[SocialPost](output=post, usage=usage)


def generate_campaign(
    llm: LLM, merchant: BrandProfile, topic: str, platforms: list[Platform]
) -> Result[dict[str, SocialPost]]:
    """One topic, one post per platform — the daily posting job in one call."""
    posts: dict[str, SocialPost] = {}
    total: Usage | None = None
    for platform in platforms:
        brief = ContentBrief(merchant=merchant, platform=platform, topic=topic)
        result = generate_post(llm, brief)
        posts[platform.value] = result.output
        total = result.usage if total is None else total + result.usage
    return Result[dict[str, SocialPost]](output=posts, usage=total or Usage(model=""))
