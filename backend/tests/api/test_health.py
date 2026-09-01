"""
API tests for health and readiness endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_liveness_health_check(client: AsyncClient):
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "NexusNotes" in data["app"]


@pytest.mark.asyncio
async def test_readiness_probe(client: AsyncClient):
    response = await client.get("/api/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert "checks" in data
