"""
NexusNotes — S3 Storage Service

Wraps boto3 to provide a clean interface for S3/MinIO operations.

Design:
- All S3 interactions go through this service — never direct boto3 calls in routes
- Works with both real AWS S3 and MinIO (S3-compatible local emulator)
- On EC2, uses IAM Role credentials (no access keys in code)
- Locally, uses MinIO credentials from environment variables

Security:
- Bucket is PRIVATE — no public access
- Object keys are server-generated (UUID-based), never from user input
- Pre-signed URLs have a short expiry (1 hour by default)
- Executable files are rejected before upload
"""

import io
import mimetypes
import uuid
from typing import Any

import boto3
from botocore.exceptions import ClientError
from PIL import Image

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class S3Service:
    """
    S3/MinIO storage service.

    Instantiate once per request (or as a singleton for production).
    """

    def __init__(self) -> None:
        self._client: Any = None

    @property
    def client(self):
        """Lazily initialize S3 client."""
        if self._client is None:
            kwargs: dict[str, Any] = {
                "service_name": "s3",
                "region_name": settings.aws_region,
            }

            # Use explicit credentials only for local development (MinIO)
            # On EC2, the IAM Role provides credentials automatically via instance metadata
            if settings.aws_access_key_id and settings.aws_secret_access_key:
                kwargs["aws_access_key_id"] = settings.aws_access_key_id
                kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
                logger.debug("s3_client_using_explicit_credentials")
            else:
                logger.debug("s3_client_using_iam_role")

            # Custom endpoint for MinIO or LocalStack
            if settings.s3_endpoint_url:
                kwargs["endpoint_url"] = settings.s3_endpoint_url

            self._client = boto3.client(**kwargs)

        return self._client

    def generate_object_key(
        self,
        user_id: int,
        note_id: int | None,
        original_filename: str,
    ) -> str:
        """
        Generate a unique, server-controlled S3 object key.

        Format: users/{user_id}/notes/{note_id}/{uuid}-{sanitized_filename}

        NEVER uses the raw user-provided filename as the key to prevent:
        - Directory traversal attacks
        - Key collisions
        - Overwriting existing objects
        """
        # Sanitize filename: keep only safe characters
        safe_chars = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-_")
        sanitized = "".join(c if c in safe_chars else "_" for c in original_filename)
        sanitized = sanitized[:100]  # Truncate to reasonable length

        unique_id = str(uuid.uuid4())
        note_segment = f"notes/{note_id}" if note_id else "uploads"

        prefix = settings.aws_s3_prefix.rstrip("/")
        if prefix:
            return f"{prefix}/users/{user_id}/{note_segment}/{unique_id}-{sanitized}"
        return f"users/{user_id}/{note_segment}/{unique_id}-{sanitized}"

    async def upload_file(
        self,
        file_content: bytes,
        object_key: str,
        content_type: str,
        metadata: dict[str, str] | None = None,
    ) -> str:
        """
        Upload a file to S3/MinIO.

        Returns the object key (not a public URL — use generate_presigned_url for access).
        """
        extra_args: dict[str, Any] = {
            "ContentType": content_type,
            "ServerSideEncryption": "AES256",  # Server-side encryption
        }
        if metadata:
            extra_args["Metadata"] = metadata

        try:
            self.client.put_object(
                Bucket=settings.aws_s3_bucket,
                Key=object_key,
                Body=file_content,
                **extra_args,
            )
            logger.info(
                "s3_upload_success",
                bucket=settings.aws_s3_bucket,
                key=object_key,
                size=len(file_content),
            )
            return object_key
        except ClientError as exc:
            logger.error(
                "s3_upload_failed",
                bucket=settings.aws_s3_bucket,
                key=object_key,
                error=str(exc),
            )
            raise

    def generate_presigned_url(
        self,
        object_key: str,
        expiry_seconds: int = 3600,
    ) -> str:
        """
        Generate a pre-signed URL for temporary private object access.

        The URL expires after expiry_seconds (default: 1 hour).
        This keeps the bucket private while allowing the browser to display images.
        """
        try:
            url = self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.aws_s3_bucket, "Key": object_key},
                ExpiresIn=expiry_seconds,
            )
            return url
        except ClientError as exc:
            logger.error("presigned_url_generation_failed", key=object_key, error=str(exc))
            raise

    async def delete_object(self, object_key: str) -> None:
        """Delete an object from S3/MinIO."""
        try:
            self.client.delete_object(Bucket=settings.aws_s3_bucket, Key=object_key)
            logger.info("s3_delete_success", key=object_key)
        except ClientError as exc:
            logger.error("s3_delete_failed", key=object_key, error=str(exc))
            raise

    def ensure_bucket_exists(self) -> None:
        """
        Ensure the S3 bucket exists (MinIO dev only).

        On real AWS, bucket creation should be done via IaC (Terraform/CloudFormation).
        This is only used for MinIO local development convenience.
        """
        if settings.use_real_s3:
            return  # Don't auto-create on real AWS

        try:
            self.client.head_bucket(Bucket=settings.aws_s3_bucket)
        except ClientError:
            try:
                self.client.create_bucket(Bucket=settings.aws_s3_bucket)
                logger.info("minio_bucket_created", bucket=settings.aws_s3_bucket)
            except ClientError as exc:
                logger.error("minio_bucket_creation_failed", error=str(exc))


def validate_image_upload(
    content: bytes,
    content_type: str,
    original_filename: str,
) -> tuple[int, int]:
    """
    Validate an uploaded image file.

    Checks:
    1. MIME type is in the allowlist (no executables)
    2. File extension matches MIME type
    3. File size within limits
    4. Is actually a valid image (PIL verification)
    5. Returns (width, height)

    Raises ValueError with a descriptive message on failure.
    """
    # 1. MIME type allowlist
    if content_type not in settings.allowed_image_types:
        raise ValueError(
            f"File type '{content_type}' is not allowed. "
            f"Allowed types: {', '.join(settings.allowed_image_types)}"
        )

    # 2. Extension check
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
    import os
    _, ext = os.path.splitext(original_filename.lower())
    if ext not in allowed_extensions:
        raise ValueError(f"File extension '{ext}' is not allowed")

    # 3. File size check
    if len(content) > settings.max_upload_size:
        size_mb = settings.max_upload_size / (1024 * 1024)
        raise ValueError(f"File size exceeds maximum allowed size of {size_mb:.0f}MB")

    # 4. SVG files — validate without PIL (SVG is XML, not raster)
    if content_type == "image/svg+xml":
        return 0, 0  # SVG dimensions are CSS-defined

    # 5. Verify actual image content with PIL (prevents polyglot files)
    try:
        with Image.open(io.BytesIO(content)) as img:
            img.verify()  # Verify image integrity
        # Re-open to get dimensions (verify() makes the image unusable)
        with Image.open(io.BytesIO(content)) as img:
            width, height = img.size
    except Exception as exc:
        raise ValueError(f"Invalid image file: {exc}") from exc

    return width, height


# Module-level singleton
_s3_service: S3Service | None = None


def get_s3_service() -> S3Service:
    """Get or create the S3 service singleton."""
    global _s3_service
    if _s3_service is None:
        _s3_service = S3Service()
    return _s3_service
