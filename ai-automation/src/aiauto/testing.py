"""Offline doubles.

Two reasons this module exists. Tests must not need an API key or a network,
and the eval harness has to be demonstrable — ``--offline`` runs the whole
pipeline against a scripted model so you can see the report shape, and see the
graders catch a deliberately bad generation, before spending a cent.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, TypeVar

from pydantic import BaseModel

from .models import Usage

TModel = TypeVar("TModel", bound=BaseModel)


@dataclass
class Call:
    system: str
    user: str
    schema: str | None
    effort: str | None


@dataclass
class FakeLLM:
    """An :class:`aiauto.llm.LLM` that answers from a script.

    ``responses`` maps a schema name to a list of instances (consumed in order)
    or to a callable that builds one from the prompt. Anything unscripted falls
    back to :func:`default_for`, so a test only has to specify what it cares
    about.
    """

    responses: dict[str, Any] = field(default_factory=dict)
    text_responses: list[str] = field(default_factory=list)
    usage: Usage = field(
        default_factory=lambda: Usage(
            model="fake", input_tokens=500, output_tokens=200, cost_usd=0.0075
        )
    )
    calls: list[Call] = field(default_factory=list)

    def structured(
        self, *, system: str, user: str, schema: type[TModel], effort: str | None = None
    ) -> tuple[TModel, Usage]:
        self.calls.append(Call(system=system, user=user, schema=schema.__name__, effort=effort))
        scripted = self.responses.get(schema.__name__)
        if callable(scripted):
            return scripted(user), self.usage
        if isinstance(scripted, list) and scripted:
            return scripted.pop(0), self.usage
        if isinstance(scripted, BaseModel):
            return scripted, self.usage
        return default_for(schema, user), self.usage

    def text(self, *, system: str, user: str, effort: str | None = None) -> tuple[str, Usage]:
        self.calls.append(Call(system=system, user=user, schema=None, effort=effort))
        if self.text_responses:
            return self.text_responses.pop(0), self.usage
        return "(scripted response)", self.usage


def default_for(schema: type[TModel], user: str) -> TModel:
    """Build a plausible, schema-valid instance with no model involved."""
    from .models import SocialPost, Triage, Urgency

    if schema is SocialPost:
        return SocialPost(  # type: ignore[return-value]
            caption="Fresh beans landed this morning. Come and smell them before they sell out.",
            hashtags=["#coffee", "#roastery"],
            call_to_action="Visit the shop this weekend",
            image_prompt="Warm morning light across a counter of open bean sacks, shallow depth of field.",
            alt_text="Open sacks of coffee beans on a wooden shop counter in morning light.",
        )
    if schema is Triage:
        lowered = user.lower()
        complaint = any(w in lowered for w in ("refund", "sick", "wrong", "open and half"))
        spam = "backlink" in lowered or "seo" in lowered
        return Triage(  # type: ignore[return-value]
            intent="spam" if spam else ("complaint" if complaint else "order_status"),
            urgency=Urgency.high if complaint else Urgency.normal,
            sentiment="negative" if complaint else "neutral",
            language="English",
            summary="Scripted triage summary for an offline run.",
            suggested_reply="Thanks for getting in touch — let me check that and come right back to you.",
            safe_to_auto_reply=not (complaint or spam),
        )
    # Anything else: fill required fields with type-appropriate placeholders.
    values: dict[str, Any] = {}
    for name, info in schema.model_fields.items():
        if not info.is_required():
            continue
        annotation = info.annotation
        values[name] = {
            int: 4, float: 0.0, bool: True, list: [], dict: {},
        }.get(annotation, f"placeholder {name}")
    return schema(**values)


def scripted(*instances: BaseModel) -> dict[str, Any]:
    """Convenience: ``FakeLLM(responses=scripted(post_a, post_b))``."""
    out: dict[str, list[Any]] = {}
    for instance in instances:
        out.setdefault(type(instance).__name__, []).append(instance)
    return out


def failing_llm(exc: Callable[[], Exception]) -> Any:
    """An LLM double that always raises — for testing the failure paths."""

    class _Failing:
        def structured(self, **_: Any):
            raise exc()

        def text(self, **_: Any):
            raise exc()

    return _Failing()
