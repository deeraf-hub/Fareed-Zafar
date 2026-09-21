"""MLflow tracking and model-run registration shared by the three model types."""

from __future__ import annotations

import json
import logging
import subprocess
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path

import joblib
import mlflow
from sqlalchemy import select, text, update
from sqlalchemy.orm import Session

from gci.config import get_settings
from gci.db.models import ModelRun

log = logging.getLogger(__name__)


def code_version() -> str | None:
    try:
        return (
            subprocess.run(
                ["git", "rev-parse", "--short=12", "HEAD"],
                capture_output=True,
                text=True,
                check=True,
                timeout=5,
            ).stdout.strip()
            or None
        )
    except Exception:  # not a git checkout (e.g. inside the container)
        return None


def data_version(session: Session) -> str | None:
    return session.execute(
        text(
            "SELECT file_sha256 FROM import_runs WHERE status = 'succeeded' "
            "ORDER BY finished_at DESC LIMIT 1"
        )
    ).scalar()


def new_version(model_type: str) -> str:
    stamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    return f"{model_type}-{stamp}"


def model_dir(model_version: str) -> Path:
    path = Path(get_settings().model_store_dir).resolve() / model_version
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_artifact(model_version: str, name: str, obj: object) -> Path:
    path = model_dir(model_version) / name
    if name.endswith(".joblib"):
        joblib.dump(obj, path)
    else:
        path.write_text(json.dumps(obj, indent=2, default=str), encoding="utf-8")
    return path


def load_artifact(artifact_path: str, name: str) -> object:
    path = Path(artifact_path) / name
    if name.endswith(".joblib"):
        return joblib.load(path)
    return json.loads(path.read_text(encoding="utf-8"))


@contextmanager
def mlflow_run(model_type: str, model_version: str) -> Iterator[mlflow.ActiveRun]:
    settings = get_settings()
    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    mlflow.set_experiment(settings.mlflow_experiment_name)
    with mlflow.start_run(run_name=model_version) as run:
        mlflow.set_tags({"model_type": model_type, "model_version": model_version})
        yield run


def log_dict_metrics(prefix: str, metrics: dict) -> None:
    flat = {}
    for key, value in metrics.items():
        if isinstance(value, int | float) and value is not None:
            flat[f"{prefix}_{key}"] = float(value)
    if flat:
        mlflow.log_metrics(flat)


def register_model_run(session: Session, **fields) -> ModelRun:
    """Insert a model run and make it the single active run of its type."""
    model_type = fields["model_type"]
    session.execute(
        update(ModelRun)
        .where(ModelRun.model_type == model_type, ModelRun.is_active.is_(True))
        .values(is_active=False, status="superseded")
    )
    run = ModelRun(is_active=True, status="active", trained_at=datetime.now(UTC), **fields)
    session.add(run)
    session.flush()
    return run


def active_run(session: Session, model_type: str) -> ModelRun | None:
    return session.scalar(
        select(ModelRun).where(ModelRun.model_type == model_type, ModelRun.is_active.is_(True))
    )
