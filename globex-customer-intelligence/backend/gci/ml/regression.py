"""Predicted 30-day purchase spending (zero for customers who do not purchase).

Baselines: always-zero and a recent run-rate (spending in the last 90 days divided by three).
Candidates: histogram gradient boosting on the raw target, on a log1p-transformed target, and
with an absolute-error loss. Selection uses validation MAE; RMSE and per-bucket errors are
reported so the trade-off (MAE favours predicting near zero) is visible.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

import mlflow
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, RegressorMixin, clone
from sklearn.compose import TransformedTargetRegressor
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import ParameterGrid
from sklearn.pipeline import Pipeline

from gci.db.session import session_scope
from gci.features.snapshots import FEATURE_COLUMNS, load_snapshots
from gci.ml.common import (
    COMMON_LIMITATIONS,
    RANDOM_STATE,
    make_preprocessor,
    period,
    prepare_X,
    split_frames,
)
from gci.ml.metrics import grouped_bootstrap_ci, mae_statistic, regression_buckets
from gci.ml.tracking import (
    code_version,
    data_version,
    log_dict_metrics,
    mlflow_run,
    model_dir,
    new_version,
    register_model_run,
    save_artifact,
)

log = logging.getLogger(__name__)


class RecentRunRateBaseline(BaseEstimator, RegressorMixin):
    """Predicts spending in the last 90 days divided by three (a 30-day run rate)."""

    def fit(self, X, y=None):  # noqa: D102
        self.is_fitted_ = True
        return self

    def predict(self, X):  # noqa: D102
        return np.asarray(X["spend_90"], dtype=float) / 3.0


def candidate_models() -> list[dict]:
    hgb = HistGradientBoostingRegressor(random_state=RANDOM_STATE)
    grid = {
        "clf__learning_rate": [0.05, 0.1],
        "clf__max_leaf_nodes": [15, 31],
        "clf__min_samples_leaf": [50, 200],
    }
    return [
        {
            "name": "baseline_zero",
            "algorithm": "DummyRegressor(constant=0)",
            "is_baseline": True,
            "pipeline": Pipeline(
                [
                    ("pre", make_preprocessor(False)),
                    ("clf", DummyRegressor(strategy="constant", constant=0.0)),
                ]
            ),
            "grid": {},
        },
        {
            "name": "baseline_recent_run_rate",
            "algorithm": "Historical run rate (last 90 days / 3)",
            "is_baseline": True,
            "pipeline": RecentRunRateBaseline(),
            "grid": {},
        },
        {
            "name": "hgb_squared_error",
            "algorithm": "HistGradientBoostingRegressor(loss=squared_error)",
            "is_baseline": False,
            "pipeline": Pipeline([("pre", make_preprocessor(False)), ("clf", clone(hgb))]),
            "grid": grid,
        },
        {
            "name": "hgb_log_target",
            "algorithm": "HistGradientBoostingRegressor on log1p(target)",
            "is_baseline": False,
            "pipeline": TransformedTargetRegressor(
                regressor=Pipeline([("pre", make_preprocessor(False)), ("clf", clone(hgb))]),
                func=np.log1p,
                inverse_func=np.expm1,
            ),
            "grid": {f"regressor__{k}": v for k, v in grid.items()},
        },
        {
            "name": "hgb_absolute_error",
            "algorithm": "HistGradientBoostingRegressor(loss=absolute_error)",
            "is_baseline": False,
            "pipeline": Pipeline(
                [
                    ("pre", make_preprocessor(False)),
                    (
                        "clf",
                        HistGradientBoostingRegressor(
                            loss="absolute_error", random_state=RANDOM_STATE
                        ),
                    ),
                ]
            ),
            "grid": grid,
        },
    ]


def evaluate(y: np.ndarray, pred: np.ndarray) -> dict:
    return {
        "n": int(len(y)),
        "mae": float(mean_absolute_error(y, pred)),
        "rmse": float(np.sqrt(mean_squared_error(y, pred))),
        "mean_actual": float(y.mean()),
        "mean_predicted": float(pred.mean()),
        "mae_zero_spend": float(mean_absolute_error(y[y == 0], pred[y == 0]))
        if (y == 0).any()
        else None,
        "mae_high_spend": float(mean_absolute_error(y[y > 1000], pred[y > 1000]))
        if (y > 1000).any()
        else None,
        "share_zero_actual": float((y == 0).mean()),
    }


def _predict(model, X: pd.DataFrame) -> np.ndarray:
    return np.clip(np.asarray(model.predict(X), dtype=float), 0.0, None)


def train_regressor() -> dict:
    version = new_version("regression")
    with session_scope() as session, mlflow_run("regression", version) as run:
        snaps = load_snapshots(session)
        parts = split_frames(snaps)
        train, val, test = parts["train"], parts["validation"], parts["test"]
        if train.empty or val.empty or test.empty:
            raise RuntimeError(
                "Need train, validation and test snapshots. Run `gci build-features`."
            )
        X_train, y_train = prepare_X(train), train["label_spend"].astype(float).to_numpy()
        X_val, y_val = prepare_X(val), val["label_spend"].astype(float).to_numpy()
        X_test, y_test = prepare_X(test), test["label_spend"].astype(float).to_numpy()

        comparison, fitted = [], {}
        for cand in candidate_models():
            best = None
            for params in ParameterGrid(cand["grid"]) if cand["grid"] else [{}]:
                model = clone(cand["pipeline"]).set_params(**params).fit(X_train, y_train)
                pred_val = _predict(model, X_val)
                mae = float(mean_absolute_error(y_val, pred_val))
                if best is None or mae < best["mae"]:
                    best = {"mae": mae, "params": params, "model": model, "pred_val": pred_val}
            fitted[cand["name"]] = best["model"]
            comparison.append(
                {
                    "model_name": cand["name"],
                    "algorithm": cand["algorithm"],
                    "is_baseline": cand["is_baseline"],
                    "is_selected": False,
                    "params": {
                        k: (float(v) if isinstance(v, float) else v)
                        for k, v in best["params"].items()
                    },
                    "validation_metrics": evaluate(y_val, best["pred_val"]),
                    "test_metrics": evaluate(y_test, _predict(best["model"], X_test)),
                }
            )
            log.info("candidate evaluated", extra={"model": cand["name"], "val_mae": best["mae"]})

        selected_name = min(comparison, key=lambda r: r["validation_metrics"]["mae"])["model_name"]
        for row in comparison:
            row["is_selected"] = row["model_name"] == selected_name
        selected = fitted[selected_name]
        pred_test = _predict(selected, X_test)
        test_metrics = next(r["test_metrics"] for r in comparison if r["is_selected"])
        scored = test.assign(pred=pred_test)
        test_metrics["ci"] = {
            "mae": list(grouped_bootstrap_ci(scored, mae_statistic("pred", "label_spend")))
        }

        all_labelled = pd.concat([train, val, test], ignore_index=True)
        scoring_model = clone(selected).fit(
            prepare_X(all_labelled), all_labelled["label_spend"].astype(float)
        )

        bias_note = []
        if (
            test_metrics["mean_actual"]
            and test_metrics["mean_predicted"] < 0.75 * test_metrics["mean_actual"]
        ):
            bias_note.append(
                "In the test period the model's average prediction "
                f"(£{test_metrics['mean_predicted']:,.0f}) is well below the average actual "
                f"spend (£{test_metrics['mean_actual']:,.0f}): it ranks "
                "customers usefully but under-estimates totals, so predicted values should not be "
                "summed into a revenue forecast."
            )
        params = {
            "features": FEATURE_COLUMNS,
            "target": "eligible positive spending in the 30 days after the cutoff (0 if none)",
            "selection_metric": "validation_mae",
            "selected_model": selected_name,
            "selected_params": next(r["params"] for r in comparison if r["is_selected"]),
            "predictions_clipped_at_zero": True,
            "random_state": RANDOM_STATE,
            "refit_on_all_labelled": True,
        }
        metrics = {
            "selected_model": selected_name,
            "validation": next(r["validation_metrics"] for r in comparison if r["is_selected"]),
            "test": test_metrics,
            "baseline_test": {
                r["model_name"]: r["test_metrics"] for r in comparison if r["is_baseline"]
            },
            "error_analysis": regression_buckets(y_test, pred_test),
        }
        mlflow.log_params({k: str(v)[:250] for k, v in params.items()})
        log_dict_metrics("val", metrics["validation"])
        log_dict_metrics("test", {k: v for k, v in test_metrics.items() if k != "ci"})
        artifact_dir = model_dir(version)
        save_artifact(version, "model.joblib", scoring_model)
        save_artifact(version, "evaluated_model.joblib", selected)
        save_artifact(version, "metrics.json", metrics)
        save_artifact(version, "comparison.json", comparison)
        mlflow.log_artifacts(str(artifact_dir))
        mlflow.set_tag("data_version", data_version(session) or "unknown")

        register_model_run(
            session,
            model_type="regression",
            model_version=version,
            algorithm=next(r["algorithm"] for r in comparison if r["is_selected"]),
            mlflow_run_id=run.info.run_id,
            data_cutoff=max(snaps["cutoff_date"]),
            train_start=period(train)[0],
            train_end=period(train)[1],
            validation_start=period(val)[0],
            validation_end=period(val)[1],
            test_start=period(test)[0],
            test_end=period(test)[1],
            n_train=int(len(train)),
            n_validation=int(len(val)),
            n_test=int(len(test)),
            params=params,
            metrics=metrics,
            comparison=comparison,
            feature_names=FEATURE_COLUMNS,
            artifact_path=str(artifact_dir),
            data_version=data_version(session),
            code_version=code_version(),
            limitations=[
                "'Predicted 30-day purchase spending' is an expected value under historical "
                "patterns; it is not guaranteed revenue and not a lifetime value.",
                "Most customers spend nothing in a given 30-day window, so MAE rewards "
                "predictions near zero; check the per-bucket errors for high-spend customers.",
                "Reported test metrics come from the model fitted on the training period; the "
                "scoring model was refitted on all labelled snapshots with the same "
                "hyper-parameters.",
                *bias_note,
                *COMMON_LIMITATIONS,
            ],
        )
        summary = {
            "model_version": version,
            "selected_model": selected_name,
            "validation_mae": round(metrics["validation"]["mae"], 2),
            "test": {
                k: (round(v, 2) if isinstance(v, float) else v)
                for k, v in test_metrics.items()
                if k != "ci"
            },
            "baselines_test_mae": {
                k: round(v["mae"], 2) for k, v in metrics["baseline_test"].items()
            },
            "trained_at": datetime.now(UTC).isoformat(),
        }
    log.info("regressor trained", extra={"version": version, "selected": selected_name})
    return summary
