"""
NexusNotes — Notes API Router

Full CRUD for notes + backlinks, revisions, and related endpoints.
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies.auth import PaginationParams, get_current_active_user
from app.models.user import User
from app.schemas.notes import (
    BacklinkNote,
    MessageResponse,
    NoteCreate,
    NoteDetail,
    NoteListResponse,
    NoteRevisionDetail,
    NoteRevisionSummary,
    NoteUpdate,
)
from app.services.note_service import NoteService

router = APIRouter(prefix="/notes", tags=["Notes"])


@router.get("", response_model=NoteListResponse, summary="List notes")
async def list_notes(
    folder_id: int | None = Query(None),
    is_favorite: bool | None = Query(None),
    is_archived: bool | None = Query(None),
    is_deleted: bool = Query(False),
    tag_id: int | None = Query(None),
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> NoteListResponse:
    """List notes with optional filters. Excludes soft-deleted by default."""
    service = NoteService(db)
    return await service.list_notes(
        current_user.id,
        folder_id=folder_id,
        is_favorite=is_favorite,
        is_archived=is_archived,
        is_deleted=is_deleted,
        tag_id=tag_id,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.post("", response_model=NoteDetail, status_code=status.HTTP_201_CREATED, summary="Create note")
async def create_note(
    data: NoteCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> NoteDetail:
    """Create a new note. Wiki links are parsed and indexed automatically."""
    service = NoteService(db)
    return await service.create_note(current_user, data)


@router.get("/{note_id}", response_model=NoteDetail, summary="Get note by ID")
async def get_note(
    note_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> NoteDetail:
    service = NoteService(db)
    return await service.get_note(note_id, current_user.id)


@router.put("/{note_id}", response_model=NoteDetail, summary="Update note")
async def update_note(
    note_id: int,
    data: NoteUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> NoteDetail:
    """Update a note. Triggers wiki-link re-indexing and revision creation."""
    service = NoteService(db)
    return await service.update_note(note_id, current_user, data)


@router.delete("/{note_id}", response_model=MessageResponse, summary="Soft-delete note")
async def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Soft-delete a note (moves to Trash). Recoverable via restore."""
    service = NoteService(db)
    await service.delete_note(note_id, current_user.id)
    return MessageResponse(message="Note moved to trash")


@router.post("/{note_id}/restore", response_model=NoteDetail, summary="Restore deleted note")
async def restore_note(
    note_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> NoteDetail:
    service = NoteService(db)
    return await service.restore_note(note_id, current_user.id)


@router.delete("/{note_id}/permanent", response_model=MessageResponse, summary="Permanently delete note")
async def permanent_delete_note(
    note_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Hard-delete a note from the database. This action is irreversible."""
    service = NoteService(db)
    await service.permanent_delete_note(note_id, current_user.id)
    return MessageResponse(message="Note permanently deleted")


@router.get("/{note_id}/backlinks", response_model=list[BacklinkNote], summary="Get backlinks")
async def get_backlinks(
    note_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> list[BacklinkNote]:
    """Return all notes that contain a [[link]] pointing to this note."""
    service = NoteService(db)
    return await service.get_backlinks(note_id, current_user.id)


@router.get("/{note_id}/revisions", response_model=list[NoteRevisionSummary], summary="List revisions")
async def list_revisions(
    note_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> list[NoteRevisionSummary]:
    service = NoteService(db)
    return await service.get_revisions(note_id, current_user.id)


@router.get("/{note_id}/revisions/{revision_id}", response_model=NoteRevisionDetail, summary="Get revision content")
async def get_revision(
    note_id: int,
    revision_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> NoteRevisionDetail:
    service = NoteService(db)
    return await service.get_revision(note_id, revision_id, current_user.id)
