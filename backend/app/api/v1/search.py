"""NexusNotes — Search API Router"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.schemas.notes import SearchResponse
from app.services.note_service import NoteService

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=SearchResponse, summary="Full-text search across notes")
async def search(
    q: str = Query(..., min_length=1, max_length=200, description="Search query"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> SearchResponse:
    """
    Search notes by title and content.

    Uses MySQL FULLTEXT search for queries ≥ 3 characters,
    falls back to LIKE for shorter queries.

    Designed so this endpoint can be backed by Elasticsearch/OpenSearch
    in a future phase without changing the API contract.
    """
    service = NoteService(db)
    return await service.search_notes(current_user.id, q, page=page, page_size=page_size)
