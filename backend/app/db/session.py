"""
NexusNotes — Database Session Management

Provides:
- Async SQLAlchemy engine
- Async session factory
- FastAPI dependency for database sessions

Why async?
- FastAPI is built for async/await
- Async DB connections allow handling many concurrent requests
  without blocking threads
- aiomysql is the async MySQL driver used here
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

# ──────────────────────────────────────────────────────────────────────────────
# Engine
# ──────────────────────────────────────────────────────────────────────────────
# pool_pre_ping: Validates connections before use (handles dropped connections)
# pool_recycle: Recycles connections every 30 minutes (prevents MySQL 8hr timeout)
# echo: Logs SQL queries in development (disabled in production)
engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=10,
    max_overflow=20,
    echo=settings.debug,
)

# ──────────────────────────────────────────────────────────────────────────────
# Session Factory
# ──────────────────────────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Prevents lazy-load errors after commit
    autocommit=False,
    autoflush=False,
)


# ──────────────────────────────────────────────────────────────────────────────
# FastAPI Dependency
# ──────────────────────────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides an async database session.

    Usage in route handlers:
        @router.get("/notes")
        async def list_notes(db: AsyncSession = Depends(get_db)):
            ...

    The session is automatically closed and rolled back on errors.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
