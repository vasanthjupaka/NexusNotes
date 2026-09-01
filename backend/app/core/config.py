"""
NexusNotes Backend — Application Configuration

Uses Pydantic BaseSettings for typed, validated configuration.
All settings are loaded from environment variables (or .env file in development).

NEVER hardcode secrets here. Use environment variables.
"""

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    All settings are validated at startup. If a required variable is missing
    or has an invalid type, the application will refuse to start.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ──────────────────────────────────────────────────────────────────────────
    # Application
    # ──────────────────────────────────────────────────────────────────────────
    app_name: str = "NexusNotes"
    app_version: str = "1.0.0"
    app_env: Literal["development", "staging", "production"] = "development"
    debug: bool = False

    # ──────────────────────────────────────────────────────────────────────────
    # API Server
    # ──────────────────────────────────────────────────────────────────────────
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # ──────────────────────────────────────────────────────────────────────────
    # Database
    # ──────────────────────────────────────────────────────────────────────────
    database_url: str = (
        "mysql+aiomysql://nexusnotes:changeme@localhost:3306/nexusnotes"
    )

    # ──────────────────────────────────────────────────────────────────────────
    # Authentication (JWT)
    # ──────────────────────────────────────────────────────────────────────────
    jwt_secret: str  # Required — no default
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 30

    # ──────────────────────────────────────────────────────────────────────────
    # CORS
    # ──────────────────────────────────────────────────────────────────────────
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        """Allow comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    # ──────────────────────────────────────────────────────────────────────────
    # AWS / S3
    # ──────────────────────────────────────────────────────────────────────────
    aws_region: str = "us-east-1"
    aws_s3_bucket: str = "nexusnotes-assets"
    aws_s3_prefix: str = ""
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    # S3-compatible endpoint (MinIO for local dev, empty for real AWS)
    s3_endpoint_url: str | None = None

    # ──────────────────────────────────────────────────────────────────────────
    # File Uploads
    # ──────────────────────────────────────────────────────────────────────────
    max_upload_size: int = 10 * 1024 * 1024  # 10 MB
    allowed_image_types: list[str] = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
    ]

    @field_validator("allowed_image_types", mode="before")
    @classmethod
    def parse_allowed_image_types(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [t.strip() for t in v.split(",")]
        return v

    # ──────────────────────────────────────────────────────────────────────────
    # Logging
    # ──────────────────────────────────────────────────────────────────────────
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    # ──────────────────────────────────────────────────────────────────────────
    # Rate Limiting
    # ──────────────────────────────────────────────────────────────────────────
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 100
    rate_limit_window_seconds: int = 60

    # ──────────────────────────────────────────────────────────────────────────
    # Computed properties
    # ──────────────────────────────────────────────────────────────────────────
    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def use_real_s3(self) -> bool:
        """True when using real AWS S3 (no custom endpoint)."""
        return self.s3_endpoint_url is None


@lru_cache
def get_settings() -> Settings:
    """
    Return cached Settings instance.

    Uses lru_cache so settings are only parsed once per process.
    In tests, clear the cache with get_settings.cache_clear() to reload.
    """
    return Settings()
