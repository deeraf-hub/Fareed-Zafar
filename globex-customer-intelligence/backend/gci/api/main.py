"""FastAPI application. Read-only: ingestion and training run through the CLI."""

from __future__ import annotations

import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from gci import __version__
from gci.api.errors import install_error_handlers
from gci.api.routers import (
    customers,
    data_quality,
    health,
    models,
    overview,
    predictions,
    segments,
)
from gci.config import get_settings
from gci.logging import configure_logging

settings = get_settings()
configure_logging(settings.log_level)
log = logging.getLogger("gci.api")

app = FastAPI(
    title="Globex Customer Intelligence API",
    version=__version__,
    description=(
        "Read-only analytics API over the UCI Online Retail II dataset (historical demo, "
        "2009-2011). Money is GBP. Predictions are made at the latest usable historical cutoff."
    ),
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["GET"],
    allow_headers=["*"],
)
install_error_handlers(app)


@app.middleware("http")
async def request_logging(request: Request, call_next):
    request_id = request.headers.get("x-request-id", uuid.uuid4().hex[:12])
    started = time.perf_counter()
    response = await call_next(request)
    response.headers["x-request-id"] = request_id
    log.info(
        "request",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round((time.perf_counter() - started) * 1000, 1),
        },
    )
    return response


API_PREFIX = "/api/v1"
for router in (health, overview, customers, segments, predictions, models, data_quality):
    app.include_router(router.router, prefix=API_PREFIX)
