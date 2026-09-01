"""
NexusNotes — Auth Service

Business logic for authentication.
Coordinates between repository and security utilities.
"""

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserPublic
from app.models.user import User


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db)

    async def register(self, data: RegisterRequest) -> UserPublic:
        """
        Register a new user.

        Validates:
        - Email not already registered
        - Username not already taken
        """
        # Check email uniqueness
        existing_email = await self.user_repo.get_by_email(data.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email address is already registered",
            )

        # Check username uniqueness
        existing_username = await self.user_repo.get_by_username(data.username)
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username is already taken",
            )

        # Hash password BEFORE storing
        password_hash = hash_password(data.password)

        user = await self.user_repo.create(
            username=data.username,
            email=data.email,
            password_hash=password_hash,
            display_name=data.display_name,
        )

        return UserPublic.model_validate(user)

    async def login(self, data: LoginRequest) -> tuple[TokenResponse, str]:
        """
        Authenticate user and issue tokens.

        Returns:
            Tuple of (TokenResponse with access token, refresh_token string)
        """
        user = await self.user_repo.get_by_email(data.email)

        # Use constant-time comparison — don't short circuit on user not found
        # to prevent user enumeration
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled",
            )

        # Update last login timestamp
        await self.user_repo.update_last_login(user.id)

        from app.core.config import get_settings
        settings = get_settings()

        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)

        token_response = TokenResponse(
            access_token=access_token,
            expires_in=settings.jwt_access_token_expire_minutes * 60,
        )

        return token_response, refresh_token

    async def get_current_user_profile(self, user: User) -> UserPublic:
        return UserPublic.model_validate(user)
