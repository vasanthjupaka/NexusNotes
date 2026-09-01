"""
NexusNotes Backend — Security Utilities

JWT token creation/validation and password hashing using bcrypt.

Security principles applied here:
- Passwords are NEVER stored in plaintext
- Tokens have explicit expiry times
- Token verification fails fast and loudly
- No secrets are logged
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()

# ──────────────────────────────────────────────────────────────────────────────
# Password Hashing
# ──────────────────────────────────────────────────────────────────────────────

# bcrypt is intentionally slow to make brute-force attacks expensive
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """
    Hash a plaintext password using bcrypt.

    The salt is automatically generated and embedded in the hash.
    """
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against a stored bcrypt hash.

    Constant-time comparison prevents timing attacks.
    """
    return pwd_context.verify(plain_password, hashed_password)


# ──────────────────────────────────────────────────────────────────────────────
# JWT Tokens
# ──────────────────────────────────────────────────────────────────────────────

TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"


def create_access_token(
    subject: str | int,
    additional_claims: dict[str, Any] | None = None,
) -> str:
    """
    Create a short-lived JWT access token.

    Args:
        subject: The token subject — typically the user ID.
        additional_claims: Extra claims to embed (e.g., email, roles).

    Returns:
        Signed JWT string.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.jwt_access_token_expire_minutes)

    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": TOKEN_TYPE_ACCESS,
        "iat": now,
        "exp": expire,
    }

    if additional_claims:
        payload.update(additional_claims)

    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def create_refresh_token(subject: str | int) -> str:
    """
    Create a long-lived JWT refresh token.

    Refresh tokens should be stored in httpOnly cookies.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.jwt_refresh_token_expire_days)

    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": TOKEN_TYPE_REFRESH,
        "iat": now,
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT token.

    Raises:
        JWTError: If the token is invalid, expired, or tampered with.
    """
    return jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
    )


def get_token_subject(token: str) -> str:
    """
    Extract the subject (user ID) from a valid token.

    Raises:
        JWTError: If the token is invalid.
    """
    payload = decode_token(token)
    subject = payload.get("sub")
    if not subject:
        raise JWTError("Token missing subject claim")
    return subject


def verify_token_type(token: str, expected_type: str) -> dict[str, Any]:
    """
    Decode a token and verify it is the expected type (access or refresh).

    Raises:
        JWTError: If invalid or wrong type.
    """
    payload = decode_token(token)
    token_type = payload.get("type")
    if token_type != expected_type:
        raise JWTError(f"Expected {expected_type} token, got {token_type}")
    return payload
