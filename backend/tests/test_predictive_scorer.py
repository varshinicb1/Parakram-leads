"""Tests for predictive scorer."""

import pytest
from app.services.predictive_scorer import compute_predictive_score
from app.models.lead import Lead


@pytest.mark.asyncio
async def test_compute_predictive_score_basic_lead():
    """Basic lead should get baseline scores."""
    lead = Lead(
        business_name="Basic Shop",
        industry="retail",
        website_exists=True,
        mobile_responsive=False,
        ssl_present=False,
        phone="1234567890",
    )
    result = await compute_predictive_score(lead)
    assert 0 <= result["overall_quality"] <= 100
    assert 0 <= result["conversion_probability"] <= 1
    assert result["optimal_channel"] in ["email", "whatsapp", "linkedin"]
    assert "urgency_label" in result
    assert result["refined_deal_value"] >= 0


@pytest.mark.asyncio
async def test_compute_predictive_score_premium_lead():
    """Premium digital business should score high."""
    lead = Lead(
        business_name="Digital Pro",
        industry="technology",
        website_exists=True,
        mobile_responsive=True,
        ssl_present=True,
        gbp_complete=True,
        social_media_active=True,
        has_booking_system=True,
        has_lead_form=True,
        has_crm_indicators=True,
        has_analytics=True,
        has_whatsapp=True,
        review_count=50,
        rating=4.8,
    )
    result = await compute_predictive_score(lead)
    assert result["overall_quality"] >= 70
    assert result["digital_readiness"] >= 70
    assert result["conversion_probability"] >= 0.3
    assert result["refined_deal_value"] >= 500


@pytest.mark.asyncio
async def test_compute_predictive_score_no_website():
    """Business with no website should have low digital readiness."""
    lead = Lead(
        business_name="Old School",
        industry="manufacturing",
        website_exists=False,
        phone="1234567890",
    )
    result = await compute_predictive_score(lead)
    assert result["digital_readiness"] < 40
    assert result["optimal_channel"] == "whatsapp"
    assert result["urgency"] >= 50  # Should be urgent to get online


@pytest.mark.asyncio
async def test_compute_predictive_score_high_urgency():
    """High urgency leads should trigger ASAP response."""
    lead = Lead(
        business_name="Urgent Care",
        industry="healthcare",
        website_exists=False,
        phone="1234567890",
        review_count=5,
        rating=3.5,
    )
    result = await compute_predictive_score(lead)
    assert result["urgency"] >= 75
    assert result["urgency_label"] == "ASAP"


@pytest.mark.asyncio
async def test_compute_predictive_score_scores_are_bounded():
    """All scores should be within 0-100 range."""
    lead = Lead(
        business_name="Test Business",
        industry="services",
        website_exists=True,
        mobile_responsive=True,
        ssl_present=True,
        gbp_complete=True,
        social_media_active=True,
        has_booking_system=True,
        has_lead_form=True,
        has_crm_indicators=True,
        has_analytics=True,
        has_whatsapp=True,
        review_count=100,
        rating=5.0,
    )
    result = await compute_predictive_score(lead)
    assert 0 <= result["digital_readiness"] <= 100
    assert 0 <= result["intent_signals"] <= 100
    assert 0 <= result["business_health"] <= 100
    assert 0 <= result["competitive_pressure"] <= 100
    assert 0 <= result["reply_likelihood"] <= 100
    assert 0 <= result["overall_quality"] <= 100
    assert 0 <= result["conversion_probability"] <= 1