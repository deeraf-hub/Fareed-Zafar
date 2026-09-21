from __future__ import annotations

import numpy as np
import pandas as pd
from sqlalchemy import select, text

from gci.db.models import ModelRun, Prediction
from gci.db.session import session_scope
from gci.features.snapshots import load_snapshots
from gci.ml.common import NUMERIC_FEATURES, prepare_X, split_frames
from gci.ml.scoring import generate_predictions
from gci.ml.tracking import load_artifact


def test_end_to_end_training_and_scoring(trained_models):
    clf = trained_models["classification"]
    reg = trained_models["regression"]
    seg = trained_models["segmentation"]
    assert clf["test"]["average_precision"] is not None
    assert 0.0 <= clf["test"]["brier_score"] <= 1.0
    assert seg["k"] >= 3
    assert reg["baselines_test_mae"]["baseline_zero"] > 0
    with session_scope() as s:
        runs = {
            r.model_type: r for r in s.scalars(select(ModelRun).where(ModelRun.is_active.is_(True)))
        }
        assert set(runs) == {"segmentation", "classification", "regression"}
        for run in runs.values():
            assert run.metrics and run.artifact_path and run.data_version
        comparison = runs["classification"].comparison
        assert (
            any(c["is_baseline"] for c in comparison)
            and sum(c["is_selected"] for c in comparison) == 1
        )
        assert {c["model_name"] for c in runs["regression"].comparison} >= {
            "baseline_zero",
            "baseline_recent_run_rate",
        }
        n_scoring = s.execute(
            text("SELECT count(*) FROM customer_snapshots WHERE dataset_split='scoring'")
        ).scalar()
        for t in ("classification", "regression"):
            assert (
                s.execute(
                    text("SELECT count(*) FROM predictions WHERE model_run_id=:r"),
                    {"r": runs[t].id},
                ).scalar()
                == n_scoring
            )
        probs = (
            s.execute(
                select(Prediction.probability).where(
                    Prediction.model_run_id == runs["classification"].id
                )
            )
            .scalars()
            .all()
        )
        assert all(0.0 <= p <= 1.0 for p in probs)
        spends = (
            s.execute(
                select(Prediction.predicted_spend).where(
                    Prediction.model_run_id == runs["regression"].id
                )
            )
            .scalars()
            .all()
        )
        assert all(v >= 0.0 for v in spends)


def test_predictions_are_reproducible(trained_models):
    with session_scope() as s:
        before = pd.read_sql(
            text(
                "SELECT model_run_id, customer_id, probability, predicted_spend, rank "
                "FROM predictions ORDER BY 1, 2"
            ),
            s.connection(),
        )
    generate_predictions()
    with session_scope() as s:
        after = pd.read_sql(
            text(
                "SELECT model_run_id, customer_id, probability, predicted_spend, rank "
                "FROM predictions ORDER BY 1, 2"
            ),
            s.connection(),
        )
    pd.testing.assert_frame_equal(before, after)


def test_preprocessing_is_fitted_on_training_data_only(trained_models):
    with session_scope() as s:
        run = s.scalar(
            select(ModelRun).where(
                ModelRun.model_type == "classification", ModelRun.is_active.is_(True)
            )
        )
        snaps = load_snapshots(s)
    parts = split_frames(snaps)
    evaluated = load_artifact(run.artifact_path, "evaluated_model.joblib")
    imputer = evaluated.named_steps["pre"].named_transformers_["num"].named_steps["impute"]
    train_medians = prepare_X(parts["train"])[NUMERIC_FEATURES].median().to_numpy()
    np.testing.assert_allclose(imputer.statistics_, train_medians)
    all_medians = prepare_X(pd.concat(parts.values()))[NUMERIC_FEATURES].median().to_numpy()
    assert not np.allclose(imputer.statistics_, all_medians)


def test_chronological_split_periods_are_recorded(trained_models):
    with session_scope() as s:
        run = s.scalar(
            select(ModelRun).where(
                ModelRun.model_type == "classification", ModelRun.is_active.is_(True)
            )
        )
    assert (
        run.train_end < run.validation_start <= run.validation_end < run.test_start <= run.test_end
    )
    assert run.n_train > run.n_validation and run.n_test > 0
