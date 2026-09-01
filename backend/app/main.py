"""
NexusNotes — FastAPI Application Factory

This module creates and configures the FastAPI application instance.

Design:
- App is created via factory function (testable, configurable)
- Lifespan context manager handles startup/shutdown
- Middleware is applied in the correct order
- All routers are registered under /api/v1
- CORS is configured from settings
- OpenAPI docs are available in non-production environments
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.api.v1 import auth, health
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.core.middleware import (
    ErrorHandlingMiddleware,
    RequestIDMiddleware,
    TimingMiddleware,
)

settings = get_settings()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan context manager.

    Runs startup logic before yield, teardown logic after.
    """
    # ── Startup ──────────────────────────────────────────────────────────────
    configure_logging()
    logger.info(
        "nexusnotes_starting",
        app=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
        debug=settings.debug,
    )

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────────
    logger.info("nexusnotes_shutdown")

    # Dispose the connection pool
    from app.db.session import engine
    await engine.dispose()


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Returns a fully configured FastAPI instance.
    """
    # Only show API docs in non-production environments
    docs_url = "/docs" if not settings.is_production else None
    redoc_url = "/redoc" if not settings.is_production else None

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="""
## NexusNotes API

A production-quality knowledge management platform.

### Authentication

Most endpoints require a valid JWT Bearer token.

```
Authorization: Bearer <access_token>
```

Obtain a token via `POST /api/v1/auth/login`.

### Rate Limiting

API requests are rate limited to 100 requests per 60 seconds by default.
""",
        lifespan=lifespan,
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url="/openapi.json" if not settings.is_production else None,
    )

    # ── Middleware (applied in reverse order — outermost first) ──────────────
    # Error handling must be outermost to catch all errors
    app.add_middleware(ErrorHandlingMiddleware)
    app.add_middleware(TimingMiddleware)
    app.add_middleware(RequestIDMiddleware)

    # CORS — restrict to configured origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Process-Time"],
    )

    # ── Routers ──────────────────────────────────────────────────────────────
    API_PREFIX = "/api/v1"

    # Health checks (no auth required, no version prefix for convenience)
    app.include_router(health.router, prefix="/api")

    # Auth
    app.include_router(auth.router, prefix=API_PREFIX)

    # Import and register remaining routers
    # (imported here to avoid circular imports at module load time)
    from app.api.v1 import notes, folders, tags, attachments, search, graph

    app.include_router(notes.router, prefix=API_PREFIX)
    app.include_router(folders.router, prefix=API_PREFIX)
    app.include_router(tags.router, prefix=API_PREFIX)
    app.include_router(attachments.router, prefix=API_PREFIX)
    app.include_router(search.router, prefix=API_PREFIX)
    app.include_router(graph.router, prefix=API_PREFIX)

    logger.info(
        "nexusnotes_app_created",
        routes=len(app.routes),
        cors_origins=settings.cors_origins,
    )

    return app


# Application instance (used by uvicorn)
app = create_app()
