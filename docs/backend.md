# Backend Architecture — NexusNotes

## Technology Stack

- **Framework**: Python 3.12+ with FastAPI
- **Database ORM**: SQLAlchemy 2 (async with `aiomysql`)
- **Schema Validation & Configuration**: Pydantic 2 + `pydantic-settings`
- **Database Driver**: `aiomysql` (async runtime) + `pymysql` (sync migrations)
- **Migrations**: Alembic
- **Security & Cryptography**: `passlib[bcrypt]` + `python-jose[cryptography]`
- **AWS SDK**: `boto3` (IAM-role compatible)
- **Testing**: Pytest + `pytest-asyncio` + `httpx`

---

## Directory Structure & Layer Responsibilities

```
backend/app/
├── api/v1/          # Route definitions (HTTP verbs, request/response schemas, status codes)
│   ├── auth.py
│   ├── notes.py
│   ├── folders.py
│   ├── tags.py
│   ├── attachments.py
│   ├── search.py
│   └── graph.py
├── core/            # Central cross-cutting utilities
│   ├── config.py    # Type-safe environment settings
│   ├── security.py  # Bcrypt hashing, JWT encode/decode
│   ├── logging.py   # Structlog JSON loggers
│   └── middleware.py# Request ID injection, latency timing, centralized error handler
├── db/              # Engine, sessionmaker, and declarative base
├── models/          # SQLAlchemy ORM class definitions (8 tables)
├── schemas/         # Pydantic request / response schemas
├── repositories/    # Data access layer (SQLAlchemy select/insert/update/delete)
├── services/        # Business logic (wiki parsing, S3 handler, revision tracking)
└── dependencies/    # FastAPI Depends() providers (JWT auth guard, DB session, pagination)
```

---

## Security Architecture

1. **Password Storage**: Passwords are hashed using bcrypt with salt. Plaintext passwords never touch database logs or responses.
2. **Stateless JWT Tokens**:
   - Access tokens (60 min expiry) passed via standard `Authorization: Bearer <token>` headers.
   - Refresh tokens (30 days expiry) issued in `httpOnly` secure cookies.
3. **No Hardcoded Credentials**: Database connection strings, JWT secrets, and AWS bucket keys are read exclusively from environment variables.
4. **Structured Error Masking**: Centralized ASGI error middleware intercepts unhandled exceptions, logs full stack traces internally to CloudWatch, and returns sanitized JSON responses (`{"error": "internal_server_error"}`) to prevent information disclosure.
