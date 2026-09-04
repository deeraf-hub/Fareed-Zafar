"""FastAPI service in front of the workflows.

This exists so n8n (or Make, or Zapier, or a cron job) never has to hold an
Anthropic key or know how a prompt is built. It calls one JSON endpoint, gets a
schema-valid object back, and stays a workflow tool instead of becoming an
application.
"""

from __future__ import annotations

import logging
import time
from typing import Annotated, Any

import anthropic
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, Field

from ..config import Settings
from ..content import ContentQualityError, generate_campaign, generate_post
from ..llm import ClaudeLLM, LLM, RefusalError, describe_api_error
from ..models import BrandProfile, ContentBrief, Platform, SocialPost, Triage
from ..triage import route, triage_message

log = logging.getLogger("aiauto.api")

settings = Settings.from_env()
app = FastAPI(
    title="aiauto",
    version="1.0.0",
    summary="AI automation endpoints for merchant social content and inbox triage.",
)


def get_llm() -> LLM:
    return ClaudeLLM(settings)


def require_token(authorization: Annotated[str | None, Header()] = None) -> None:
    """Bearer-token gate. Unset ``AIAUTO_API_TOKEN`` leaves the service open.

    Open is fine on a private network and wrong on a public one; the readiness
    probe reports which mode is live so nobody has to guess.
    """
    if settings.api_token is None:
        return
    if authorization != f"Bearer {settings.api_token}":
        raise HTTPException(status_code=401, detail="invalid or missing bearer token")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    log.info(
        "%s %s -> %s in %.0fms",
        request.method,
        request.url.path,
        response.status_code,
        (time.perf_counter() - started) * 1000,
    )
    return response


@app.exception_handler(ContentQualityError)
async def _quality_handler(_: Request, exc: ContentQualityError):
    # 422, not 500: the generation was produced and then rejected by our own
    # rules, which is a content problem the caller can act on.
    from fastapi.responses import JSONResponse

    return JSONResponse(status_code=422, content={"detail": str(exc), "issues": exc.issues})


@app.exception_handler(RefusalError)
async def _refusal_handler(_: Request, exc: RefusalError):
    from fastapi.responses import JSONResponse

    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.exception_handler(anthropic.APIError)
async def _api_error_handler(_: Request, exc: anthropic.APIError):
    from fastapi.responses import JSONResponse

    status = 429 if isinstance(exc, anthropic.RateLimitError) else 502
    return JSONResponse(status_code=status, content={"detail": describe_api_error(exc)})


# -- request models --------------------------------------------------------


class PostRequest(BaseModel):
    merchant: BrandProfile
    platform: Platform
    topic: str
    call_to_action: str | None = None
    language: str = "English"


class CampaignRequest(BaseModel):
    merchant: BrandProfile
    topic: str
    platforms: list[Platform] = Field(min_length=1)


class TriageRequest(BaseModel):
    merchant: BrandProfile
    message: str = Field(min_length=1)
    sender: str | None = None


class ReportRequest(BaseModel):
    question: str = Field(min_length=1)


class Envelope(BaseModel):
    """Uniform response shape — n8n maps one structure for every endpoint."""

    output: Any
    cost_usd: float
    model: str


# -- endpoints -------------------------------------------------------------


@app.get("/healthz", tags=["ops"])
def healthz() -> dict[str, Any]:
    return {
        "status": "ok",
        "model": settings.model,
        "auth": "bearer" if settings.api_token else "open",
    }


@app.post("/content/post", response_model=Envelope, tags=["content"])
def create_post(
    body: PostRequest,
    llm: Annotated[LLM, Depends(get_llm)],
    _: Annotated[None, Depends(require_token)],
) -> Envelope:
    """One platform-native post, validated against the platform's hard limits."""
    brief = ContentBrief(**body.model_dump())
    result = generate_post(llm, brief)
    return Envelope(
        output=result.output.model_dump(), cost_usd=result.usage.cost_usd, model=result.usage.model
    )


@app.post("/content/campaign", response_model=Envelope, tags=["content"])
def create_campaign(
    body: CampaignRequest,
    llm: Annotated[LLM, Depends(get_llm)],
    _: Annotated[None, Depends(require_token)],
) -> Envelope:
    """One topic, one post per platform — the daily posting job."""
    result = generate_campaign(llm, body.merchant, body.topic, body.platforms)
    return Envelope(
        output={k: v.model_dump() for k, v in result.output.items()},
        cost_usd=result.usage.cost_usd,
        model=result.usage.model,
    )


@app.post("/inbox/triage", response_model=Envelope, tags=["inbox"])
def triage(
    body: TriageRequest,
    llm: Annotated[LLM, Depends(get_llm)],
    _: Annotated[None, Depends(require_token)],
) -> Envelope:
    """Classify one inbound message, draft a reply, and say where it should go."""
    result = triage_message(llm, body.merchant, body.message, body.sender)
    payload = result.output.model_dump(mode="json")
    payload["route"] = route(result.output)
    return Envelope(output=payload, cost_usd=result.usage.cost_usd, model=result.usage.model)


@app.post("/reports/agent", response_model=Envelope, tags=["reports"])
def report(
    body: ReportRequest,
    _: Annotated[None, Depends(require_token)],
) -> Envelope:
    """Run the tool-using reporting agent. Slower than the other endpoints."""
    from ..agent import run_report_agent

    result = run_report_agent(body.question, settings=settings)
    return Envelope(output=result.output, cost_usd=result.usage.cost_usd, model=result.usage.model)


__all__ = ["app", "SocialPost", "Triage"]
