"""Application settings.

All configuration comes from environment variables (or a local ``.env`` file). Nothing
secret is stored in code; see ``.env.example`` for the full list.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", protected_namespaces=()
    )

    # Database
    database_url: str = "postgresql+psycopg://gci:gci@localhost:5432/gci"
    test_database_url: str = "postgresql+psycopg://gci:gci@localhost:5432/gci_test"

    # Model + experiment storage
    model_store_dir: Path = Path("./models")
    mlflow_tracking_uri: str = "./mlruns"
    mlflow_experiment_name: str = "globex-customer-intelligence"

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:5173"
    log_level: str = "INFO"
    enable_admin_endpoints: bool = False

    # Modelling conventions (documented in docs/business-definitions.md)
    horizon_days: int = 30
    lookback_days: int = 365

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @field_validator("mlflow_tracking_uri", mode="before")
    @classmethod
    def _absolutise_local_tracking_uri(cls, value: object) -> object:
        """MLflow needs an absolute path (or URI) for file-based tracking."""
        if isinstance(value, str) and "://" not in value and not value.startswith("/"):
            return str(Path(value).resolve())
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
