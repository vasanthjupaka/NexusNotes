"""
NexusNotes — Models Package

Import all models here so Alembic can discover them for autogeneration.
All models must be imported before alembic.env references Base.metadata.
"""

from app.db.base import Base  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.folder import Folder  # noqa: F401
from app.models.note import Note  # noqa: F401
from app.models.tag import Tag, note_tags  # noqa: F401
from app.models.note_link import NoteLink  # noqa: F401
from app.models.attachment import Attachment  # noqa: F401
from app.models.note_revision import NoteRevision  # noqa: F401

__all__ = [
    "Base",
    "User",
    "Folder",
    "Note",
    "Tag",
    "note_tags",
    "NoteLink",
    "Attachment",
    "NoteRevision",
]
