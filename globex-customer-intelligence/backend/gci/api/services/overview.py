from __future__ import annotations

from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session

from gci.api.services.common import active_runs, end_exclusive, period_bounds, start_inclusive
from gci.api.sqlfiles import load_sql
from gci.ingest.quality import dataset_info


def _rows(session: Session, name: str, **params) -> list[dict]:
    return [dict(r) for r in session.execute(load_sql(name), params).mappings()]


def overview(session: Session, start: date | None, end: date | None) -> dict:
    period_start, period_end = period_bounds(session, start, end)
    params = {"start_at": start_inclusive(period_start), "end_at": end_exclusive(period_end)}

    k = session.execute(load_sql("overview_kpis"), params).mappings().one()
    gross = float(k["gross_sales"] or 0)
    returns = float(k["return_amount"] or 0)
    orders = int(k["orders"] or 0)
    purchasing = int(k["purchasing_customers"] or 0)
    kpis = {
        "gross_sales": gross,
        "net_revenue": gross + returns,
        "return_amount": returns,
        "orders": orders,
        "purchasing_customers": purchasing,
        "anonymous_orders": int(k["anonymous_orders"] or 0),
        "average_order_value": (gross / orders) if orders else None,
        "repeat_purchase_rate": (int(k["repeat_customers"] or 0) / purchasing)
        if purchasing
        else None,
        "return_rate": (-returns / gross) if gross else None,
    }

    trend = [
        {
            "month": r["month"],
            "gross_sales": float(r["gross_sales"]),
            "net_revenue": float(r["net_revenue"]),
            "orders": int(r["orders"]),
            "purchasing_customers": int(r["purchasing_customers"]),
        }
        for r in _rows(session, "monthly_revenue", **params)
    ]

    runs = active_runs(session)
    seg_run = runs["segmentation"]
    segment_distribution: list[dict] = []
    if seg_run is not None:
        seg_rows = (
            session.execute(
                text(
                    "SELECT segment_name, cluster_id, count(*) AS customers, "
                    "sum(monetary) AS monetary "
                    "FROM customer_segments WHERE model_run_id = :run GROUP BY 1, 2 "
                    "ORDER BY customers DESC"
                ),
                {"run": seg_run.id},
            )
            .mappings()
            .all()
        )
        total = sum(int(r["customers"]) for r in seg_rows) or 1
        total_monetary = sum(float(r["monetary"] or 0) for r in seg_rows) or 1.0
        segment_distribution = [
            {
                "segment_name": r["segment_name"],
                "cluster_id": int(r["cluster_id"]),
                "customers": int(r["customers"]),
                "share": int(r["customers"]) / total,
                "revenue_share": float(r["monetary"] or 0) / total_monetary,
            }
            for r in seg_rows
        ]

    cohorts = [
        {
            "cohort_month": r["cohort_month"],
            "months_since_first": int(r["months_since_first"]),
            "cohort_size": int(r["cohort_size"]),
            "active_customers": int(r["active_customers"]),
            "repeat_rate": float(r["repeat_rate"]),
        }
        for r in _rows(
            session,
            "cohort_repeat_rates",
            start_month=period_start.replace(day=1),
            end_month=period_end.replace(day=1),
            max_months=12,
        )
    ]

    insights = build_insights(session, params, kpis, trend, cohorts, segment_distribution)
    return {
        "dataset": dataset_info(session),
        "period_start": period_start,
        "period_end": period_end,
        "kpis": kpis,
        "revenue_trend": trend,
        "segment_distribution": segment_distribution,
        "segmentation_model_version": seg_run.model_version if seg_run else None,
        "cohorts": cohorts,
        "insights": insights,
    }


def build_insights(
    session: Session,
    params: dict,
    kpis: dict,
    trend: list[dict],
    cohorts: list[dict],
    segments: list[dict],
) -> list[dict]:
    insights: list[dict] = []
    if trend:
        best = max(trend, key=lambda t: t["gross_sales"])
        insights.append(
            {
                "title": "Peak month",
                "detail": f"{best['month']:%B %Y} had the highest gross sales in the period "
                f"(£{best['gross_sales']:,.0f} from {best['orders']:,} orders).",
                "kind": "observation",
            }
        )
        months = {t["month"]: t for t in trend}
        yoy = [
            (m, t, months[m.replace(year=m.year - 1)])
            for m, t in months.items()
            if m.replace(year=m.year - 1) in months
        ]
        if yoy:
            cur = sum(t["gross_sales"] for _, t, _ in yoy)
            prev = sum(p["gross_sales"] for _, _, p in yoy)
            if prev:
                insights.append(
                    {
                        "title": "Year-on-year comparison",
                        "detail": f"Across the {len(yoy)} months that appear in both years, gross "
                        f"sales were {((cur / prev) - 1):+.1%} versus the same months a year "
                        "earlier.",
                        "kind": "observation",
                    }
                )
    contribution = [
        dict(r) for r in session.execute(load_sql("revenue_contribution"), params).mappings()
    ]
    if contribution:
        top = contribution[0]
        insights.append(
            {
                "title": "Revenue concentration",
                "detail": f"The top 10% of identified customers ({int(top['customers']):,}) "
                f"generated {float(top['revenue_share']):.0%} of identified gross sales.",
                "kind": "observation",
            }
        )
    frequency = [
        dict(r) for r in session.execute(load_sql("customer_purchase_frequency"), params).mappings()
    ]
    one_off = next((f for f in frequency if f["bucket"] == "1 order"), None)
    if one_off and kpis["repeat_purchase_rate"] is not None:
        insights.append(
            {
                "title": "Repeat purchasing",
                "detail": f"{kpis['repeat_purchase_rate']:.0%} of purchasing customers placed two "
                f"or more orders; {float(one_off['share_pct']):.0f}% placed exactly one.",
                "kind": "observation",
            }
        )
    rolling = [
        dict(r) for r in session.execute(load_sql("rolling_purchase_activity"), params).mappings()
    ]
    if len(rolling) >= 4:
        last, first = rolling[-1], rolling[min(2, len(rolling) - 1)]
        insights.append(
            {
                "title": "Active customers",
                "detail": f"The trailing three-month average of active customers was "
                f"{float(last['active_customers_3m_avg']):,.0f} in {last['month']:%B %Y}, compared "
                f"with {float(first['active_customers_3m_avg']):,.0f} in {first['month']:%B %Y}.",
                "kind": "observation",
            }
        )
    if kpis["return_rate"] is not None and kpis["gross_sales"]:
        insights.append(
            {
                "title": "Returns",
                "detail": f"Recorded cancellations amounted to {kpis['return_rate']:.1%} of gross "
                f"sales (£{-kpis['return_amount']:,.0f}).",
                "kind": "observation",
            }
        )
    if kpis["orders"]:
        share = kpis["anonymous_orders"] / kpis["orders"]
        insights.append(
            {
                "title": "Anonymous orders",
                "detail": f"{share:.0%} of orders have no customer ID. They are included in sales "
                "totals but cannot be segmented or scored.",
                "kind": "caution",
            }
        )
    if segments:
        biggest = max(segments, key=lambda s: s["revenue_share"] or 0)
        insights.append(
            {
                "title": "Segment with most lookback spending",
                "detail": f"'{biggest['segment_name']}' holds {biggest['revenue_share']:.0%} of "
                f"spending in the 365 days before the cutoff with {biggest['share']:.0%} of "
                "customers.",
                "kind": "observation",
            }
        )
    insights.append(
        {
            "title": "Historical data",
            "detail": "All figures describe December 2009 to December 2011. Associations shown "
            "here are descriptive; they do not establish that any action caused a result.",
            "kind": "caution",
        }
    )
    return insights
