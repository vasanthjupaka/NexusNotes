"""NexusNotes — SQLAlchemy Declarative Base"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    SQLAlchemy declarative base for all ORM models.

    All models inheriting from Base are automatically included
    in Alembic migration autogeneration.
    """

    pass
