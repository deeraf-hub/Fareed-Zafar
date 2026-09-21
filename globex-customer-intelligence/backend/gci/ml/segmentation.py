"""RFM customer segmentation with K-means.

Recency, frequency and monetary value are taken from the *scoring* snapshot (features strictly
before the latest usable cutoff). Skewed inputs are log-transformed and standardised; a small
range of ``k`` is compared on silhouette, bootstrap stability (adjusted Rand index) and cluster
balance. Segment names are derived from the fitted cluster medians, never chosen in advance.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

import mlflow
import numpy as np
import pandas as pd
from scipy.stats import skew
from sklearn.cluster import KMeans
from sklearn.metrics import adjusted_rand_score, silhouette_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, StandardScaler

from gci.config import get_settings
from gci.db.session import session_scope
from gci.features.snapshots import load_snapshots
from gci.ingest.importer import copy_frame
from gci.ml.common import COMMON_LIMITATIONS, RANDOM_STATE, safe_float
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

RFM_COLUMNS = ["recency_days", "orders_lookback", "spend_lookback"]
K_RANGE = (3, 4, 5, 6, 7)
SILHOUETTE_TOLERANCE = 0.05
MIN_CLUSTER_SHARE = 0.02
MIN_STABILITY = 0.60


def make_pipeline(k: int, seed: int = RANDOM_STATE) -> Pipeline:
    return Pipeline(
        [
            ("log1p", FunctionTransformer(np.log1p, validate=True)),
            ("scale", StandardScaler()),
            ("kmeans", KMeans(n_clusters=k, n_init=10, random_state=seed)),
        ]
    )


def evaluate_k_range(X: pd.DataFrame, k_values=K_RANGE, n_boot: int = 5) -> list[dict]:
    rows = []
    rng = np.random.default_rng(RANDOM_STATE)
    for k in k_values:
        pipe = make_pipeline(k).fit(X)
        labels = pipe.named_steps["kmeans"].labels_
        transformed = pipe[:-1].transform(X)
        sil = silhouette_score(
            transformed, labels, sample_size=min(10_000, len(X)), random_state=RANDOM_STATE
        )
        aris = []
        for b in range(n_boot):
            idx = rng.choice(len(X), size=int(0.8 * len(X)), replace=False)
            refit = make_pipeline(k, seed=RANDOM_STATE + b + 1).fit(X.iloc[idx])
            aris.append(adjusted_rand_score(labels[idx], refit.named_steps["kmeans"].labels_))
        shares = np.bincount(labels, minlength=k) / len(X)
        rows.append(
            {
                "k": int(k),
                "silhouette": float(sil),
                "stability_ari": float(np.mean(aris)),
                "min_cluster_share": float(shares.min()),
                "inertia": float(pipe.named_steps["kmeans"].inertia_),
            }
        )
    return rows


def select_k(rows: list[dict]) -> tuple[int, str]:
    """Largest k whose silhouette is within tolerance of the best and that is stable and balanced.

    Silhouette alone tends to prefer very few clusters; when several k are statistically similar
    the more granular one is more useful for marketing, provided every cluster is stable (ARI)
    and large enough to act on.
    """
    best_sil = max(r["silhouette"] for r in rows)
    eligible = [
        r
        for r in rows
        if r["silhouette"] >= best_sil - SILHOUETTE_TOLERANCE
        and r["min_cluster_share"] >= MIN_CLUSTER_SHARE
        and r["stability_ari"] >= MIN_STABILITY
    ]
    if eligible:
        chosen = max(eligible, key=lambda r: r["k"])
        rule = (
            f"largest k with silhouette within {SILHOUETTE_TOLERANCE} of the best "
            f"({best_sil:.3f}), min cluster share >= {MIN_CLUSTER_SHARE:.0%} and "
            f"bootstrap ARI >= {MIN_STABILITY}"
        )
    else:
        chosen = max(rows, key=lambda r: r["silhouette"])
        rule = "no k met the stability/balance constraints; fell back to best silhouette"
    return chosen["k"], rule


def name_clusters(rfm: pd.DataFrame, labels: np.ndarray, lookback_days: int) -> list[dict]:
    """Readable names from the actual cluster medians.

    Recency tiers use fixed day thresholds; value tiers are quantiles of lookback spending across
    all segmented customers, so the words mean the same thing whatever k is chosen. Names are
    only assigned after the clusters are inspected, and collisions are resolved with a frequency
    qualifier.
    """
    frame = rfm.assign(cluster=labels)
    total_monetary = float(frame["spend_lookback"].sum())
    p40, p70, p90 = np.quantile(frame["spend_lookback"], [0.4, 0.7, 0.9])
    profiles = []
    for cluster_id, group in frame.groupby("cluster"):
        r = float(group["recency_days"].median())
        f = float(group["orders_lookback"].median())
        m = float(group["spend_lookback"].median())
        if r <= 14:
            recency_word = "Recent"
        elif r <= 60:
            recency_word = "Active"
        elif r <= 180:
            recency_word = "Cooling"
        elif r <= 365:
            recency_word = "Lapsing"
        else:
            recency_word = "Inactive"
        if m <= 0:
            value_word = f"(no purchase in {lookback_days} days)"
        elif m >= p90:
            value_word = "top-value"
        elif m >= p70:
            value_word = "high-value"
        elif m >= p40:
            value_word = "mid-value"
        else:
            value_word = "low-value"
        if f >= 8:
            frequency_word = "frequent"
        elif f >= 3:
            frequency_word = "regular"
        else:
            frequency_word = "occasional"
        profiles.append(
            {
                "cluster_id": int(cluster_id),
                "recency_word": recency_word,
                "value_word": value_word,
                "frequency_word": frequency_word,
                "customers": int(len(group)),
                "share": float(len(group) / len(frame)),
                "avg_recency_days": float(group["recency_days"].mean()),
                "median_recency_days": r,
                "avg_frequency": float(group["orders_lookback"].mean()),
                "median_frequency": f,
                "avg_monetary": float(group["spend_lookback"].mean()),
                "median_monetary": m,
                "total_monetary": float(group["spend_lookback"].sum()),
                "revenue_share": float(group["spend_lookback"].sum() / total_monetary)
                if total_monetary
                else 0.0,
            }
        )
    base = {p["cluster_id"]: f"{p['recency_word']} {p['value_word']}" for p in profiles}
    counts = pd.Series(list(base.values())).value_counts()
    names: dict[int, str] = {}
    for p in profiles:
        name = base[p["cluster_id"]]
        if counts[name] > 1:
            name = f"{p['recency_word']} {p['frequency_word']} {p['value_word']}"
        names[p["cluster_id"]] = name
    seen: dict[str, int] = {}
    for p in profiles:
        name = names[p["cluster_id"]]
        if name in seen:
            seen[name] += 1
            name = f"{name} ({chr(64 + seen[name])})"
        else:
            seen[name] = 1
        p["segment_name"] = name
        p["description"] = (
            f"Median recency {p['median_recency_days']:.0f} days, "
            f"{p['median_frequency']:.0f} orders and £{p['median_monetary']:,.0f} spent in the "
            f"last {lookback_days} days ({p['customers']:,} customers, {p['share']:.0%}). "
            f"Holds {p['revenue_share']:.0%} of lookback spending."
        )
    return sorted(profiles, key=lambda p: (-p["median_monetary"], p["median_recency_days"]))


def train_segmentation() -> dict:
    settings = get_settings()
    version = new_version("segmentation")
    with session_scope() as session, mlflow_run("segmentation", version) as run:
        snaps = load_snapshots(session, ["scoring"])
        if snaps.empty:
            raise RuntimeError("No scoring snapshot. Run `gci build-features` first.")
        cutoff = snaps["cutoff_date"].iloc[0]
        X = snaps[RFM_COLUMNS].astype(float)
        skew_before = {c: float(skew(X[c])) for c in RFM_COLUMNS}
        skew_after = {c: float(skew(np.log1p(X[c]))) for c in RFM_COLUMNS}
        outliers = {c: int((X[c] > X[c].quantile(0.99)).sum()) for c in RFM_COLUMNS}
        comparison = evaluate_k_range(X)
        k, rule = select_k(comparison)
        pipe = make_pipeline(k).fit(X)
        labels = pipe.named_steps["kmeans"].labels_
        chosen = next(r for r in comparison if r["k"] == k)
        profiles = name_clusters(X, labels, settings.lookback_days)
        name_of = {p["cluster_id"]: p["segment_name"] for p in profiles}

        params = {
            "features": RFM_COLUMNS,
            "transform": "log1p + StandardScaler",
            "algorithm": "KMeans(n_init=10)",
            "k_candidates": list(K_RANGE),
            "selection_rule": rule,
            "selected_k": k,
            "random_state": RANDOM_STATE,
            "lookback_days": settings.lookback_days,
        }
        metrics = {
            "silhouette": chosen["silhouette"],
            "stability_ari": chosen["stability_ari"],
            "min_cluster_share": chosen["min_cluster_share"],
            "n_clusters": k,
            "n_customers": int(len(X)),
            "skewness_before_log": skew_before,
            "skewness_after_log": skew_after,
            "outliers_above_p99": outliers,
            "comparison": comparison,
            "profiles": profiles,
        }
        mlflow.log_params({k_: str(v)[:250] for k_, v in params.items()})
        log_dict_metrics(
            "segmentation", {k_: v for k_, v in metrics.items() if not isinstance(v, dict | list)}
        )
        artifact_dir = model_dir(version)
        save_artifact(version, "model.joblib", pipe)
        save_artifact(version, "profiles.json", profiles)
        save_artifact(version, "comparison.json", comparison)
        mlflow.log_artifacts(str(artifact_dir))

        model_run = register_model_run(
            session,
            model_type="segmentation",
            model_version=version,
            algorithm=f"KMeans(k={k}) on log1p-scaled RFM",
            mlflow_run_id=run.info.run_id,
            data_cutoff=cutoff,
            scoring_cutoff=cutoff,
            n_train=int(len(X)),
            params=params,
            metrics=metrics,
            comparison=[
                {
                    "model_name": f"kmeans_k{r['k']}",
                    "algorithm": "KMeans",
                    "is_baseline": False,
                    "is_selected": r["k"] == k,
                    "validation_metrics": {
                        "silhouette": r["silhouette"],
                        "stability_ari": r["stability_ari"],
                        "min_cluster_share": r["min_cluster_share"],
                    },
                    "test_metrics": None,
                }
                for r in comparison
            ],
            feature_names=RFM_COLUMNS,
            artifact_path=str(artifact_dir),
            data_version=data_version(session),
            code_version=code_version(),
            limitations=[
                "Segments describe behaviour in the 365 days before the cutoff; they are "
                "descriptive groupings, not predictions.",
                "K-means assumes roughly spherical clusters after log-scaling; segment "
                "boundaries are soft and customers near a boundary could reasonably sit in "
                "either segment.",
                *COMMON_LIMITATIONS[1:3],
            ],
        )
        segments = pd.DataFrame(
            {
                "model_run_id": model_run.id,
                "customer_id": snaps["customer_id"].to_numpy(),
                "cutoff_date": cutoff,
                "cluster_id": labels.astype(int),
                "segment_name": [name_of[int(c)] for c in labels],
                "recency_days": snaps["recency_days"].astype(int).to_numpy(),
                "frequency": snaps["orders_lookback"].astype(int).to_numpy(),
                "monetary": snaps["spend_lookback"].astype(float).to_numpy(),
            }
        )
        copy_frame(session, "customer_segments", segments)
        summary = {
            "model_version": version,
            "k": k,
            "silhouette": round(chosen["silhouette"], 4),
            "stability_ari": round(chosen["stability_ari"], 4),
            "segments": [
                {"segment": p["segment_name"], "customers": p["customers"]} for p in profiles
            ],
            "trained_at": datetime.now(UTC).isoformat(),
        }
    log.info("segmentation trained", extra={"version": version, "k": k})
    return {k_: safe_float(v) if isinstance(v, float) else v for k_, v in summary.items()}
