"""Score every eligible customer at the latest usable historical cutoff with the active models."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

import numpy as np
import pandas as pd
from sqlalchemy import delete

from gci.db.models import Prediction
from gci.db.session import session_scope
from gci.features.snapshots import load_snapshots
from gci.ingest.importer import copy_frame
from gci.ml.common import prepare_X
from gci.ml.tracking import active_run, load_artifact

log = logging.getLogger(__name__)

PREDICTION_TYPES = {
    "classification": "repeat_purchase_probability",
    "regression": "predicted_spend_30d",
}


def generate_predictions() -> dict:
    summary: dict = {}
    with session_scope() as session:
        snaps = load_snapshots(session, ["scoring"])
        if snaps.empty:
            raise RuntimeError("No scoring snapshot. Run `gci build-features` first.")
        cutoff = snaps["cutoff_date"].iloc[0]
        X = prepare_X(snaps)
        for model_type, prediction_type in PREDICTION_TYPES.items():
            run = active_run(session, model_type)
            if run is None:
                summary[model_type] = {"status": "unavailable", "reason": "no active model"}
                continue
            model = load_artifact(run.artifact_path, "model.joblib")
            if model_type == "classification":
                values = model.predict_proba(X)[:, 1].astype(float)
                probability, spend = values, np.full(len(values), np.nan)
            else:
                values = np.clip(np.asarray(model.predict(X), dtype=float), 0.0, None)
                probability, spend = np.full(len(values), np.nan), values
            order = np.argsort(-values, kind="stable")
            rank = np.empty(len(values), dtype=int)
            rank[order] = np.arange(1, len(values) + 1)
            frame = pd.DataFrame(
                {
                    "model_run_id": run.id,
                    "customer_id": snaps["customer_id"].to_numpy(),
                    "snapshot_id": snaps["id"].to_numpy(),
                    "prediction_type": prediction_type,
                    "cutoff_date": cutoff,
                    "probability": probability,
                    "predicted_spend": spend,
                    "rank": rank,
                    "generated_at": datetime.now(UTC),
                }
            )
            session.execute(delete(Prediction).where(Prediction.model_run_id == run.id))
            copy_frame(session, "predictions", frame)
            run.scoring_cutoff = cutoff
            summary[model_type] = {
                "status": "available",
                "model_version": run.model_version,
                "cutoff_date": str(cutoff),
                "scored_customers": int(len(frame)),
                "mean_value": float(values.mean()),
            }
            log.info("predictions stored", extra={"model_type": model_type, "rows": len(frame)})
    return summary
