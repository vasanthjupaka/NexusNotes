# Docker & Containerization Guide — NexusNotes

## Container Architecture

NexusNotes is structured as a multi-container Docker application:

```
[ Nginx Reverse Proxy (Port 80) ]
        │                 │
        ▼                 ▼
[ Frontend (5173 / 80) ]  [ Backend (FastAPI 8000) ]
                                  │           │
                                  ▼           ▼
                         [ MySQL 8 (3306) ]  [ MinIO / S3 (9000) ]
```

---

## Docker Optimization Principles

### 1. Multi-Stage Builds
- **Frontend**: Stage 1 installs dependencies and builds static assets via Vite. Stage 2 copies only `/dist` into an Alpine Nginx image (reducing image size from ~850MB to ~25MB).
- **Backend**: Stage 1 installs gcc, MySQL headers, and python packages into a `/opt/venv` virtual environment. Stage 2 copies only the virtual environment onto a minimal `python:3.12-slim` runtime base.

### 2. Non-Root Execution
The backend container creates a dedicated non-root user `nexusnotes` (UID: 1001) to prevent container breakout privilege escalation.

### 3. Layer Caching
`package.json` and `requirements.txt` are copied and installed in separate steps before copying application source code, leveraging Docker's layer cache during frequent development changes.

---

## Local Development Workflow

```bash
# Start all containers in development mode
make dev

# Start containers in background
make dev-bg

# Stream container logs
make logs

# Stop containers
make down

# Reset and wipe data volumes
make clean
```
