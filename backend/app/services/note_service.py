"""
NexusNotes — Note Service

Business logic for note operations.
Coordinates: repository + wiki-link parser + revision creation.
"""

import time

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.note import Note
from app.models.user import User
from app.repositories.note_repository import NoteRepository
from app.schemas.notes import (
    BacklinkNote,
    GraphEdge,
    GraphNode,
    GraphResponse,
    NoteCreate,
    NoteDetail,
    NoteListResponse,
    NoteSummary,
    NoteUpdate,
    NoteRevisionDetail,
    NoteRevisionSummary,
    SearchResponse,
    SearchResult,
    TagResponse,
)
from app.services.wiki_parser import (
    extract_wiki_links,
    generate_excerpt,
    generate_slug,
    resolve_wiki_links,
)


class NoteService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = NoteRepository(db)

    def _assert_ownership(self, note: Note | None, user_id: int) -> Note:
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Note not found"
            )
        if note.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )
        return note

    async def create_note(self, user: User, data: NoteCreate) -> NoteDetail:
        # Generate initial slug (will be updated after ID is assigned)
        initial_slug = generate_slug(data.title)

        note = await self.repo.create(
            user_id=user.id,
            title=data.title,
            slug=initial_slug,
            content=data.content,
            excerpt=generate_excerpt(data.content),
            folder_id=data.folder_id,
        )

        # Now that we have the note ID, make the slug unique
        note = await self.repo.update(note, slug=generate_slug(data.title, note.id))

        # Set tags
        if data.tag_ids:
            await self.repo.set_tags(note, data.tag_ids)

        # Parse and resolve wiki links
        await self._process_wiki_links(note, user.id)

        # Create initial revision
        await self.repo.create_revision(note.id, data.content, user.id)

        return NoteDetail.model_validate(note)

    async def update_note(self, note_id: int, user: User, data: NoteUpdate) -> NoteDetail:
        note = await self.repo.get_by_id(note_id, user.id)
        self._assert_ownership(note, user.id)

        updates: dict = {}
        if data.title is not None:
            updates["title"] = data.title
            updates["slug"] = generate_slug(data.title, note.id)
        if data.content is not None:
            updates["content"] = data.content
            updates["excerpt"] = generate_excerpt(data.content)
        if data.folder_id is not None:
            updates["folder_id"] = data.folder_id
        if data.is_favorite is not None:
            updates["is_favorite"] = data.is_favorite
        if data.is_archived is not None:
            updates["is_archived"] = data.is_archived

        note = await self.repo.update(note, **updates)

        if data.tag_ids is not None:
            await self.repo.set_tags(note, data.tag_ids)

        if data.content is not None:
            await self._process_wiki_links(note, user.id)
            await self.repo.create_revision(note.id, data.content, user.id)

        return NoteDetail.model_validate(note)

    async def get_note(self, note_id: int, user_id: int) -> NoteDetail:
        note = await self.repo.get_by_id(note_id, user_id)
        self._assert_ownership(note, user_id)
        return NoteDetail.model_validate(note)

    async def list_notes(
        self,
        user_id: int,
        folder_id: int | None = None,
        is_favorite: bool | None = None,
        is_archived: bool | None = None,
        is_deleted: bool = False,
        tag_id: int | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> NoteListResponse:
        offset = (page - 1) * page_size
        notes, total = await self.repo.list_notes(
            user_id,
            folder_id=folder_id,
            is_favorite=is_favorite,
            is_archived=is_archived,
            is_deleted=is_deleted,
            tag_id=tag_id,
            offset=offset,
            limit=page_size,
        )
        return NoteListResponse(
            items=[NoteSummary.model_validate(n) for n in notes],
            total=total,
            page=page,
            page_size=page_size,
            has_more=(offset + page_size) < total,
        )

    async def delete_note(self, note_id: int, user_id: int) -> None:
        note = await self.repo.get_by_id(note_id, user_id)
        self._assert_ownership(note, user_id)
        await self.repo.soft_delete(note)

    async def restore_note(self, note_id: int, user_id: int) -> NoteDetail:
        # For trash we need to also find deleted notes
        from sqlalchemy import select
        from app.models.note import Note as NoteModel
        from sqlalchemy.orm import selectinload

        result = await self.db.execute(
            select(NoteModel)
            .where(NoteModel.id == note_id, NoteModel.user_id == user_id)
            .options(selectinload(NoteModel.tags))
        )
        note = result.scalar_one_or_none()
        self._assert_ownership(note, user_id)
        note = await self.repo.restore(note)
        return NoteDetail.model_validate(note)

    async def get_backlinks(self, note_id: int, user_id: int) -> list[BacklinkNote]:
        # Verify the note exists and belongs to user
        note = await self.repo.get_by_id(note_id, user_id)
        self._assert_ownership(note, user_id)

        backlinks = await self.repo.get_backlinks(note_id, user_id)
        return [BacklinkNote.model_validate(n) for n in backlinks]

    async def get_graph(self, user_id: int) -> GraphResponse:
        notes, links = await self.repo.get_all_for_graph(user_id)

        nodes = [
            GraphNode(
                id=n.id,
                title=n.title,
                slug=n.slug,
                tag_names=[t.name for t in n.tags],
            )
            for n in notes
        ]
        edges = [
            GraphEdge(source=lnk.source_note_id, target=lnk.target_note_id)
            for lnk in links
        ]
        return GraphResponse(nodes=nodes, edges=edges)

    async def search_notes(
        self,
        user_id: int,
        query: str,
        page: int = 1,
        page_size: int = 20,
    ) -> SearchResponse:
        start = time.perf_counter()
        offset = (page - 1) * page_size
        notes, total = await self.repo.search(user_id, query, offset=offset, limit=page_size)
        took_ms = (time.perf_counter() - start) * 1000

        results = [
            SearchResult(
                id=n.id,
                title=n.title,
                slug=n.slug,
                excerpt=n.excerpt,
                tags=[TagResponse.model_validate(t) for t in n.tags],
                is_favorite=n.is_favorite,
                is_archived=n.is_archived,
                created_at=n.created_at,
                updated_at=n.updated_at,
            )
            for n in notes
        ]
        return SearchResponse(query=query, results=results, total=total, took_ms=round(took_ms, 2))

    async def get_revisions(self, note_id: int, user_id: int) -> list[NoteRevisionSummary]:
        note = await self.repo.get_by_id(note_id, user_id)
        self._assert_ownership(note, user_id)
        revisions = await self.repo.get_revisions(note_id)
        return [NoteRevisionSummary.model_validate(r) for r in revisions]

    async def get_revision(
        self, note_id: int, revision_id: int, user_id: int
    ) -> NoteRevisionDetail:
        note = await self.repo.get_by_id(note_id, user_id)
        self._assert_ownership(note, user_id)
        revision = await self.repo.get_revision(revision_id, note_id)
        if not revision:
            raise HTTPException(status_code=404, detail="Revision not found")
        return NoteRevisionDetail.model_validate(revision)

    async def _process_wiki_links(self, note: Note, user_id: int) -> None:
        """Parse wiki links from content and update note_links table."""
        link_titles = extract_wiki_links(note.content)
        resolved = await resolve_wiki_links(self.db, user_id, link_titles)
        target_ids = list(resolved.values())
        await self.repo.upsert_note_links(note.id, target_ids)
