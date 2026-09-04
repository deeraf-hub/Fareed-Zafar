"""The one place this project talks to Claude.

Everything downstream depends on the :class:`LLM` protocol rather than the SDK,
which is what makes the workflows testable offline: the unit tests inject
:class:`aiauto.testing.FakeLLM` and never open a socket.
"""

from __future__ import annotations

from typing import Any, Protocol, TypeVar

import anthropic
from pydantic import BaseModel

from .config import Settings, cost_usd
from .models import Usage

TModel = TypeVar("TModel", bound=BaseModel)


class RefusalError(RuntimeError):
    """Claude declined the request (``stop_reason == "refusal"``)."""


class LLM(Protocol):
    """The narrow surface the workflows are written against."""

    def structured(
        self,
        *,
        system: str,
        user: str,
        schema: type[TModel],
        effort: str | None = ...,
    ) -> tuple[TModel, Usage]: ...

    def text(
        self, *, system: str, user: str, effort: str | None = ...
    ) -> tuple[str, Usage]: ...


class ClaudeLLM:
    """Claude-backed :class:`LLM`.

    Two things happen on every call and are easy to lose if you hand-roll this:

    * the system prompt is sent as a cached block, so the merchant brand sheet
      and the house rules are billed once per five minutes instead of per post;
    * usage is converted to dollars and returned, so the eval harness can report
      cost per case instead of a token count nobody reads.
    """

    def __init__(
        self,
        settings: Settings | None = None,
        client: anthropic.Anthropic | None = None,
    ) -> None:
        self.settings = settings or Settings.from_env()
        # A bare client resolves ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, or an
        # `ant auth login` profile — do not hardcode a key.
        self.client = client or anthropic.Anthropic(
            timeout=self.settings.request_timeout_s
        )

    # -- internals ---------------------------------------------------------

    def _system_blocks(self, system: str) -> list[dict[str, Any]]:
        # Stable prefix first, cached; the volatile per-request detail rides in
        # the user turn so it never invalidates this block.
        return [
            {
                "type": "text",
                "text": system,
                "cache_control": {"type": "ephemeral"},
            }
        ]

    def _usage(self, response: Any) -> Usage:
        u = response.usage
        input_tokens = getattr(u, "input_tokens", 0) or 0
        output_tokens = getattr(u, "output_tokens", 0) or 0
        cache_read = getattr(u, "cache_read_input_tokens", 0) or 0
        cache_write = getattr(u, "cache_creation_input_tokens", 0) or 0
        return Usage(
            model=self.settings.model,
            input_tokens=input_tokens + cache_write,
            output_tokens=output_tokens,
            cache_read_input_tokens=cache_read,
            cost_usd=cost_usd(self.settings.model, input_tokens + cache_write, output_tokens),
        )

    @staticmethod
    def _guard(response: Any) -> None:
        # Always check stop_reason before reading content: a refusal is an
        # HTTP 200 with no usable answer in it.
        if getattr(response, "stop_reason", None) == "refusal":
            details = getattr(response, "stop_details", None)
            category = getattr(details, "category", None)
            raise RefusalError(f"Claude declined this request (category={category!r})")

    # -- public API --------------------------------------------------------

    def structured(
        self,
        *,
        system: str,
        user: str,
        schema: type[TModel],
        effort: str | None = None,
    ) -> tuple[TModel, Usage]:
        """Return a validated ``schema`` instance.

        Uses structured outputs, so the response is schema-valid by
        construction — no ``json.loads`` in a ``try`` block, no repair prompt.
        """
        response = self.client.messages.parse(
            model=self.settings.model,
            max_tokens=self.settings.max_tokens,
            system=self._system_blocks(system),
            messages=[{"role": "user", "content": user}],
            thinking={"type": "adaptive"},
            output_config={"effort": effort or self.settings.default_effort},
            output_format=schema,
        )
        self._guard(response)
        return response.parsed_output, self._usage(response)

    def text(
        self, *, system: str, user: str, effort: str | None = None
    ) -> tuple[str, Usage]:
        response = self.client.messages.create(
            model=self.settings.model,
            max_tokens=self.settings.max_tokens,
            system=self._system_blocks(system),
            messages=[{"role": "user", "content": user}],
            thinking={"type": "adaptive"},
            output_config={"effort": effort or self.settings.default_effort},
        )
        self._guard(response)
        answer = "".join(b.text for b in response.content if b.type == "text")
        return answer, self._usage(response)


def describe_api_error(exc: Exception) -> str:
    """Human-readable, retryability-aware message for an SDK exception.

    Most specific first — a single ``except APIError`` would flatten the
    retryable/non-retryable distinction that callers actually need.
    """
    if isinstance(exc, anthropic.NotFoundError):
        return "Model or resource not found — check the model id. Not retryable."
    if isinstance(exc, anthropic.AuthenticationError):
        return "Authentication failed — check ANTHROPIC_API_KEY. Not retryable."
    if isinstance(exc, anthropic.BadRequestError):
        return f"Bad request — {exc.message}. Not retryable."
    if isinstance(exc, anthropic.RateLimitError):
        return "Rate limited — back off and retry."
    if isinstance(exc, anthropic.APIStatusError):
        return f"API error {exc.status_code} — retryable if 5xx."
    if isinstance(exc, anthropic.APIConnectionError):
        return "Connection failed — retryable."
    return f"Unexpected error: {exc!r}"
