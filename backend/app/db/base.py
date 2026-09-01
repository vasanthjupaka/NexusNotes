"""NexusNotes — SQLAlchemy Declarative Base"""

from sqlalchemy.orm import DeclarativeBase, MappedColumn
from sqlalchemy import DateTime, func
from datetime import datetime


class Base(DeclarativeBase):
    """
    SQLAlchemy declarative base for all ORM models.

    All models inheriting from Base are automatically included
    in Alembic migration autogeneration.
    """
    pass
