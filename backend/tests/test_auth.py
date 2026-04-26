import sys
from pathlib import Path

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from api.app import create_app


def authed_client():
    transport = httpx.ASGITransport(app=create_app())
    return httpx.AsyncClient(transport=transport, base_url="http://testserver")


@pytest.mark.asyncio
async def test_health_endpoint_stays_public(monkeypatch):
    monkeypatch.setenv("BITSY_INTERNAL_API_TOKEN", "test-token")

    async with authed_client() as client:
        response = await client.get("/api/health")

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_simulation_endpoints_require_internal_token(monkeypatch):
    monkeypatch.setenv("BITSY_INTERNAL_API_TOKEN", "test-token")

    async with authed_client() as client:
        response = await client.get("/api/simulations/status")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_simulation_endpoints_accept_bearer_token(monkeypatch):
    monkeypatch.setenv("BITSY_INTERNAL_API_TOKEN", "test-token")

    async with authed_client() as client:
        response = await client.get(
            "/api/simulations/status",
            headers={"Authorization": "Bearer test-token"},
        )

    assert response.status_code != 401
