"""NexusNotes — Graph API Router"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.schemas.notes import GraphResponse
from app.services.note_service import NoteService

router = APIRouter(prefix="/graph", tags=["Graph"])


@router.get("", response_model=GraphResponse, summary="Get knowledge graph data")
async def get_graph(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> GraphResponse:
    """
    Return nodes (notes) and edges (links) for the knowledge graph.

    The response is consumed by the D3.js force-directed graph on the frontend.
    Note: For very large note collections, consider pagination or clustering.
    """
    service = NoteService(db)
    return await service.get_graph(current_user.id)
