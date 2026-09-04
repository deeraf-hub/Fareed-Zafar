"""The agent can only be as right as the numbers its tools hand back."""

import json
from datetime import date

from aiauto.metrics import MetricsStore


def write_rows(tmp_path, rows):
    path = tmp_path / "metrics.jsonl"
    path.write_text("\n".join(json.dumps(r) for r in rows), encoding="utf-8")
    return path


def row(day, merchant="Acme", platform="instagram", impressions=1000, engagements=50):
    return {
        "merchant": merchant,
        "platform": platform,
        "posted_on": day,
        "impressions": impressions,
        "engagements": engagements,
        "clicks": 10,
        "caption": f"post on {day}",
    }


def test_window_is_inclusive_of_both_ends(tmp_path):
    store = MetricsStore(write_rows(tmp_path, [row("2026-08-01"), row("2026-08-05"), row("2026-08-10")]))
    rows = store.window("Acme", days=10, ending=date(2026, 8, 10))
    assert [r.posted_on.isoformat() for r in rows] == ["2026-08-01", "2026-08-05", "2026-08-10"]


def test_window_excludes_posts_before_the_window(tmp_path):
    store = MetricsStore(write_rows(tmp_path, [row("2026-08-01"), row("2026-08-10")]))
    rows = store.window("Acme", days=3, ending=date(2026, 8, 10))
    assert len(rows) == 1


def test_merchant_lookup_is_case_insensitive(tmp_path):
    store = MetricsStore(write_rows(tmp_path, [row("2026-08-10")]))
    assert store.window("acme", days=5, ending=date(2026, 8, 10))


def test_summarise_totals_and_picks_the_best_post(tmp_path):
    store = MetricsStore(
        write_rows(
            tmp_path,
            [
                row("2026-08-09", impressions=1000, engagements=20),
                row("2026-08-10", platform="tiktok", impressions=500, engagements=100),
            ],
        )
    )
    summary = store.summarise(store.rows)
    assert summary["posts"] == 2
    assert summary["impressions"] == 1500
    assert summary["engagement_rate"] == 0.08
    assert summary["top_post"]["platform"] == "tiktok"
    assert set(summary["by_platform"]) == {"instagram", "tiktok"}


def test_empty_window_summarises_to_zero_not_a_crash(tmp_path):
    store = MetricsStore(write_rows(tmp_path, [row("2026-08-10")]))
    summary = store.summarise([])
    assert summary["posts"] == 0
    assert summary["engagement_rate"] == 0.0
    assert summary["top_post"] is None


def test_missing_file_reads_as_empty(tmp_path):
    assert MetricsStore(tmp_path / "nope.jsonl").rows == []


def test_shipped_demo_data_loads():
    store = MetricsStore()
    assert store.merchants(), "the bundled dataset should not be empty"
