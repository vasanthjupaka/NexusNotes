"""
NexusNotes — Attachments API Router

Handles image/file upload, download, and deletion.
Actual files are stored in S3/MinIO — only metadata in MySQL.
"""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db
from app.dependencies.auth import get_current_active_user
from app.models.attachment import Attachment
from app.models.user import User
from app.schemas.notes import AttachmentResponse, MessageResponse
from app.services.s3_service import get_s3_service, validate_image_upload

router = APIRouter(prefix="/attachments", tags=["Attachments"])
settings = get_settings()


@router.post(
    "/upload",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload an image attachment",
)
async def upload_attachment(
    file: UploadFile = File(...),
    note_id: int | None = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AttachmentResponse:
    """
    Upload an image file and attach it to a note.

    Validates MIME type, extension, file size, and image integrity.
    Stores the file in S3/MinIO and saves metadata to MySQL.
    Returns the attachment with a pre-signed download URL.
    """
    # Read file content
    content = await file.read()

    # Validate the upload
    try:
        width, height = validate_image_upload(
            content=content,
            content_type=file.content_type or "application/octet-stream",
            original_filename=file.filename or "upload",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    s3 = get_s3_service()

    # Generate secure object key
    object_key = s3.generate_object_key(
        user_id=current_user.id,
        note_id=note_id,
        original_filename=file.filename or "upload",
    )

    # Upload to S3/MinIO
    try:
        await s3.upload_file(
            file_content=content,
            object_key=object_key,
            content_type=file.content_type or "application/octet-stream",
            metadata={
                "user-id": str(current_user.id),
                "original-filename": file.filename or "upload",
            },
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to upload file to storage")

    # Save metadata to database
    attachment = Attachment(
        user_id=current_user.id,
        note_id=note_id,
        original_filename=file.filename or "upload",
        object_key=object_key,
        bucket_name=settings.aws_s3_bucket,
        content_type=file.content_type or "application/octet-stream",
        file_size=len(content),
        width=width or None,
        height=height or None,
    )
    db.add(attachment)
    await db.flush()
    await db.refresh(attachment)

    # Generate pre-signed URL for immediate display
    url = s3.generate_presigned_url(object_key, expiry_seconds=3600)

    response = AttachmentResponse.model_validate(attachment)
    response.url = url
    return response


@router.get("/{attachment_id}", response_model=AttachmentResponse, summary="Get attachment with download URL")
async def get_attachment(
    attachment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AttachmentResponse:
    """Get attachment metadata and a fresh pre-signed download URL."""
    result = await db.execute(
        select(Attachment).where(
            Attachment.id == attachment_id,
            Attachment.user_id == current_user.id,
        )
    )
    attachment = result.scalar_one_or_none()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    s3 = get_s3_service()
    url = s3.generate_presigned_url(attachment.object_key)

    response = AttachmentResponse.model_validate(attachment)
    response.url = url
    return response


@router.delete("/{attachment_id}", response_model=MessageResponse, summary="Delete attachment")
async def delete_attachment(
    attachment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Delete an attachment — removes both S3 object and database record."""
    result = await db.execute(
        select(Attachment).where(
            Attachment.id == attachment_id,
            Attachment.user_id == current_user.id,
        )
    )
    attachment = result.scalar_one_or_none()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    s3 = get_s3_service()

    # Delete from S3 first
    try:
        await s3.delete_object(attachment.object_key)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to delete file from storage")

    # Delete from database
    await db.delete(attachment)
    await db.flush()

    return MessageResponse(message="Attachment deleted")
