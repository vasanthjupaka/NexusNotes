"""
NexusNotes — User ORM Model

Represents registered users of the application.

Security notes:
- password_hash stores the bcrypt hash ONLY — never the plaintext
- avatar_url is a URL reference, not binary data
- is_active allows soft-disabling accounts without deletion
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    notes: Mapped[list["Note"]] = relationship("Note", back_populates="user", lazy="select")
    folders: Mapped[list["Folder"]] = relationship("Folder", back_populates="user", lazy="select")
    tags: Mapped[list["Tag"]] = relationship("Tag", back_populates="user", lazy="select")
    attachments: Mapped[list["Attachment"]] = relationship("Attachment", back_populates="user", lazy="select")

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username!r}>"
