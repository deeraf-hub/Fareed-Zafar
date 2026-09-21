"""30-day repeat-purchase classifier.

Compares a prior-rate dummy baseline, logistic regression and histogram gradient boosting on
chronological splits. Hyper-parameters and the operating threshold are chosen on the validation
period; the test period is scored once, after selection. The scoring model is then refitted on all
labelled snapshots with the selected hyper-parameters (recorded in the run's limitations).
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

import mlflow
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
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
from gci.ml.metrics import (
    ap_statistic,
    calibration_table,
    choose_threshold,
    classification_buckets,
    grouped_bootstrap_ci,
    precision_at_k_by_cutoff,
    threshold_table,
)
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

TOP_K = 100
THRESHOLD_GRID = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]


def candidate_models() -> list[dict]:
    return [
        {
            "name": "dummy_prior",
            "algorithm": "DummyClassifier(strategy=prior)",
            "is_baseline": True,
            "pipeline": Pipeline(
                [("pre", make_preprocessor(False)), ("clf", DummyClassifier(strategy="prior"))]
            ),
            "grid": {},
        },
        {
            "name": "logistic_regression",
            "algorithm": "LogisticRegression (standardised features)",
            "is_baseline": False,
            "pipeline": Pipeline(
                [
                    ("pre", make_preprocessor(True)),
                    ("clf", LogisticRegression(max_iter=3000, random_state=RANDOM_STATE)),
                ]
            ),
            "grid": {"clf__C": [0.01, 0.1, 1.0, 10.0]},
        },
        {
            "name": "hist_gradient_boosting",
            "algorithm": "HistGradientBoostingClassifier",
            "is_baseline": False,
            "pipeline": Pipeline(
                [
                    ("pre", make_preprocessor(False)),
                    ("clf", HistGradientBoostingClassifier(random_state=RANDOM_STATE)),
                ]
            ),
            "grid": {
                "clf__learning_rate": [0.05, 0.1],
                "clf__max_leaf_nodes": [15, 31],
                "clf__min_samples_leaf": [50, 200],
            },
        },
    ]


def evaluate(frame: pd.DataFrame, prob: np.ndarray, threshold: float) -> dict:
    y = frame["label_purchased"].astype(int).to_numpy()
    pred = (prob >= threshold).astype(int)
    scored = frame.assign(prob=prob)
    pak = precision_at_k_by_cutoff(scored, "prob", "label_purchased", k=TOP_K)
    return {
        "n": int(len(y)),
        "base_rate": float(y.mean()),
        "average_precision": float(average_precision_score(y, prob)),
        "roc_auc": float(roc_auc_score(y, prob)) if len(np.unique(y)) > 1 else None,
        "precision": float(precision_score(y, pred, zero_division=0)),
        "recall": float(recall_score(y, pred, zero_division=0)),
        "f1": float(f1_score(y, pred, zero_division=0)),
        "brier_score": float(brier_score_loss(y, prob)),
        "precision_at_100": pak["mean_precision_at_k"],
        "lift_at_100": pak["lift_at_k"],
        "ranking_size": pak["min_ranking_size"],
        "flagged_share": float(pred.mean()),
    }


def train_classifier() -> dict:
    version = new_version("classification")
    with session_scope() as session, mlflow_run("classification", version) as run:
        snaps = load_snapshots(session)
        parts = split_frames(snaps)
        train, val, test = parts["train"], parts["validation"], parts["test"]
        if train.empty or val.empty or test.empty:
            raise RuntimeError(
                "Need train, validation and test snapshots. Run `gci build-features`."
            )
        X_train, y_train = prepare_X(train), train["label_purchased"].astype(int)
        X_val, y_val = prepare_X(val), val["label_purchased"].astype(int)
        X_test = prepare_X(test)

        comparison = []
        fitted: dict[str, Pipeline] = {}
        for cand in candidate_models():
            best = None
            for params in ParameterGrid(cand["grid"]) if cand["grid"] else [{}]:
                pipe = clone(cand["pipeline"]).set_params(**params).fit(X_train, y_train)
                prob_val = pipe.predict_proba(X_val)[:, 1]
                ap = float(average_precision_score(y_val, prob_val))
                if best is None or ap > best["ap"]:
                    best = {"ap": ap, "params": params, "pipe": pipe, "prob_val": prob_val}
            fitted[cand["name"]] = best["pipe"]
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
                    "prob_val": best["prob_val"],
                }
            )
            log.info("candidate evaluated", extra={"model": cand["name"], "val_ap": best["ap"]})

        # Selection on validation average precision (dummy included: it may win honestly).
        val_scores = {
            c["model_name"]: average_precision_score(y_val, c["prob_val"]) for c in comparison
        }
        selected_name = max(val_scores, key=val_scores.get)
        selected = fitted[selected_name]
        threshold_info = choose_threshold(
            y_val.to_numpy(), fitted[selected_name].predict_proba(X_val)[:, 1]
        )
        threshold = threshold_info["threshold"]

        # Test period: scored once, after selection.
        for row in comparison:
            pipe = fitted[row["model_name"]]
            row["validation_metrics"] = evaluate(val, row.pop("prob_val"), threshold)
            row["test_metrics"] = evaluate(test, pipe.predict_proba(X_test)[:, 1], threshold)
            row["is_selected"] = row["model_name"] == selected_name

        prob_test = selected.predict_proba(X_test)[:, 1]
        y_test = test["label_purchased"].astype(int).to_numpy()
        test_scored = test.assign(prob=prob_test)
        ci_ap = grouped_bootstrap_ci(test_scored, ap_statistic("prob", "label_purchased"))
        ci_brier = grouped_bootstrap_ci(
            test_scored, lambda df: float(brier_score_loss(df["label_purchased"], df["prob"]))
        )
        test_metrics = next(r["test_metrics"] for r in comparison if r["is_selected"])
        test_metrics["ci"] = {"average_precision": list(ci_ap), "brier_score": list(ci_brier)}
        pak = precision_at_k_by_cutoff(test_scored, "prob", "label_purchased", k=TOP_K)

        # Scoring model: same hyper-parameters, refitted on every labelled snapshot.
        all_labelled = pd.concat([train, val, test], ignore_index=True)
        scoring_model = clone(selected).fit(
            prepare_X(all_labelled), all_labelled["label_purchased"].astype(int)
        )

        params = {
            "features": FEATURE_COLUMNS,
            "selection_metric": "validation_average_precision",
            "selected_model": selected_name,
            "selected_params": next(r["params"] for r in comparison if r["is_selected"]),
            "threshold_rule": "maximise F1 on validation; full trade-off table stored",
            "threshold": threshold,
            "top_k": TOP_K,
            "horizon_days": int(train["horizon_days"].iloc[0]),
            "random_state": RANDOM_STATE,
            "refit_on_all_labelled": True,
        }
        metrics = {
            "selected_model": selected_name,
            "threshold": threshold,
            "threshold_selection": threshold_info,
            "base_rate_train": float(y_train.mean()),
            "base_rate_test": float(y_test.mean()),
            "validation": next(r["validation_metrics"] for r in comparison if r["is_selected"]),
            "test": test_metrics,
            "baseline_test": next(r["test_metrics"] for r in comparison if r["is_baseline"]),
            "precision_at_k": pak,
            "calibration": calibration_table(y_test, prob_test),
            "thresholds": threshold_table(y_test, prob_test, THRESHOLD_GRID),
            "error_analysis": classification_buckets(
                test_scored, "prob", "label_purchased", threshold
            ),
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
            model_type="classification",
            model_version=version,
            algorithm=next(r["algorithm"] for r in comparison if r["is_selected"]),
            mlflow_run_id=run.info.run_id,
            data_cutoff=max(snaps["cutoff_date"]),
            scoring_cutoff=None,
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
                "Reported test metrics come from the model fitted on the training period; the "
                "scoring model uses the same hyper-parameters refitted on all labelled snapshots "
                "so it sees the most recent behaviour.",
                "The test period (autumn 2011) is the pre-Christmas peak; precision and lift "
                "may differ in quieter months.",
                f"Precision@{TOP_K} is averaged over test cutoffs; the smallest ranking scored "
                f"{pak['min_ranking_size']} customers.",
                *COMMON_LIMITATIONS,
            ],
        )
        summary = {
            "model_version": version,
            "selected_model": selected_name,
            "threshold": threshold,
            "validation_ap": round(val_scores[selected_name], 4),
            "test": {
                k: (round(v, 4) if isinstance(v, float) else v)
                for k, v in test_metrics.items()
                if k != "ci"
            },
            "baseline_test_ap": round(metrics["baseline_test"]["average_precision"], 4),
            "trained_at": datetime.now(UTC).isoformat(),
        }
    log.info("classifier trained", extra={"version": version, "selected": selected_name})
    return summary
