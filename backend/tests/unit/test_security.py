"""
Unit tests for security utilities (password hashing, JWT creation & verification).
"""

import pytest
from jose import JWTError

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_token_subject,
    hash_password,
    verify_password,
    TOKEN_TYPE_ACCESS,
    TOKEN_TYPE_REFRESH,
)


def test_password_hashing():
    raw_password = "SuperSecretPassword123!"
    hashed = hash_password(raw_password)

    assert hashed != raw_password
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_access_token_creation_and_decoding():
    user_id = 42
    token = create_access_token(user_id)
    payload = decode_token(token)

    assert payload["sub"] == str(user_id)
    assert payload["type"] == TOKEN_TYPE_ACCESS
    assert "exp" in payload
    assert get_token_subject(token) == str(user_id)


def test_refresh_token_type():
    user_id = 100
    token = create_refresh_token(user_id)
    payload = decode_token(token)

    assert payload["sub"] == str(user_id)
    assert payload["type"] == TOKEN_TYPE_REFRESH


def test_invalid_token_decoding():
    with pytest.raises(JWTError):
        decode_token("invalid.jwt.token")
