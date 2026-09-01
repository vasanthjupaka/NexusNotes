"""
NexusNotes — Tag ORM Model

User-scoped tags for organizing notes.
Tags are unique per user (same tag name can exist for different users).
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Table, Column, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


# Association table for many-to-many Note ↔ Tag
note_tags = Table(
    "note_tags",
    Base.metadata,
    Column("note_id", Integer, ForeignKey("notes.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    __table_args__ = (
        Index("idx_tags_user_id", "user_id"),
        # Tag names must be unique per user
        Index("idx_tags_user_name", "user_id", "name", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="tags")
    notes: Mapped[list["Note"]] = relationship(
        "Note", secondary="note_tags", back_populates="tags", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Tag id={self.id} name={self.name!r} user_id={self.user_id}>"
