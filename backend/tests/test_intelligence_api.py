"""Integration tests for the intelligence API endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dashboard_endpoint(async_client: AsyncClient, auth_headers: dict, test_organization):
    """Dashboard should return expected structure."""
    headers = {**auth_headers, "X-Organization-ID": str(test_organization.id)}
    response = await async_client.get("/api/v1/messages/dashboard", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_leads" in data
    assert "hot_leads" in data
    assert "warm_leads" in data
    assert "cold_leads" in data
    assert "pipeline_counts" in data
    assert "high_priority_leads" in data
    assert "avg_quality_score" in data
    assert "avg_conversion_probability" in data


@pytest.mark.asyncio
async def test_health_endpoint(async_client: AsyncClient):
    """Health endpoint should return OK."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_lead_crud(async_client: AsyncClient, auth_headers: dict, test_organization):
    """Should create, list, and retrieve a lead."""
    headers = {**auth_headers, "X-Organization-ID": str(test_organization.id)}

    create_resp = await async_client.post(
        "/api/v1/leads",
        headers=headers,
        json={
            "business_name": "Test Lead",
            "phone": "+919876543210",
            "industry": "technology",
            "location": "Mumbai",
        },
    )
    assert create_resp.status_code == 201
    lead = create_resp.json()
    assert lead["business_name"] == "Test Lead"
    lead_id = lead["id"]

    list_resp = await async_client.get("/api/v1/leads", headers=headers)
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] >= 1

    get_resp = await async_client.get(f"/api/v1/leads/{lead_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == lead_id


@pytest.mark.asyncio
async def test_intelligence_endpoints_require_auth(async_client: AsyncClient):
    """Intelligence endpoints should reject unauthenticated requests."""
    response = await async_client.get("/api/v1/intelligence/predict/00000000-0000-0000-0000-000000000000")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_intelligence_predict(async_client: AsyncClient, auth_headers: dict, test_organization):
    """Predict endpoint should return scores for a lead."""
    headers = {**auth_headers, "X-Organization-ID": str(test_organization.id)}

    create = await async_client.post(
        "/api/v1/leads", headers=headers,
        json={"business_name": "Test Co", "phone": "+919000000001", "industry": "technology"},
    )
    lead_id = create.json()["id"]

    response = await async_client.get(f"/api/v1/intelligence/predict/{lead_id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "prediction" in data
    assert data["prediction"]["quality_score"] >= 0
    assert data["prediction"]["conversion_probability"] >= 0


@pytest.mark.asyncio
async def test_intelligence_sequence(async_client: AsyncClient, auth_headers: dict, test_organization):
    """Sequence endpoint should return an outreach sequence."""
    headers = {**auth_headers, "X-Organization-ID": str(test_organization.id)}

    create = await async_client.post(
        "/api/v1/leads", headers=headers,
        json={"business_name": "Seq Co", "phone": "+919000000002", "industry": "restaurant"},
    )
    lead_id = create.json()["id"]

    response = await async_client.get(f"/api/v1/intelligence/sequence/{lead_id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "sequence" in data
    assert len(data["sequence"]["steps"]) >= 3


@pytest.mark.asyncio
async def test_intelligence_analyze_response(async_client: AsyncClient, auth_headers: dict):
    """Response analysis should return sentiment and intent."""
    response = await async_client.post(
        "/api/v1/intelligence/analyze-response",
        headers=auth_headers,
        json={"reply_text": "This looks great! Can you schedule a call?", "lead_name": "Test"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sentiment"] in ("positive", "neutral", "negative")
    assert data["intent"] in (
        "meeting_request", "pricing_inquiry", "information_request",
        "objection", "positive_interest", "unknown",
    )
    assert 0 <= data["urgency"] <= 100


@pytest.mark.asyncio
async def test_audit_endpoint_requires_admin(async_client: AsyncClient, auth_headers: dict):
    """Audit endpoint should require admin role."""
    response = await async_client.get("/api/v1/audit", headers=auth_headers)
    assert response.status_code in (401, 403)
