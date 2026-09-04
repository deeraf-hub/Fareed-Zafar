"""A tiny metrics store so the reporting agent has real data to reason over.

In production this is a database or a platform Insights API. Keeping it behind
one small class means the agent's tools never change when that swap happens.
"""

from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

DEFAULT_DATA = Path(__file__).with_name("data") / "post_metrics.jsonl"


@dataclass(frozen=True)
class PostMetric:
    merchant: str
    platform: str
    posted_on: date
    impressions: int
    engagements: int
    clicks: int
    caption: str

    @property
    def engagement_rate(self) -> float:
        if self.impressions == 0:
            return 0.0
        return round(self.engagements / self.impressions, 4)


class MetricsStore:
    def __init__(self, path: Path | str = DEFAULT_DATA) -> None:
        self.path = Path(path)
        self._rows: list[PostMetric] | None = None

    @property
    def rows(self) -> list[PostMetric]:
        if self._rows is None:
            self._rows = list(self._load())
        return self._rows

    def _load(self):
        if not self.path.exists():
            return
        for line in self.path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            raw = json.loads(line)
            yield PostMetric(
                merchant=raw["merchant"],
                platform=raw["platform"],
                posted_on=date.fromisoformat(raw["posted_on"]),
                impressions=int(raw["impressions"]),
                engagements=int(raw["engagements"]),
                clicks=int(raw["clicks"]),
                caption=raw["caption"],
            )

    def merchants(self) -> list[str]:
        return sorted({row.merchant for row in self.rows})

    def window(self, merchant: str, days: int, ending: date | None = None) -> list[PostMetric]:
        end = ending or max((r.posted_on for r in self.rows), default=date.today())
        start = end - timedelta(days=days - 1)
        return [
            row
            for row in self.rows
            if row.merchant.lower() == merchant.lower() and start <= row.posted_on <= end
        ]

    def summarise(self, rows: list[PostMetric]) -> dict:
        """Totals overall and per platform — the shape the agent reports from."""
        by_platform: dict[str, dict[str, int]] = defaultdict(
            lambda: {"posts": 0, "impressions": 0, "engagements": 0, "clicks": 0}
        )
        for row in rows:
            bucket = by_platform[row.platform]
            bucket["posts"] += 1
            bucket["impressions"] += row.impressions
            bucket["engagements"] += row.engagements
            bucket["clicks"] += row.clicks

        impressions = sum(r.impressions for r in rows)
        engagements = sum(r.engagements for r in rows)
        return {
            "posts": len(rows),
            "impressions": impressions,
            "engagements": engagements,
            "clicks": sum(r.clicks for r in rows),
            "engagement_rate": round(engagements / impressions, 4) if impressions else 0.0,
            "by_platform": {k: dict(v) for k, v in sorted(by_platform.items())},
            "top_post": max(
                (
                    {
                        "platform": r.platform,
                        "posted_on": r.posted_on.isoformat(),
                        "engagement_rate": r.engagement_rate,
                        "caption": r.caption,
                    }
                    for r in rows
                ),
                key=lambda p: p["engagement_rate"],
                default=None,
            ),
        }
