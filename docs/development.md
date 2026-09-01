# Local Development Guide — NexusNotes

## Prerequisites
- Docker & Docker Compose v2+
- Make
- Python 3.12+ (optional for local outside-container dev)
- Node.js 20 LTS (optional for local outside-container dev)

---

## Quick Start (Recommended — Docker)

```bash
# 1. Setup environment configuration
make setup

# 2. Start full development stack with hot reload
make dev

# 3. Seed database with initial notes & graph
make seed
```

---

## Service URLs

| Service | URL | Description |
|---|---|---|
| **Frontend Application** | `http://localhost:5173` or `http://localhost` | React SPA with HMR |
| **Backend API** | `http://localhost:8000` | FastAPI application |
| **Interactive API Docs**| `http://localhost:8000/docs` | Swagger / OpenAPI UI |
| **MinIO Console** | `http://localhost:9001` | Local S3 management dashboard |

---

## Testing & Code Quality Commands

```bash
# Run all automated tests (backend + frontend)
make test

# Run code linters (Ruff + ESLint)
make lint

# Automatically format all codebases (Black + Prettier)
make format
```
