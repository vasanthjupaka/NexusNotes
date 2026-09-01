"""
NexusNotes — NoteLink ORM Model

Tracks wiki-style links between notes: [[Target Note Title]]

When a note's content is saved, the backend:
1. Parses all [[...]] references from the content
2. Resolves them to target note IDs (if they exist)
3. Upserts the note_links table

This enables:
- Efficient backlink queries (no full-text scan needed)
- Graph visualization (nodes = notes, edges = links)
- Related notes suggestions
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class NoteLink(Base):
    __tablename__ = "note_links"

    __table_args__ = (
        # A source note can only link to a target once
        UniqueConstraint("source_note_id", "target_note_id", name="uq_note_links"),
        Index("idx_note_links_source", "source_note_id"),
        Index("idx_note_links_target", "target_note_id"),  # Critical for backlink queries
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source_note_id: Mapped[int] = mapped_column(
        ForeignKey("notes.id", ondelete="CASCADE"), nullable=False
    )
    target_note_id: Mapped[int] = mapped_column(
        ForeignKey("notes.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    source_note: Mapped["Note"] = relationship(
        "Note", foreign_keys=[source_note_id], back_populates="outgoing_links"
    )
    target_note: Mapped["Note"] = relationship(
        "Note", foreign_keys=[target_note_id], back_populates="incoming_links"
    )

    def __repr__(self) -> str:
        return f"<NoteLink {self.source_note_id} → {self.target_note_id}>"
