"""Download the public Online Retail II workbook from the UCI Machine Learning Repository.

Source: Chen, D. (2019). Online Retail II [Dataset]. UCI Machine Learning Repository.
https://doi.org/10.24432/C5CG6D - licensed CC BY 4.0.
"""

from __future__ import annotations

import logging
import zipfile
from pathlib import Path

import httpx

from gci.ingest.importer import sha256_of_file

log = logging.getLogger(__name__)

UCI_ZIP_URL = "https://archive.ics.uci.edu/static/public/502/online+retail+ii.zip"
WORKBOOK_NAME = "online_retail_II.xlsx"
# SHA-256 of the workbook distributed by UCI (verified 2026-09-21).
EXPECTED_SHA256 = "bcbe73b35f5b7babf197fb0cb983a11f5d9ff929078d4aa53d171b1f2df2e980"


class DownloadError(RuntimeError):
    pass


def download_dataset(dest_dir: Path, url: str = UCI_ZIP_URL, timeout: float = 600.0) -> Path:
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    target = dest_dir / WORKBOOK_NAME
    if target.exists():
        log.info("workbook already present", extra={"path": str(target)})
        return target

    archive = dest_dir / "online_retail_ii.zip"
    log.info("downloading dataset", extra={"url": url})
    try:
        with httpx.stream("GET", url, timeout=timeout, follow_redirects=True) as response:
            response.raise_for_status()
            with archive.open("wb") as handle:
                for chunk in response.iter_bytes():
                    handle.write(chunk)
    except httpx.HTTPError as exc:
        raise DownloadError(
            f"Could not download {url} ({exc}). Download the file manually from "
            "https://archive.ics.uci.edu/dataset/502/online+retail+ii and run "
            f"`gci import-data /path/to/{WORKBOOK_NAME}` instead."
        ) from exc

    if zipfile.is_zipfile(archive):
        with zipfile.ZipFile(archive) as zf:
            members = [m for m in zf.namelist() if m.lower().endswith(".xlsx")]
            if not members:
                raise DownloadError("Archive did not contain an .xlsx workbook")
            with zf.open(members[0]) as src, target.open("wb") as dst:
                dst.write(src.read())
        archive.unlink()
    else:  # some mirrors serve the workbook directly
        archive.rename(target)

    checksum = sha256_of_file(target)
    if checksum != EXPECTED_SHA256:
        log.warning(
            "workbook checksum differs from the verified UCI file",
            extra={"expected": EXPECTED_SHA256, "actual": checksum},
        )
    return target
