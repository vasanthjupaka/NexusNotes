"""
NexusNotes — Note ORM Model

Central entity of the application.

Design decisions:
- content: LONGTEXT to support large notes (up to ~4GB in MySQL)
- slug: URL-safe identifier derived from title (unique per user)
- is_deleted: Soft delete — notes are never hard-deleted immediately
- excerpt: Pre-computed preview text for list views (avoids loading full content)
- FULLTEXT index on (title, content) enables MySQL full-text search
"""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Note(Base):
    __tablename__ = "notes"

    # MySQL FULLTEXT index for search — defined at table level below
    __table_args__ = (
        Index("idx_notes_user_id", "user_id"),
        Index("idx_notes_folder_id", "folder_id"),
        Index("idx_notes_slug", "user_id", "slug", unique=True),
        Index("idx_notes_is_deleted", "is_deleted"),
        Index("idx_notes_is_archived", "is_archived"),
        Index("idx_notes_is_favorite", "is_favorite"),
        # FULLTEXT index for MySQL full-text search
        # Note: FULLTEXT indexes are only supported with InnoDB on MySQL 5.6+
        Index(
            "ft_notes_title_content",
            "title",
            "content",
            mysql_prefix="FULLTEXT",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False, default="Untitled")
    slug: Mapped[str] = mapped_column(String(600), nullable=False)
    content: Mapped[str] = mapped_column(LONGTEXT, nullable=False, default="")
    excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    folder_id: Mapped[int | None] = mapped_column(
        ForeignKey("folders.id", ondelete="SET NULL"), nullable=True
    )
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="notes")
    folder: Mapped["Folder | None"] = relationship("Folder", back_populates="notes")
    tags: Mapped[list["Tag"]] = relationship(
        "Tag", secondary="note_tags", back_populates="notes", lazy="select"
    )
    attachments: Mapped[list["Attachment"]] = relationship(
        "Attachment", back_populates="note", lazy="select", cascade="all, delete-orphan"
    )
    revisions: Mapped[list["NoteRevision"]] = relationship(
        "NoteRevision", back_populates="note", lazy="select", cascade="all, delete-orphan"
    )
    # Notes this note links TO (outgoing links)
    outgoing_links: Mapped[list["NoteLink"]] = relationship(
        "NoteLink",
        foreign_keys="NoteLink.source_note_id",
        back_populates="source_note",
        cascade="all, delete-orphan",
    )
    # Notes that link TO this note (incoming links / backlinks)
    incoming_links: Mapped[list["NoteLink"]] = relationship(
        "NoteLink",
        foreign_keys="NoteLink.target_note_id",
        back_populates="target_note",
    )

    def __repr__(self) -> str:
        return f"<Note id={self.id} title={self.title!r} user_id={self.user_id}>"
