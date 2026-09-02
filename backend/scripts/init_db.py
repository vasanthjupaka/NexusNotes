"""
NexusNotes — Initialize Database Schema

Creates all required MySQL tables from SQLAlchemy models if they do not exist.
Usage:
    python scripts/init_db.py
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models import Base
from app.db.session import engine


async def init_db() -> None:
    print("📦 Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ All database tables created successfully!")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(init_db())
