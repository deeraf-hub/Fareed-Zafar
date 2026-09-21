from __future__ import annotations

from sqlalchemy.orm import Session

from gci.api.services.common import active_runs
from gci.api.services.segments import segment_profiles
from gci.db.models import ModelRun

CLASSIFICATION_HEADLINES = [
    ("average_precision", "Average precision (test)", True),
    ("precision", "Precision at threshold", True),
    ("recall", "Recall at threshold", True),
    ("precision_at_100", "Precision among top 100", True),
    ("lift_at_100", "Lift over base rate (top 100)", True),
    ("brier_score", "Brier score", False),
    ("base_rate", "Base repeat-purchase rate", None),
    ("threshold", "Operating threshold", None),
    ("ranking_size", "Smallest ranking scored", None),
]
REGRESSION_HEADLINES = [
    ("mae", "MAE (test)", False),
    ("rmse", "RMSE (test)", False),
    ("mae_zero_spend", "MAE for zero-spend customers", False),
    ("mae_high_spend", "MAE for customers spending > £1,000", False),
    ("baseline_mae", "Best baseline MAE", False),
    ("baseline_rmse", "Best baseline RMSE", False),
]
SEGMENTATION_HEADLINES = [
    ("silhouette", "Silhouette score", True),
    ("n_clusters", "Number of segments", None),
    ("stability_ari", "Bootstrap stability (ARI)", True),
]


def _headlines(run: ModelRun) -> list[dict]:
    m = run.metrics or {}
    out = []
    if run.model_type == "classification":
        test = m.get("test", {})
        ci = test.get("ci", {})
        for name, label, hib in CLASSIFICATION_HEADLINES:
            value = {"threshold": m.get("threshold"), "base_rate": test.get("base_rate")}.get(
                name, test.get(name)
            )
            lo, hi = (ci.get(name) or [None, None])[:2] if name in ci else (None, None)
            out.append(
                {
                    "name": name,
                    "label": label,
                    "value": value,
                    "ci_low": lo,
                    "ci_high": hi,
                    "higher_is_better": hib,
                }
            )
    elif run.model_type == "regression":
        test = m.get("test", {})
        ci = test.get("ci", {})
        baselines = m.get("baseline_test", {}) or {}
        best_base = min(baselines.values(), key=lambda b: b["mae"]) if baselines else {}
        for name, label, hib in REGRESSION_HEADLINES:
            value = {
                "baseline_mae": best_base.get("mae"),
                "baseline_rmse": best_base.get("rmse"),
            }.get(name, test.get(name))
            lo, hi = (ci.get(name) or [None, None])[:2] if name in ci else (None, None)
            out.append(
                {
                    "name": name,
                    "label": label,
                    "value": value,
                    "ci_low": lo,
                    "ci_high": hi,
                    "higher_is_better": hib,
                }
            )
    else:
        for name, label, hib in SEGMENTATION_HEADLINES:
            out.append(
                {
                    "name": name,
                    "label": label,
                    "value": m.get(name),
                    "ci_low": None,
                    "ci_high": None,
                    "higher_is_better": hib,
                }
            )
    return out


def _numeric(d: dict | None) -> dict | None:
    if d is None:
        return None
    return {k: v for k, v in d.items() if isinstance(v, int | float) or v is None}


def summarise(run: ModelRun | None) -> dict | None:
    if run is None:
        return None
    m = run.metrics or {}
    comparison = [
        {
            "model_name": c["model_name"],
            "algorithm": c["algorithm"],
            "is_baseline": bool(c.get("is_baseline")),
            "is_selected": bool(c.get("is_selected")),
            "validation_metrics": _numeric(c.get("validation_metrics")) or {},
            "test_metrics": _numeric(c.get("test_metrics")),
        }
        for c in (run.comparison or [])
    ]
    return {
        "model_type": run.model_type,
        "model_version": run.model_version,
        "algorithm": run.algorithm,
        "status": run.status,
        "is_active": run.is_active,
        "trained_at": run.trained_at,
        "data_cutoff": run.data_cutoff,
        "scoring_cutoff": run.scoring_cutoff,
        "train_period": (run.train_start, run.train_end) if run.train_start else None,
        "validation_period": (run.validation_start, run.validation_end)
        if run.validation_start
        else None,
        "test_period": (run.test_start, run.test_end) if run.test_start else None,
        "n_train": run.n_train,
        "n_validation": run.n_validation,
        "n_test": run.n_test,
        "params": run.params or {},
        "metrics": {
            k: v
            for k, v in m.items()
            if k
            not in (
                "calibration",
                "thresholds",
                "error_analysis",
                "profiles",
                "comparison",
                "precision_at_k",
            )
        },
        "headline_metrics": _headlines(run),
        "comparison": comparison,
        "feature_names": run.feature_names or [],
        "data_version": run.data_version,
        "code_version": run.code_version,
        "mlflow_run_id": run.mlflow_run_id,
        "limitations": run.limitations or [],
        "calibration": m.get("calibration"),
        "thresholds": m.get("thresholds"),
        "error_analysis": m.get("error_analysis"),
    }


def models_overview(session: Session) -> dict:
    runs = active_runs(session)
    return {
        "classification": summarise(runs["classification"]),
        "regression": summarise(runs["regression"]),
        "segmentation": summarise(runs["segmentation"]),
        "segment_profiles": segment_profiles(runs["segmentation"]),
    }
