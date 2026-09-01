"""
NexusNotes Backend — Middleware

Custom ASGI middleware for:
- Request ID injection (for tracing)
- Request timing
- Structured access logging
- Centralized error handling

Design:
- Middleware runs before route handlers
- Every request gets a unique request_id
- Response time is measured and logged
- Unhandled exceptions are caught and returned as structured JSON
"""

import time
import uuid
from typing import Any

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

from app.core.logging import get_logger

logger = get_logger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Injects a unique request ID into each request.

    The request ID is:
    - Generated as a UUID4 if not provided by the client
    - Accepted from the X-Request-ID header (for tracing across services)
    - Added to the response as X-Request-ID
    - Made available via request.state.request_id
    """

    def __init__(self, app: ASGIApp, header_name: str = "X-Request-ID") -> None:
        super().__init__(app)
        self.header_name = header_name

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Accept from client or generate new
        request_id = request.headers.get(self.header_name) or str(uuid.uuid4())
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers[self.header_name] = request_id
        return response


class TimingMiddleware(BaseHTTPMiddleware):
    """
    Measures and logs request duration.

    Adds X-Process-Time header to responses (in milliseconds).
    Logs structured access records for every request.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        start_time = time.perf_counter()

        response = await call_next(request)

        duration_ms = (time.perf_counter() - start_time) * 1000
        response.headers["X-Process-Time"] = f"{duration_ms:.2f}ms"

        # Structured access log
        request_id = getattr(request.state, "request_id", "unknown")
        user_id = getattr(request.state, "user_id", None)

        log_kwargs: dict[str, Any] = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round(duration_ms, 2),
        }

        if user_id:
            log_kwargs["user_id"] = user_id

        if response.status_code >= 500:
            logger.error("request_completed", **log_kwargs)
        elif response.status_code >= 400:
            logger.warning("request_completed", **log_kwargs)
        else:
            logger.info("request_completed", **log_kwargs)

        return response


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Catches unhandled exceptions and returns structured JSON error responses.

    IMPORTANT: Never exposes:
    - Stack traces to clients
    - Internal paths
    - Database connection strings
    - Secret keys or credentials

    Internal errors are logged with full context server-side.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        try:
            return await call_next(request)
        except Exception as exc:
            request_id = getattr(request.state, "request_id", "unknown")

            # Log the full error internally
            logger.error(
                "unhandled_exception",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                error_type=type(exc).__name__,
                error=str(exc),
                exc_info=True,
            )

            # Return a generic error to the client — no internal details
            return JSONResponse(
                status_code=500,
                content={
                    "error": "internal_server_error",
                    "message": "An unexpected error occurred. Please try again.",
                    "request_id": request_id,
                },
            )
