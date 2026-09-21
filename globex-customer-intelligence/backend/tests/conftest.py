"""Test configuration.

Tests run against a dedicated PostgreSQL database (``TEST_DATABASE_URL``). The environment is
set *before* any ``gci`` import so the cached settings/engine point at the test database.
Model artifacts and MLflow runs go to temporary directories.
"""

from __future__ import annotations

import os
import tempfile

from gci.config import Settings  # noqa: E402  (uncached: reads .env for the test URL)

_TEST_URL = os.environ.get("TEST_DATABASE_URL") or Settings().test_database_url
os.environ["DATABASE_URL"] = _TEST_URL
os.environ["TEST_DATABASE_URL"] = _TEST_URL
_TMP = tempfile.mkdtemp(prefix="gci-test-")
os.environ.setdefault("MODEL_STORE_DIR", os.path.join(_TMP, "models"))
os.environ.setdefault("MLFLOW_TRACKING_URI", os.path.join(_TMP, "mlruns"))
os.environ["MLFLOW_EXPERIMENT_NAME"] = "gci-tests"
os.environ["LOG_LEVEL"] = "WARNING"

import csv  # noqa: E402
from datetime import datetime, timedelta  # noqa: E402
from pathlib import Path  # noqa: E402

import numpy as np  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from gci.db.base import Base  # noqa: E402
from gci.db.session import get_engine  # noqa: E402

BACKEND_DIR = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def engine():
    engine = get_engine()
    with engine.begin() as conn:
        Base.metadata.drop_all(conn)
        conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    os.environ["ALEMBIC_DATABASE_URL"] = _TEST_URL
    command.upgrade(cfg, "head")
    return engine


SYNTHETIC_FIXTURES = {"loaded_synthetic", "trained_models"}


def truncate_all(engine) -> None:
    tables = ", ".join(t.name for t in reversed(Base.metadata.sorted_tables))
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))


@pytest.fixture(autouse=True)
def clean_db(request, engine):
    """Start every test from an empty database, except tests that share the synthetic world
    (loading and training it once per session keeps the suite fast)."""
    if not SYNTHETIC_FIXTURES & set(request.fixturenames):
        truncate_all(engine)
    yield


@pytest.fixture
def client(engine):
    from gci.api.main import app

    return TestClient(app)


HEADER = [
    "Invoice",
    "StockCode",
    "Description",
    "Quantity",
    "InvoiceDate",
    "Price",
    "Customer ID",
    "Country",
]


@pytest.fixture
def tiny_workbook(tmp_path) -> Path:
    """Two sheets with an overlapping row (as in the UCI file) and one example of every rule."""
    import openpyxl

    sheet_a = [
        [
            "489434",
            "85048",
            "MUG",
            6,
            datetime(2010, 12, 1, 7, 45),
            6.95,
            13085.0,
            "United Kingdom",
        ],
        [
            "489434",
            "79323P",
            "PINK LIGHT",
            12,
            datetime(2010, 12, 1, 7, 45),
            6.75,
            13085.0,
            "United Kingdom",
        ],
        [
            "489435",
            "22350",
            "CAT BOWL",
            2,
            datetime(2010, 12, 2, 9, 0),
            2.55,
            13085.0,
            "United Kingdom",
        ],
        ["489436", "22350", "CAT BOWL", 4, datetime(2010, 12, 3, 9, 0), 2.55, 13086.0, "France"],
        [
            "489436",
            "22350",
            "CAT BOWL",
            4,
            datetime(2010, 12, 3, 9, 0),
            2.55,
            13086.0,
            "France",
        ],  # within-sheet dup
        [
            "489436",
            "POST",
            "POSTAGE",
            1,
            datetime(2010, 12, 3, 9, 0),
            18.0,
            13086.0,
            "France",
        ],  # non-product
        [
            "C489437",
            "22350",
            "CAT BOWL",
            -2,
            datetime(2010, 12, 4, 10, 0),
            2.55,
            13085.0,
            "United Kingdom",
        ],  # return
        [
            "489438",
            "22350",
            "CAT BOWL",
            3,
            datetime(2010, 12, 5, 11, 0),
            2.55,
            None,
            "United Kingdom",
        ],  # anonymous
        [
            "489439",
            "22350",
            "check",
            -7,
            datetime(2010, 12, 5, 12, 0),
            0.0,
            None,
            "United Kingdom",
        ],  # zero price adj
        [
            "489440",
            "22350",
            "CAT BOWL",
            1,
            "not a date",
            2.55,
            13085.0,
            "United Kingdom",
        ],  # invalid date
        [
            "489441",
            "22350",
            "CAT BOWL",
            0,
            datetime(2010, 12, 6, 12, 0),
            2.55,
            13085.0,
            "United Kingdom",
        ],  # zero qty
    ]
    sheet_b = [
        [
            "489436",
            "22350",
            "CAT BOWL",
            4,
            datetime(2010, 12, 3, 9, 0),
            2.55,
            13086.0,
            "France",
        ],  # cross-sheet dup
        ["489442", "85048", "MUG", 10, datetime(2011, 1, 10, 9, 0), 6.95, 13086.0, "France"],
        ["489443", "85048", "MUG", 1, datetime(2011, 1, 11, 9, 0), 6.95, 13087.0, "Germany"],
    ]
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Year A"
    ws.append(HEADER)
    for row in sheet_a:
        ws.append(row)
    ws2 = wb.create_sheet("Year B")
    ws2.append(HEADER)
    for row in sheet_b:
        ws2.append(row)
    path = tmp_path / "tiny.xlsx"
    wb.save(path)
    return path


def make_synthetic_csv(path: Path, n_customers: int = 160, seed: int = 7) -> Path:
    """Deterministic synthetic retail history (TEST FIXTURE ONLY, never shown in the app)."""
    rng = np.random.default_rng(seed)
    start = datetime(2019, 1, 1)
    rows = []
    invoice = 500000
    for cid in range(10001, 10001 + n_customers):
        rate = rng.gamma(1.5, 1.2)  # expected orders per quarter
        n_orders = max(1, rng.poisson(rate * 8))
        first = int(rng.integers(0, 200))
        days = sorted(set(int(d) for d in rng.integers(first, 730, size=n_orders)))
        country = "United Kingdom" if rng.random() < 0.8 else "France"
        for d in days:
            invoice += 1
            ts = start + timedelta(days=d, hours=int(rng.integers(8, 18)))
            for _ in range(int(rng.integers(1, 6))):
                rows.append(
                    [
                        str(invoice),
                        str(rng.integers(10000, 10060)),
                        "PRODUCT",
                        int(rng.integers(1, 24)),
                        ts.strftime("%Y-%m-%d %H:%M:%S"),
                        round(float(rng.uniform(0.5, 25)), 2),
                        str(cid),
                        country,
                    ]
                )
            if rng.random() < 0.06:
                rows.append(
                    [
                        f"C{invoice}",
                        str(rng.integers(10000, 10060)),
                        "PRODUCT",
                        -int(rng.integers(1, 5)),
                        (ts + timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S"),
                        round(float(rng.uniform(0.5, 25)), 2),
                        str(cid),
                        country,
                    ]
                )
    for _ in range(40):  # anonymous lines
        invoice += 1
        ts = start + timedelta(days=int(rng.integers(0, 730)), hours=10)
        rows.append(
            [
                str(invoice),
                "10001",
                "PRODUCT",
                3,
                ts.strftime("%Y-%m-%d %H:%M:%S"),
                4.5,
                "",
                "United Kingdom",
            ]
        )
    with path.open("w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(HEADER)
        writer.writerows(rows)
    return path


@pytest.fixture
def synthetic_csv(tmp_path) -> Path:
    return make_synthetic_csv(tmp_path / "synthetic.csv")


@pytest.fixture(scope="session")
def _synthetic_path(tmp_path_factory) -> Path:
    return make_synthetic_csv(tmp_path_factory.mktemp("synthetic") / "synthetic.csv")


@pytest.fixture
def loaded_synthetic(engine, _synthetic_path):
    """Synthetic data imported, analytics and snapshots built. Re-created only if a previous test
    emptied the database."""
    from gci.features.snapshots import build_snapshots
    from gci.ingest.analytics import build_analytics
    from gci.ingest.importer import import_file

    with engine.connect() as conn:
        has_snapshots = conn.execute(text("SELECT count(*) FROM customer_snapshots")).scalar() > 0
    if not has_snapshots:
        truncate_all(engine)
        import_file(_synthetic_path)
        build_analytics()
        build_snapshots()
    return {"path": _synthetic_path}


@pytest.fixture
def trained_models(loaded_synthetic, engine):
    """All three models trained and predictions generated (once per session unless cleared)."""
    from gci.ml.classification import train_classifier
    from gci.ml.regression import train_regressor
    from gci.ml.scoring import generate_predictions
    from gci.ml.segmentation import train_segmentation

    with engine.connect() as conn:
        active = conn.execute(text("SELECT count(*) FROM model_runs WHERE is_active")).scalar()
        preds = conn.execute(text("SELECT count(*) FROM predictions")).scalar()
    if active < 3 or preds == 0:
        result = {
            "segmentation": train_segmentation(),
            "classification": train_classifier(),
            "regression": train_regressor(),
            "predictions": generate_predictions(),
        }
        trained_models.cache = result
    return trained_models.cache
