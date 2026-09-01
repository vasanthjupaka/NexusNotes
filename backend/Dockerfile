# =============================================================================
# NexusNotes Backend — Dockerfile (Multi-Stage)
# =============================================================================
# Stage 1: Install Python dependencies
# Stage 2: Production runtime image (minimal, non-root)
# =============================================================================

# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 — Builder: Install dependencies
# ──────────────────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

# Set environment variables for reproducible builds
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system dependencies needed for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies into a virtual environment
# Using a venv makes it easy to copy only installed packages to the final stage
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt


# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 — Runtime: Minimal production image
# ──────────────────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# Install only runtime system dependencies (not build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmysqlclient21 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
# Running as root inside a container is a security risk
RUN groupadd --gid 1001 nexusnotes && \
    useradd --uid 1001 --gid nexusnotes --shell /bin/bash --create-home nexusnotes

WORKDIR /app

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv

# Copy application source
COPY --chown=nexusnotes:nexusnotes . .

# Switch to non-root user
USER nexusnotes

EXPOSE 8000

# Health check — verifies the API is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start with uvicorn
# --workers is set to 1 here for Docker Compose; use Gunicorn with multiple workers for EC2
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
