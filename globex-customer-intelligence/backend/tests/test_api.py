from __future__ import annotations

import csv
import io


def _rows(client, path):
    response = client.get(path)
    assert response.status_code == 200, response.text
    return response.json()


def test_health_and_readiness_without_data(client):
    assert client.get("/api/v1/health").json()["status"] == "ok"
    ready = client.get("/api/v1/ready").json()
    assert ready["status"] == "not_ready" and ready["database"] == "ok"


def test_validation_errors_use_the_error_envelope(client):
    r = client.get("/api/v1/customers", params={"page_size": 0})
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"
    r = client.get("/api/v1/customers", params={"sort": "bogus"})
    assert r.status_code == 422 and "sort must be" in r.json()["error"]["message"]
    r = client.get("/api/v1/customers", params={"activity": "sometime"})
    assert r.status_code == 422
    r = client.get("/api/v1/overview", params={"start": "2020-05-01", "end": "2020-01-01"})
    assert r.status_code == 422
    r = client.get("/api/v1/customers/does-not-exist")
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_found"


def test_model_unavailable_state_before_training(client, loaded_synthetic, engine):
    from sqlalchemy import text

    with engine.begin() as conn:
        conn.execute(
            text("TRUNCATE predictions, customer_segments, model_runs RESTART IDENTITY CASCADE")
        )
    page = _rows(client, "/api/v1/customers?page_size=5")
    assert page["total"] > 0
    first = page["items"][0]
    assert first["repeat_purchase_probability"]["status"] == "unavailable"
    assert first["repeat_purchase_probability"]["value"] is None
    assert "No active" in first["repeat_purchase_probability"]["reason"]
    preds = _rows(client, "/api/v1/predictions")
    assert preds["meta"]["status"] == "unavailable" and preds["results"]["total"] == 0
    segs = _rows(client, "/api/v1/segments")
    assert segs["status"] == "unavailable"
    models = _rows(client, "/api/v1/models")
    assert models["classification"] is None and models["segment_profiles"] == []


def test_overview_and_pagination(client, loaded_synthetic):
    overview = _rows(client, "/api/v1/overview")
    assert overview["dataset"]["mode"] == "historical_demo"
    kpis = overview["kpis"]
    assert kpis["gross_sales"] > 0 and kpis["net_revenue"] <= kpis["gross_sales"]
    assert kpis["orders"] > kpis["purchasing_customers"] > 0
    assert 0 <= kpis["repeat_purchase_rate"] <= 1
    assert len(overview["revenue_trend"]) >= 12
    assert overview["cohorts"] and overview["insights"]

    page1 = _rows(client, "/api/v1/customers?page=1&page_size=10&sort=customer_id&order=asc")
    page2 = _rows(client, "/api/v1/customers?page=2&page_size=10&sort=customer_id&order=asc")
    assert page1["page"] == 1 and page1["page_size"] == 10
    assert page1["total_pages"] == -(-page1["total"] // 10)
    assert [i["customer_id"] for i in page1["items"]] < [i["customer_id"] for i in page2["items"]]
    assert set(i["customer_id"] for i in page1["items"]).isdisjoint(
        i["customer_id"] for i in page2["items"]
    )


def test_filters_and_export_are_consistent(client, trained_models):
    filters = _rows(client, "/api/v1/customers/filters")
    assert filters["segments"] and filters["countries"]
    segment = filters["segments"][0]
    listing = _rows(client, f"/api/v1/customers?segment={segment}&country=France&page_size=200")
    assert all(i["segment_name"] == segment and i["country"] == "France" for i in listing["items"])
    export = client.get(f"/api/v1/customers/export.csv?segment={segment}&country=France")
    assert export.status_code == 200 and export.headers["content-type"].startswith("text/csv")
    rows = list(csv.DictReader(io.StringIO(export.text)))
    assert len(rows) == listing["total"]
    assert {r["customer_id"] for r in rows} == {i["customer_id"] for i in listing["items"]}
    assert all(r["segment"] == segment for r in rows)


def test_predictions_and_detail_after_training(client, trained_models):
    preds = _rows(client, "/api/v1/predictions?type=repeat_purchase_probability&page_size=5")
    assert preds["meta"]["status"] == "available" and preds["meta"]["cutoff_date"]
    ranks = [i["rank"] for i in preds["results"]["items"]]
    assert ranks == sorted(ranks) and ranks[0] == 1
    probs = [i["probability"] for i in preds["results"]["items"]]
    assert probs == sorted(probs, reverse=True)

    customer_id = preds["results"]["items"][0]["customer_id"]
    detail = _rows(client, f"/api/v1/customers/{customer_id}")
    assert detail["repeat_purchase_probability"]["status"] == "available"
    assert detail["repeat_purchase_probability"]["model_version"].startswith("classification-")
    assert detail["predicted_spend_30d"]["cutoff_date"] == preds["meta"]["cutoff_date"]
    assert detail["rfm"] and detail["behavioural_indicators"] and detail["purchase_history"]
    assert detail["purchase_history"] == sorted(
        detail["purchase_history"], key=lambda o: o["order_at"], reverse=True
    )

    models = _rows(client, "/api/v1/models")
    clf = models["classification"]
    assert clf["is_active"] and clf["calibration"] and clf["thresholds"] and clf["error_analysis"]
    assert any(c["is_baseline"] for c in clf["comparison"])
    assert models["regression"]["error_analysis"] and models["segment_profiles"]
    ready = client.get("/api/v1/ready").json()
    assert ready["status"] == "ready" and all(ready["has_active_models"].values())
