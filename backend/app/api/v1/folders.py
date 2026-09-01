"""NexusNotes — Folders API Router"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.dependencies.auth import get_current_active_user
from app.models.folder import Folder
from app.models.user import User
from app.schemas.notes import FolderCreate, FolderResponse, FolderUpdate, MessageResponse

router = APIRouter(prefix="/folders", tags=["Folders"])


@router.get("", response_model=list[FolderResponse], summary="List folders (tree)")
async def list_folders(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> list[FolderResponse]:
    """Return all folders as a flat list. Use parent_id to build tree on client."""
    result = await db.execute(
        select(Folder)
        .where(Folder.user_id == current_user.id)
        .order_by(Folder.name)
        .options(selectinload(Folder.children))
    )
    folders = result.scalars().all()
    return [FolderResponse.model_validate(f) for f in folders]


@router.post("", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def create_folder(
    data: FolderCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> FolderResponse:
    folder = Folder(user_id=current_user.id, name=data.name, parent_id=data.parent_id)
    db.add(folder)
    await db.flush()
    await db.refresh(folder)
    return FolderResponse.model_validate(folder)


@router.put("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: int,
    data: FolderUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> FolderResponse:
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == current_user.id)
    )
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    if data.name is not None:
        folder.name = data.name
    if data.parent_id is not None:
        folder.parent_id = data.parent_id

    await db.flush()
    await db.refresh(folder)
    return FolderResponse.model_validate(folder)


@router.delete("/{folder_id}", response_model=MessageResponse)
async def delete_folder(
    folder_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == current_user.id)
    )
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    await db.delete(folder)
    await db.flush()
    return MessageResponse(message="Folder deleted")
