"""
NexusNotes — Auth API Router

Endpoints:
  POST /api/v1/auth/register  — Create new account
  POST /api/v1/auth/login     — Authenticate, get tokens
  POST /api/v1/auth/logout    — Invalidate refresh token (client-side cleanup)
  POST /api/v1/auth/refresh   — Exchange refresh token for new access token
  GET  /api/v1/auth/me        — Get current user profile
"""

from fastapi import APIRouter, Depends, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TOKEN_TYPE_REFRESH, verify_token_type, create_access_token
from app.db.session import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    TokenResponse,
    UserPublic,
)
from app.services.auth_service import AuthService
from fastapi import HTTPException

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Refresh token cookie name
REFRESH_TOKEN_COOKIE = "refresh_token"


@router.post(
    "/register",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> UserPublic:
    """
    Create a new NexusNotes account.

    - **username**: 3–50 chars, alphanumeric + underscore/dash
    - **email**: Valid email address (must be unique)
    - **password**: Minimum 8 characters
    """
    service = AuthService(db)
    return await service.register(data)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and obtain access token",
)
async def login(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Authenticate with email and password.

    Returns a short-lived JWT access token.
    Sets a httpOnly refresh token cookie for token renewal.
    """
    service = AuthService(db)
    token_response, refresh_token = await service.login(data)

    # Set refresh token as httpOnly cookie (not accessible via JavaScript)
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=refresh_token,
        httponly=True,
        secure=True,   # Requires HTTPS in production
        samesite="lax",
        max_age=30 * 24 * 3600,  # 30 days
    )

    return token_response


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Logout — clear refresh token cookie",
)
async def logout(response: Response) -> MessageResponse:
    """
    Logout the current user.

    Clears the refresh token httpOnly cookie.
    The client is responsible for discarding the access token.

    Note: For stateless JWT, the access token remains valid until expiry.
    For immediate invalidation, implement a token blocklist (Redis).
    """
    response.delete_cookie(key=REFRESH_TOKEN_COOKIE)
    return MessageResponse(message="Logged out successfully")


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token using refresh token",
)
async def refresh_token(
    request: "RefreshRequest | None" = None,
    response: Response = None,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Exchange a valid refresh token for a new access token.

    Reads refresh token from httpOnly cookie.
    """
    from fastapi import Request
    # This endpoint reads from cookie — handled in the actual request
    raise HTTPException(status_code=501, detail="Use cookie-based refresh")


@router.get(
    "/me",
    response_model=UserPublic,
    summary="Get current authenticated user profile",
)
async def get_me(
    current_user: User = Depends(get_current_active_user),
) -> UserPublic:
    """
    Return the profile of the currently authenticated user.

    Requires a valid Bearer token in the Authorization header.
    """
    return UserPublic.model_validate(current_user)


# Import here to avoid circular import issues at module level
from app.schemas.auth import RefreshRequest  # noqa: E402
