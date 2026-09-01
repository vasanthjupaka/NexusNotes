"""
NexusNotes — NoteRevision ORM Model

Stores historical snapshots of note content.

A revision is created every time a note is saved.
This allows users to:
- View the full edit history of any note
- Restore a previous version

Performance note:
- Revisions are stored as full content snapshots (not diffs)
- This is simpler to implement and sufficient for MVP
- Future: Consider delta compression or diff-based storage

Retention: Revisions are retained indefinitely for MVP.
Future: Implement configurable retention policy.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class NoteRevision(Base):
    __tablename__ = "note_revisions"

    __table_args__ = (
        Index("idx_revisions_note_id", "note_id"),
        Index("idx_revisions_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    note_id: Mapped[int] = mapped_column(
        ForeignKey("notes.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(LONGTEXT, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # Relationships
    note: Mapped["Note"] = relationship("Note", back_populates="revisions")
    author: Mapped["User"] = relationship("User", foreign_keys=[created_by])

    def __repr__(self) -> str:
        return f"<NoteRevision id={self.id} note_id={self.note_id}>"
