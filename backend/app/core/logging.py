"""
NexusNotes Backend — Structured Logging

Configures structlog for JSON-formatted, structured log output.

Why structured logging?
- Machine-readable JSON logs integrate with CloudWatch Logs Insights
- Request IDs enable tracing a single request across log lines
- No sensitive data (passwords, tokens, credentials) is ever logged
"""

import logging
import sys

import structlog

from app.core.config import get_settings


def configure_logging() -> None:
    """
    Configure structured JSON logging for the application.

    Call this once at application startup (in main.py lifespan).
    """
    settings = get_settings()

    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)

    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )

    # Choose renderer based on environment
    # Development: human-readable colored output
    # Production: JSON for CloudWatch ingestion
    if settings.is_development:
        renderer = structlog.dev.ConsoleRenderer(colors=True)
    else:
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=[
            # Add log level name to event dict
            structlog.stdlib.add_log_level,
            # Add logger name
            structlog.stdlib.add_logger_name,
            # Add timestamp
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            # Render exception info
            structlog.processors.ExceptionRenderer(),
            # Render stack info
            structlog.processors.StackInfoRenderer(),
            # Final renderer
            renderer,
        ],
        wrapper_class=structlog.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None) -> structlog.BoundLogger:
    """
    Get a structured logger instance.

    Usage:
        logger = get_logger(__name__)
        logger.info("note_created", note_id=42, user_id=1)

    Args:
        name: Logger name, typically __name__ of the calling module.

    Returns:
        Bound structlog logger.
    """
    return structlog.get_logger(name)
