"""
NexusNotes — Folder ORM Model

Hierarchical folder structure for organizing notes.
Supports nested folders via self-referential parent_id.
"""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Self-referential: parent_id=None means top-level folder
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("folders.id", ondelete="CASCADE"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="folders")
    notes: Mapped[list["Note"]] = relationship("Note", back_populates="folder", lazy="select")
    # Self-referential children
    children: Mapped[list["Folder"]] = relationship(
        "Folder",
        back_populates="parent",
        lazy="select",
        cascade="all, delete-orphan",
    )
    parent: Mapped["Folder | None"] = relationship(
        "Folder",
        back_populates="children",
        remote_side="Folder.id",
    )

    def __repr__(self) -> str:
        return f"<Folder id={self.id} name={self.name!r} user_id={self.user_id}>"
