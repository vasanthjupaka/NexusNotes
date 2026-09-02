"""
NexusNotes — Note Repository

Database access layer for note operations.
All queries are parameterized via SQLAlchemy ORM — no raw SQL interpolation.
"""

from datetime import datetime, timezone

from sqlalchemy import Select, func, select, update, and_, or_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.note import Note
from app.models.note_link import NoteLink
from app.models.tag import Tag, note_tags
from app.models.note_revision import NoteRevision


class NoteRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    def _base_query(self, user_id: int) -> Select:
        """Base query: notes belonging to user, not hard-deleted."""
        return (
            select(Note)
            .where(Note.user_id == user_id, Note.is_deleted == False)  # noqa: E712
            .options(selectinload(Note.tags))
        )

    async def get_by_id(self, note_id: int, user_id: int) -> Note | None:
        result = await self.db.execute(
            self._base_query(user_id).where(Note.id == note_id)
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str, user_id: int) -> Note | None:
        result = await self.db.execute(
            self._base_query(user_id).where(Note.slug == slug)
        )
        return result.scalar_one_or_none()

    async def list_notes(
        self,
        user_id: int,
        *,
        folder_id: int | None = None,
        is_favorite: bool | None = None,
        is_archived: bool | None = None,
        is_deleted: bool = False,
        tag_id: int | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Note], int]:
        """List notes with filters, returning (items, total_count)."""
        base = select(Note).where(
            Note.user_id == user_id,
            Note.is_deleted == is_deleted,
        )

        if folder_id is not None:
            base = base.where(Note.folder_id == folder_id)
        if is_favorite is not None:
            base = base.where(Note.is_favorite == is_favorite)
        if is_archived is not None:
            base = base.where(Note.is_archived == is_archived)
        if tag_id is not None:
            base = base.join(note_tags).where(note_tags.c.tag_id == tag_id)

        # Count query
        count_q = select(func.count()).select_from(base.subquery())
        total = (await self.db.execute(count_q)).scalar_one()

        # Data query with pagination
        data_q = (
            base.options(selectinload(Note.tags))
            .order_by(Note.updated_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(data_q)
        return result.scalars().all(), total

    async def create(
        self,
        user_id: int,
        title: str,
        slug: str,
        content: str,
        excerpt: str | None,
        folder_id: int | None,
    ) -> Note:
        note = Note(
            user_id=user_id,
            title=title,
            slug=slug,
            content=content,
            excerpt=excerpt,
            folder_id=folder_id,
        )
        self.db.add(note)
        await self.db.flush()
        await self.db.refresh(note)
        return note

    async def update(self, note: Note, **kwargs) -> Note:
        for key, value in kwargs.items():
            if value is not None or key in ("folder_id",):
                setattr(note, key, value)
        note.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(note)
        return note

    async def soft_delete(self, note: Note) -> Note:
        note.is_deleted = True
        note.deleted_at = datetime.now(timezone.utc)
        await self.db.flush()
        return note

    async def hard_delete(self, note: Note) -> None:
        """Permanently remove the note row from the database."""
        await self.db.delete(note)
        await self.db.flush()

    async def restore(self, note: Note) -> Note:
        note.is_deleted = False
        note.deleted_at = None
        await self.db.flush()
        return note

    async def set_tags(self, note: Note, tag_ids: list[int]) -> None:
        """Replace all tags on a note."""
        # Clear existing
        await self.db.execute(
            delete(note_tags).where(note_tags.c.note_id == note.id)
        )
        # Add new
        if tag_ids:
            await self.db.execute(
                note_tags.insert(),
                [{"note_id": note.id, "tag_id": tid} for tid in tag_ids],
            )
        await self.db.refresh(note)

    # ── Note Links ────────────────────────────────────────────────────────────

    async def upsert_note_links(
        self, source_note_id: int, target_note_ids: list[int]
    ) -> None:
        """Replace all outgoing links from source_note_id."""
        # Delete existing outgoing links
        await self.db.execute(
            delete(NoteLink).where(NoteLink.source_note_id == source_note_id)
        )
        # Insert new links (skip self-links)
        for target_id in set(target_note_ids):
            if target_id != source_note_id:
                link = NoteLink(source_note_id=source_note_id, target_note_id=target_id)
                self.db.add(link)
        await self.db.flush()

    async def get_backlinks(self, note_id: int, user_id: int) -> list[Note]:
        """Get all notes that link TO this note (backlinks)."""
        result = await self.db.execute(
            select(Note)
            .join(NoteLink, NoteLink.source_note_id == Note.id)
            .where(
                NoteLink.target_note_id == note_id,
                Note.user_id == user_id,
                Note.is_deleted == False,  # noqa: E712
            )
        )
        return result.scalars().all()

    async def get_all_for_graph(self, user_id: int) -> tuple[list[Note], list[NoteLink]]:
        """Fetch all non-deleted notes and their links for graph rendering."""
        notes_result = await self.db.execute(
            select(Note)
            .where(Note.user_id == user_id, Note.is_deleted == False)  # noqa: E712
            .options(selectinload(Note.tags))
        )
        notes = notes_result.scalars().all()

        note_ids = [n.id for n in notes]
        if not note_ids:
            return notes, []

        links_result = await self.db.execute(
            select(NoteLink).where(
                NoteLink.source_note_id.in_(note_ids),
                NoteLink.target_note_id.in_(note_ids),
            )
        )
        links = links_result.scalars().all()
        return notes, links

    # ── Revisions ─────────────────────────────────────────────────────────────

    async def create_revision(
        self, note_id: int, content: str, created_by: int
    ) -> NoteRevision:
        revision = NoteRevision(
            note_id=note_id,
            content=content,
            created_by=created_by,
        )
        self.db.add(revision)
        await self.db.flush()
        return revision

    async def get_revisions(self, note_id: int) -> list[NoteRevision]:
        result = await self.db.execute(
            select(NoteRevision)
            .where(NoteRevision.note_id == note_id)
            .order_by(NoteRevision.created_at.desc())
            .limit(50)  # Limit to last 50 revisions
        )
        return result.scalars().all()

    async def get_revision(self, revision_id: int, note_id: int) -> NoteRevision | None:
        result = await self.db.execute(
            select(NoteRevision).where(
                NoteRevision.id == revision_id,
                NoteRevision.note_id == note_id,
            )
        )
        return result.scalar_one_or_none()

    # ── Full-Text Search ───────────────────────────────────────────────────────

    async def search(
        self,
        user_id: int,
        query: str,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Note], int]:
        """
        MySQL FULLTEXT search on title + content.

        Falls back to LIKE search if the query is too short for FULLTEXT.
        The search interface is abstracted here so it can be swapped for
        Elasticsearch/OpenSearch in a future phase without changing the service.
        """
        if len(query.strip()) < 3:
            # FULLTEXT requires minimum word length — use LIKE for short queries
            from sqlalchemy import or_
            base = select(Note).where(
                Note.user_id == user_id,
                Note.is_deleted == False,  # noqa: E712
                or_(
                    Note.title.ilike(f"%{query}%"),
                    Note.content.ilike(f"%{query}%"),
                ),
            )
        else:
            from sqlalchemy import text
            base = select(Note).where(
                Note.user_id == user_id,
                Note.is_deleted == False,  # noqa: E712
                text(
                    "MATCH(notes.title, notes.content) AGAINST(:q IN BOOLEAN MODE)"
                ).bindparams(q=f"{query}*"),
            )

        count_q = select(func.count()).select_from(base.subquery())
        total = (await self.db.execute(count_q)).scalar_one()

        data_q = (
            base.options(selectinload(Note.tags))
            .order_by(Note.updated_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(data_q)
        return result.scalars().all(), total
