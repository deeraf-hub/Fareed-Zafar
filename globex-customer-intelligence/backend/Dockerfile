# Backend image: FastAPI API and the `gci` pipeline CLI share one image.
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-dev.txt ./
RUN pip install -r requirements.txt

COPY pyproject.toml alembic.ini ./
COPY alembic ./alembic
COPY gci ./gci
RUN pip install --no-deps -e .

# Durable stores are volumes (see docker-compose.yml): models, MLflow runs, raw data.
RUN mkdir -p /data/models /data/mlruns /data/raw
ENV MODEL_STORE_DIR=/data/models \
    MLFLOW_TRACKING_URI=/data/mlruns

RUN useradd --create-home --uid 1000 gci && chown -R gci:gci /app /data
USER gci

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:8000/api/v1/health || exit 1

CMD ["uvicorn", "gci.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
