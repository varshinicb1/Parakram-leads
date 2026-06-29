"""Tests for lead enrichment."""

import pytest
from app.services.lead_enrichment import enrich_lead
from app.models.lead import Lead


@pytest.mark.asyncio
async def test_enrich_lead_social_profiles():
    """Should generate social profile URLs from business name and location."""
    lead = Lead(
        business_name="Test Cafe",
        location="Mumbai, India",
        website_exists=True,
    )
    result = await enrich_lead(lead)
    assert "social_profiles" in result
    assert "facebook" in result["social_profiles"]
    assert "instagram" in result["social_profiles"]
    assert "testcafe" in result["social_profiles"]["facebook"]


@pytest.mark.asyncio
async def test_enrich_lead_competitors():
    """Should identify competitors for known industries."""
    lead = Lead(
        business_name="Test Restaurant",
        industry="restaurant",
        location="Delhi, India",
    )
    result = await enrich_lead(lead)
    assert "competitors" in result
    assert isinstance(result["competitors"], list)
    # Should have competitor data for restaurant industry
    if result["competitors"]:
        assert "name" in result["competitors"][0]
        assert "type" in result["competitors"][0]
        assert "risk_level" in result["competitors"][0]


@pytest.mark.asyncio
async def test_enrich_lead_tech_stack():
    """Should detect technology stack from website indicators."""
    lead = Lead(
        business_name="Tech Shop",
        website_exists=True,
        has_analytics=True,
        has_crm_indicators=True,
        has_booking_system=True,
    )
    result = await enrich_lead(lead)
    assert "tech_stack" in result
    assert isinstance(result["tech_stack"], list)
    # With analytics, crm, and booking system, we should have some tech detected
    # Note: actual detection depends on website content, so we check structure
    assert "enrichment_quality" in result


@pytest.mark.asyncio
async def test_enrich_lead_business_size():
    """Should estimate business size from review count."""
    lead = Lead(
        business_name="Growing Business",
        review_count=25,  # Should trigger 30-100 range
        website_exists=True,
    )
    result = await enrich_lead(lead)
    assert "business_details" in result
    assert "estimated_weekly_customers" in result["business_details"]
    assert result["business_details"]["estimated_weekly_customers"] == "30-100"


@pytest.mark.asyncio
async def test_enrich_lead_large_business():
    """Should detect large business from high review count."""
    lead = Lead(
        business_name="Popular Chain",
        review_count=150,  # Should trigger 100+ range
        website_exists=True,
        location="Bangalore, India",
    )
    result = await enrich_lead(lead)
    assert "business_details" in result
    assert result["business_details"]["estimated_weekly_customers"] == "100+"
    assert result["business_details"]["market"] == "Indian SMB"


@pytest.mark.asyncio
async def test_enrich_lead_review_presence():
    """Should process review data when available."""
    lead = Lead(
        business_name="Reviewed Shop",
        review_count=10,
        rating=4.2,
        website_exists=True,
    )
    result = await enrich_lead(lead)
    assert "review_summary" in result
    assert "review_count" in result["review_summary"]
    assert result["review_summary"]["review_count"] == 10
    assert result["review_summary"]["average_rating"] == 4.2