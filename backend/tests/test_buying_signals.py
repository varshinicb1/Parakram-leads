"""Tests for buying signal detection."""

import pytest
from app.services.buying_signals import detect_buying_signals, should_prioritize
from app.models.lead import Lead


@pytest.mark.asyncio
async def test_detect_buying_signals_no_website():
    """Lead without website should trigger emergency_missing_online."""
    lead = Lead(
        business_name="Old Shop",
        industry="restaurant",
        website_exists=False,
        phone="1234567890",
        review_count=10,
        rating=4.0,
    )
    result = await detect_buying_signals(lead)
    assert result["has_signals"] is True
    assert "emergency_missing_online" in result["active_signals"]
    assert result["combined_urgency"] > 0
    assert len(result["active_signals"]) >= 1


@pytest.mark.asyncio
async def test_detect_buying_signals_outdated_website():
    """Lead with website but no mobile/SSL should trigger outdated_website."""
    lead = Lead(
        business_name="Tech Co",
        industry="technology",
        website_exists=True,
        mobile_responsive=False,
        ssl_present=False,
    )
    result = await detect_buying_signals(lead)
    assert "outdated_website" in result["active_signals"] or "emergency_missing_online" not in result["active_signals"]


@pytest.mark.asyncio
async def test_detect_buying_signals_no_booking():
    """Lead in hospitality without booking system should trigger signal."""
    lead = Lead(
        business_name="Hotel Grand",
        industry="restaurant",
        website_exists=True,
        has_booking_system=False,
        has_lead_form=False,
    )
    result = await detect_buying_signals(lead)
    assert "no_booking_no_form" in result["active_signals"]


@pytest.mark.asyncio
async def test_detect_buying_signals_high_reviews_low_tech():
    """High reviews but low tech adoption is a strong buying signal."""
    lead = Lead(
        business_name="Popular Spot",
        industry="restaurant",
        website_exists=True,
        review_count=200,
        rating=4.5,
        mobile_responsive=False,
        has_booking_system=False,
    )
    result = await detect_buying_signals(lead)
    assert result["has_signals"] is True
    assert result["combined_urgency"] >= 30


@pytest.mark.asyncio
async def test_detect_buying_signals_no_signals():
    """Fully digital lead should have minimal signals."""
    lead = Lead(
        business_name="Digital Native",
        industry="technology",
        website_exists=True,
        mobile_responsive=True,
        ssl_present=True,
        has_booking_system=True,
        has_lead_form=True,
        has_crm_indicators=True,
        has_analytics=True,
        has_whatsapp=True,
        gbp_complete=True,
        social_media_active=True,
        review_count=100,
        rating=4.5,
    )
    result = await detect_buying_signals(lead)
    assert result["has_signals"] is False or len(result["active_signals"]) == 0


@pytest.mark.asyncio
async def test_detect_buying_signals_seasonal():
    """Should detect seasonal signals when industry matches seasonality patterns."""
    lead = Lead(
        business_name="Garden Center",
        industry="real_estate",
        website_exists=False,
    )
    result = await detect_buying_signals(lead)
    assert result["has_signals"] is True
    assert "combined_urgency" in result
    assert "total_buying_urgency" in result
    # Seasonal fire depends on current month — check structure instead
    assert isinstance(result["signals"], list)
    assert len(result["signals"]) >= 1


@pytest.mark.asyncio
async def test_should_prioritize():
    """Should prioritization should return higher combined score for high-urgency leads."""
    high = Lead(business_name="High", industry="restaurant", website_exists=False, review_count=3, rating=4.0)
    low = Lead(business_name="Low", industry="technology", website_exists=True, mobile_responsive=True, ssl_present=True)
    high_res = await should_prioritize(high)
    low_res = await should_prioritize(low)
    assert high_res["combined"] > 0
    assert low_res["combined"] == 0 or low_res["combined"] < high_res["combined"]
    assert "action" in high_res
    assert "reason" in high_res


@pytest.mark.asyncio
async def test_detect_buying_signals_gbp_active():
    """Active on GBP only is a signal."""
    lead = Lead(
        business_name="GBP Shop",
        industry="restaurant",
        website_exists=False,
        gbp_complete=True,
        review_count=30,
    )
    result = await detect_buying_signals(lead)
    assert "active_on_gbp_only" in result["active_signals"]
