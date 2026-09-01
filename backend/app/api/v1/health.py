"""
NexusNotes — Health Check Endpoints

GET /api/health  — Liveness probe (is the process running?)
GET /api/ready   — Readiness probe (are dependencies available?)

These endpoints are used by:
- Docker HEALTHCHECK
- AWS ALB health checks
- Kubernetes liveness/readiness probes
- Deployment verification scripts

Liveness (/health):
  Returns 200 immediately — if the process is running and accepting requests.
  Should never check dependencies (a slow DB shouldn't restart the container).

Readiness (/ready):
  Returns 200 only when all dependencies are available.
  Used to hold traffic away until the app is fully operational.
"""

import time
from typing import Any

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import get_settings
from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal

logger = get_logger(__name__)
router = APIRouter(tags=["Health"])
settings = get_settings()


@router.get(
    "/health",
    summary="Liveness probe",
    response_description="Application is alive",
)
async def health() -> dict[str, Any]:
    """
    Liveness probe — returns immediately.

    Returns 200 if the application process is running and accepting requests.
    Does NOT check database or external dependencies.
    """
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
        "environment": settings.app_env,
    }


@router.get(
    "/ready",
    summary="Readiness probe",
    response_description="Application is ready to serve traffic",
)
async def ready() -> JSONResponse:
    """
    Readiness probe — verifies all required dependencies are available.

    Checks:
    - Database connectivity (MySQL)
    - S3/MinIO configuration (basic check only — does not upload)

    Returns 200 when ready, 503 when not ready.
    """
    checks: dict[str, str] = {}
    all_healthy = True
    start = time.perf_counter()

    # ── Database check ──────────────────────────────────────────────────────
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        logger.error("readiness_check_db_failed", error=str(exc))
        checks["database"] = "error"
        all_healthy = False

    # ── S3 configuration check ──────────────────────────────────────────────
    # Only verify configuration — don't make actual S3 requests on every probe
    if settings.aws_s3_bucket:
        checks["s3_config"] = "ok"
    else:
        checks["s3_config"] = "not_configured"
        # S3 is required for image uploads but not for basic functionality
        # Don't fail readiness for missing S3 config — log a warning instead
        logger.warning("s3_bucket_not_configured")

    duration_ms = (time.perf_counter() - start) * 1000

    status_str = "ready" if all_healthy else "not_ready"
    http_status = status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=http_status,
        content={
            "status": status_str,
            "checks": checks,
            "duration_ms": round(duration_ms, 2),
        },
    )
