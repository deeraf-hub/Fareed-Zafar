"""Evaluation helpers: ranking metrics per cutoff, calibration, grouped bootstrap intervals."""

from __future__ import annotations

from collections.abc import Callable

import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, mean_absolute_error, mean_squared_error


def precision_at_k_by_cutoff(
    frame: pd.DataFrame, score_col: str, label_col: str, k: int = 100
) -> dict:
    """Precision among the top-k ranked customers, computed separately for each cutoff."""
    rows = []
    for cutoff, group in frame.groupby("cutoff_date"):
        ranked = group.sort_values(score_col, ascending=False)
        top = ranked.head(k)
        rows.append(
            {
                "cutoff_date": str(cutoff),
                "ranking_size": int(len(top)),
                "eligible_customers": int(len(group)),
                "precision_at_k": float(top[label_col].mean()) if len(top) else None,
                "base_rate": float(group[label_col].mean()),
            }
        )
    valid = [r for r in rows if r["precision_at_k"] is not None]
    mean_precision = float(np.mean([r["precision_at_k"] for r in valid])) if valid else None
    mean_base = float(np.mean([r["base_rate"] for r in valid])) if valid else None
    return {
        "k": k,
        "mean_precision_at_k": mean_precision,
        "mean_base_rate": mean_base,
        "lift_at_k": (mean_precision / mean_base) if (mean_precision and mean_base) else None,
        "min_ranking_size": min((r["ranking_size"] for r in rows), default=0),
        "per_cutoff": rows,
    }


def calibration_table(y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10) -> list[dict]:
    """Quantile-based calibration bins (equal counts), so sparse high-probability bins show."""
    if len(y_true) == 0:
        return []
    edges = np.unique(np.quantile(y_prob, np.linspace(0, 1, n_bins + 1)))
    if len(edges) < 3:
        edges = np.array([0.0, 0.5, 1.0])
    idx = np.clip(np.searchsorted(edges, y_prob, side="right") - 1, 0, len(edges) - 2)
    rows = []
    for b in range(len(edges) - 1):
        mask = idx == b
        if not mask.any():
            continue
        rows.append(
            {
                "bin_lower": float(edges[b]),
                "bin_upper": float(edges[b + 1]),
                "mean_predicted": float(y_prob[mask].mean()),
                "observed_rate": float(y_true[mask].mean()),
                "count": int(mask.sum()),
            }
        )
    return rows


def threshold_table(y_true: np.ndarray, y_prob: np.ndarray, thresholds: list[float]) -> list[dict]:
    rows = []
    for t in thresholds:
        flagged = y_prob >= t
        n_flagged = int(flagged.sum())
        tp = int((flagged & (y_true == 1)).sum())
        positives = int((y_true == 1).sum())
        rows.append(
            {
                "threshold": float(t),
                "precision": (tp / n_flagged) if n_flagged else 0.0,
                "recall": (tp / positives) if positives else 0.0,
                "flagged_share": n_flagged / len(y_true) if len(y_true) else 0.0,
                "flagged_count": n_flagged,
            }
        )
    return rows


def choose_threshold(y_true: np.ndarray, y_prob: np.ndarray) -> dict:
    """Pick the validation threshold that maximises F1 (equal weight on precision and recall).

    The full trade-off table is stored alongside so a manager can pick a different operating
    point (for example, higher precision with lower coverage).
    """
    candidates = np.round(np.arange(0.05, 0.96, 0.01), 2)
    best = None
    for t in candidates:
        flagged = y_prob >= t
        tp = int((flagged & (y_true == 1)).sum())
        precision = tp / flagged.sum() if flagged.sum() else 0.0
        recall = tp / (y_true == 1).sum() if (y_true == 1).sum() else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
        if best is None or f1 > best["f1"]:
            best = {"threshold": float(t), "precision": precision, "recall": recall, "f1": f1}
    return best or {"threshold": 0.5, "precision": 0.0, "recall": 0.0, "f1": 0.0}


def grouped_bootstrap_ci(
    frame: pd.DataFrame,
    statistic: Callable[[pd.DataFrame], float | None],
    *,
    group_col: str = "customer_id",
    n_boot: int = 200,
    seed: int = 42,
    alpha: float = 0.05,
) -> tuple[float | None, float | None]:
    """Percentile bootstrap that resamples customers (all their snapshots move together)."""
    rng = np.random.default_rng(seed)
    groups = frame[group_col].unique()
    by_group = {g: idx for g, idx in frame.groupby(group_col).indices.items()}
    values = []
    for _ in range(n_boot):
        sampled = rng.choice(groups, size=len(groups), replace=True)
        idx = np.concatenate([by_group[g] for g in sampled])
        stat = statistic(frame.iloc[idx])
        if stat is not None and not np.isnan(stat):
            values.append(stat)
    if not values:
        return None, None
    return float(np.quantile(values, alpha / 2)), float(np.quantile(values, 1 - alpha / 2))


def ap_statistic(score_col: str, label_col: str) -> Callable[[pd.DataFrame], float | None]:
    def _stat(df: pd.DataFrame) -> float | None:
        if df[label_col].nunique() < 2:
            return None
        return float(average_precision_score(df[label_col], df[score_col]))

    return _stat


def mae_statistic(pred_col: str, label_col: str) -> Callable[[pd.DataFrame], float | None]:
    def _stat(df: pd.DataFrame) -> float | None:
        return float(mean_absolute_error(df[label_col], df[pred_col]))

    return _stat


def regression_buckets(y_true: np.ndarray, y_pred: np.ndarray) -> list[dict]:
    positives = y_true[y_true > 0]
    high_cut = float(np.quantile(positives, 0.95)) if len(positives) else 0.0
    buckets = [
        ("Zero spend (actual = £0)", y_true == 0),
        ("Low spend (£0 < actual <= £250)", (y_true > 0) & (y_true <= 250)),
        ("Mid spend (£250 < actual <= £1,000)", (y_true > 250) & (y_true <= 1000)),
        ("High spend (actual > £1,000)", y_true > 1000),
        (
            f"Top 5% of buyers (actual >= £{high_cut:,.0f})",
            y_true >= high_cut if high_cut else np.zeros_like(y_true, bool),
        ),
    ]
    rows = []
    for name, mask in buckets:
        if not mask.any():
            rows.append(
                {
                    "bucket": name,
                    "count": 0,
                    "mae": None,
                    "rmse": None,
                    "mean_actual": None,
                    "mean_predicted": None,
                }
            )
            continue
        rows.append(
            {
                "bucket": name,
                "count": int(mask.sum()),
                "mae": float(mean_absolute_error(y_true[mask], y_pred[mask])),
                "rmse": float(np.sqrt(mean_squared_error(y_true[mask], y_pred[mask]))),
                "mean_actual": float(y_true[mask].mean()),
                "mean_predicted": float(y_pred[mask].mean()),
            }
        )
    return rows


def classification_buckets(
    frame: pd.DataFrame, prob_col: str, label_col: str, threshold: float
) -> list[dict]:
    edges = [(0, 30), (31, 90), (91, 180), (181, 365), (366, 10**6)]
    labels = [
        "Last purchase 0-30 days ago",
        "31-90 days",
        "91-180 days",
        "181-365 days",
        "Over 365 days",
    ]
    rows = []
    for (lo, hi), label in zip(edges, labels, strict=True):
        mask = (frame["recency_days"] >= lo) & (frame["recency_days"] <= hi)
        sub = frame[mask]
        if sub.empty:
            rows.append(
                {
                    "bucket": label,
                    "count": 0,
                    "precision": None,
                    "recall": None,
                    "mean_actual": None,
                    "mean_predicted": None,
                }
            )
            continue
        flagged = sub[prob_col] >= threshold
        tp = int((flagged & (sub[label_col] == 1)).sum())
        rows.append(
            {
                "bucket": label,
                "count": int(len(sub)),
                "precision": (tp / flagged.sum()) if flagged.sum() else None,
                "recall": (tp / (sub[label_col] == 1).sum())
                if (sub[label_col] == 1).sum()
                else None,
                "mean_actual": float(sub[label_col].mean()),
                "mean_predicted": float(sub[prob_col].mean()),
            }
        )
    return rows
