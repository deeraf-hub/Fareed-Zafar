"""Command-line interface: every expensive job (download, import, feature build, training,
scoring) runs here, never from an API request."""

from __future__ import annotations

import json
import logging
from pathlib import Path

import typer

from gci.config import get_settings
from gci.logging import configure_logging

app = typer.Typer(help="Globex Customer Intelligence pipeline commands.", no_args_is_help=True)
log = logging.getLogger("gci.cli")


@app.callback()
def _init(log_level: str = typer.Option(None, help="Override LOG_LEVEL")) -> None:
    configure_logging(log_level or get_settings().log_level)


@app.command()
def download(
    dest: Path = typer.Option(Path("data/raw"), help="Directory for the workbook"),
    url: str = typer.Option(None, help="Override the UCI download URL (e.g. a mirror)"),
) -> None:
    """Download the public Online Retail II workbook (UCI, CC BY 4.0)."""
    from gci.ingest.download import UCI_ZIP_URL, download_dataset

    path = download_dataset(dest, url=url or UCI_ZIP_URL)
    typer.echo(f"Workbook ready at {path}")


@app.command("import-data")
def import_data(
    path: Path = typer.Argument(..., exists=True, readable=True, help=".xlsx or .csv source"),
    force: bool = typer.Option(False, help="Re-import even if this exact file was loaded before"),
) -> None:
    """Stage 1-3: raw records -> validation -> cleaned transactions (idempotent by checksum)."""
    from gci.ingest.importer import import_file

    run = import_file(path, force=force)
    typer.echo(
        json.dumps(
            {
                "run_id": run.id,
                "status": run.status,
                "rows_read": run.rows_read,
                "rows_accepted": run.rows_accepted,
                "rows_excluded": run.rows_excluded,
                "rows_flagged": run.rows_flagged,
                "sheets": run.sheets,
            },
            default=str,
            indent=2,
        )
    )
    if run.status == "skipped_duplicate":
        typer.echo("Nothing loaded: identical file already imported. Use --force to replace it.")


@app.command("build-analytics")
def build_analytics_cmd() -> None:
    """Stage 4: products, customers, orders and order items from cleaned transactions."""
    from gci.ingest.analytics import build_analytics

    typer.echo(json.dumps(build_analytics(), indent=2))


@app.command("build-features")
def build_features_cmd(
    frequency: str = typer.Option("monthly", help="Snapshot cutoff frequency: monthly | weekly"),
) -> None:
    """Stage 5: point-in-time customer snapshots with 30-day labels."""
    from gci.features.snapshots import build_snapshots

    typer.echo(json.dumps(build_snapshots(frequency=frequency), indent=2, default=str))


@app.command("train-segmentation")
def train_segmentation_cmd() -> None:
    """Fit RFM K-means segmentation at the scoring cutoff and store segments."""
    from gci.ml.segmentation import train_segmentation

    typer.echo(json.dumps(train_segmentation(), indent=2, default=str))


@app.command("train-classifier")
def train_classifier_cmd() -> None:
    """Train and evaluate the 30-day repeat-purchase classifier."""
    from gci.ml.classification import train_classifier

    typer.echo(json.dumps(train_classifier(), indent=2, default=str))


@app.command("train-regressor")
def train_regressor_cmd() -> None:
    """Train and evaluate the 30-day purchase-spending regressor."""
    from gci.ml.regression import train_regressor

    typer.echo(json.dumps(train_regressor(), indent=2, default=str))


@app.command()
def train() -> None:
    """Train segmentation, classifier and regressor (each logged to MLflow)."""
    from gci.ml.classification import train_classifier
    from gci.ml.regression import train_regressor
    from gci.ml.segmentation import train_segmentation

    out = {
        "segmentation": train_segmentation(),
        "classification": train_classifier(),
        "regression": train_regressor(),
    }
    typer.echo(json.dumps(out, indent=2, default=str))


@app.command()
def predict() -> None:
    """Score every eligible customer at the latest usable cutoff with the active models."""
    from gci.ml.scoring import generate_predictions

    typer.echo(json.dumps(generate_predictions(), indent=2, default=str))


@app.command("quality-report")
def quality_report_cmd(
    out: Path = typer.Option(Path("reports/data_quality.md"), help="Markdown output path"),
) -> None:
    """Write the data-quality report (accepted / excluded / flagged rows, duplicates)."""
    from gci.db.session import session_scope
    from gci.ingest.quality import quality_report, render_markdown

    with session_scope() as session:
        report = quality_report(session)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render_markdown(report), encoding="utf-8")
    typer.echo(f"Report written to {out}")


@app.command("run-all")
def run_all(
    path: Path = typer.Argument(..., exists=True, help="Source workbook or CSV"),
    force: bool = typer.Option(False, help="Force re-import of an already loaded file"),
) -> None:
    """Import, build analytics and features, train all models, generate predictions."""
    from gci.features.snapshots import build_snapshots
    from gci.ingest.analytics import build_analytics
    from gci.ingest.importer import import_file
    from gci.ml.classification import train_classifier
    from gci.ml.regression import train_regressor
    from gci.ml.scoring import generate_predictions
    from gci.ml.segmentation import train_segmentation

    run = import_file(path, force=force)
    typer.echo(f"import: {run.status} ({run.rows_accepted} accepted rows)")
    typer.echo(f"analytics: {build_analytics()}")
    typer.echo(f"features: {build_snapshots()}")
    typer.echo(f"segmentation: {train_segmentation()['model_version']}")
    typer.echo(f"classifier: {train_classifier()['model_version']}")
    typer.echo(f"regressor: {train_regressor()['model_version']}")
    typer.echo(f"predictions: {generate_predictions()}")


if __name__ == "__main__":
    app()
