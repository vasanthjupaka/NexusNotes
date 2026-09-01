"""
NexusNotes — FastAPI Dependencies

Provides reusable FastAPI Depends() functions for:
- Current user extraction from JWT
- Database session (re-exported from db.session)
- Pagination parameters
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TOKEN_TYPE_ACCESS, decode_token
from app.db.session import get_db
from app.models.user import User

# Re-export for convenience
__all__ = ["get_db", "get_current_user", "get_current_active_user", "PaginationParams"]

security_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extract and validate the current user from the JWT bearer token.

    Raises 401 if:
    - Token is missing
    - Token is invalid or expired
    - User does not exist
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(credentials.credentials)
        token_type = payload.get("type")
        if token_type != TOKEN_TYPE_ACCESS:
            raise credentials_exception

        user_id_str: str | None = payload.get("sub")
        if not user_id_str:
            raise credentials_exception

        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    # Import here to avoid circular import
    from app.repositories.user_repository import UserRepository
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)

    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Extends get_current_user to also verify the account is active.

    Raises 403 if the account has been disabled.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )
    return current_user


class PaginationParams:
    """
    Common pagination query parameters.

    Usage:
        @router.get("/notes")
        async def list_notes(pagination: PaginationParams = Depends()):
            page = pagination.page
            page_size = pagination.page_size
    """

    def __init__(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> None:
        if page < 1:
            raise HTTPException(status_code=400, detail="page must be >= 1")
        if page_size < 1 or page_size > 100:
            raise HTTPException(status_code=400, detail="page_size must be between 1 and 100")
        self.page = page
        self.page_size = page_size

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size
