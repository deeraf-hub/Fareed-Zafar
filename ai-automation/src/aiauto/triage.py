"""Inbound message triage — the AI half of the Messenger→WhatsApp forwarder.

The forwarder in this repository pushes every Page message to a phone. That is
useful and completely unfiltered. This module adds the judgement: what is this
message about, how fast does it need an answer, what would a good reply be, and
— the only question that really matters — is it safe to send that reply without
a human reading it first.
"""

from __future__ import annotations

from .llm import LLM
from .models import BrandProfile, Result, Triage, Urgency

AUTO_REPLY_INTENTS = {"order_status", "pricing", "booking"}


def build_system_prompt(brand: BrandProfile) -> str:
    return "\n".join(
        [
            f"You triage customer messages for {brand.name} ({brand.industry}).",
            f"Reply tone: {brand.tone}. Audience: {brand.audience}.",
            "",
            "For each message, produce a structured triage record.",
            "",
            "RULES",
            "- Answer in the customer's own language; report it in `language`.",
            "- `summary` is one sentence a busy owner can read at a glance.",
            "- `suggested_reply` is the message you would actually send, ready "
            "to paste. Never invent order numbers, prices, delivery dates, or "
            "stock. If a fact is missing, ask for it.",
            "- Set `safe_to_auto_reply` to false whenever the message contains a "
            "complaint, a refund or legal demand, a health or safety issue, "
            "abuse, or anything where being wrong would cost the merchant a "
            "customer. When in doubt, false.",
            "- Spam and bot messages are intent `spam`, urgency `low`, and are "
            "never safe to auto-reply.",
        ]
    )


def triage_message(
    llm: LLM, brand: BrandProfile, message: str, sender: str | None = None
) -> Result[Triage]:
    """Classify one inbound message and draft a reply."""
    user = "\n".join(
        [
            f"FROM: {sender or 'unknown customer'}",
            "MESSAGE:",
            message.strip(),
        ]
    )
    # Triage is high-volume and narrowly scoped: medium effort is the right
    # place on the cost curve, unlike the drafting workflows.
    record, usage = llm.structured(
        system=build_system_prompt(brand), user=user, schema=Triage, effort="medium"
    )
    return Result[Triage](output=apply_policy(record), usage=usage)


def apply_policy(record: Triage) -> Triage:
    """Deterministic override on top of the model's own judgement.

    The model decides `safe_to_auto_reply`; this narrows it. Policy that must
    hold every time belongs in code, not in a prompt — a prompt is a strong
    suggestion, an `if` is a guarantee.
    """
    unsafe = (
        record.intent not in AUTO_REPLY_INTENTS
        or record.sentiment == "negative"
        or record.urgency is Urgency.high
    )
    if unsafe and record.safe_to_auto_reply:
        return record.model_copy(update={"safe_to_auto_reply": False})
    return record


def route(record: Triage) -> str:
    """Where this message goes next. Consumed by the n8n switch node."""
    if record.intent == "spam":
        return "drop"
    if record.safe_to_auto_reply:
        return "auto_reply"
    if record.urgency is Urgency.high:
        return "escalate_now"
    return "human_queue"
