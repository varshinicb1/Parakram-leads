"""Tests for response intelligence."""

import pytest
from app.services.response_intelligence import analyze_response


@pytest.mark.asyncio
async def test_analyze_response_meeting_request():
    """Meeting requests should be detected with positive intent."""
    result = await analyze_response(
        "Hi, I'd like to schedule a meeting to discuss your services. Are you available next week?",
        lead_name="John"
    )
    assert result["intent"] == "meeting_request"
    assert result["sentiment_label"] in ("positive", "neutral")
    assert result["urgency"] >= 40
    assert result["suggested_reply_type"] == "schedule_meeting"


@pytest.mark.asyncio
async def test_analyze_response_pricing_inquiry():
    """Pricing questions should be detected."""
    result = await analyze_response(
        "What are your prices for the basic package? Do you offer discounts?",
        lead_name="Sarah"
    )
    assert result["intent"] == "pricing_inquiry"
    assert result["sentiment_label"] in ("positive", "neutral")
    assert result["urgency"] >= 30
    assert result["suggested_reply_type"] == "send_pricing"


@pytest.mark.asyncio
async def test_analyze_response_objection():
    """Objections should be detected as negative sentiment."""
    result = await analyze_response(
        "Your prices are too high and I don't see how this helps my business.",
        lead_name="Mike"
    )
    assert result["intent"] == "objection"
    assert result["sentiment_label"] == "negative"
    assert result["urgency"] >= 50
    assert result["suggested_reply_type"] == "handle_objection"


@pytest.mark.asyncio
async def test_analyze_response_positive_interest():
    """Positive interest should be detected."""
    result = await analyze_response(
        "This looks great! I'm interested in learning more about how it works.",
        lead_name="Lisa"
    )
    assert result["intent"] == "positive_interest"
    assert result["sentiment_label"] == "positive"
    assert result["urgency"] >= 50
    assert result["should_alert"] is True
    assert result["suggested_reply_type"] == "schedule_call"


@pytest.mark.asyncio
async def test_analyze_response_empty_text():
    """Empty or nonsensical text should return neutral."""
    result = await analyze_response("", lead_name="Test")
    assert result["sentiment_label"] == "neutral"
    assert result["intent"] == "information_request"
    assert result["urgency"] == 0
    assert result["suggested_reply_type"] == "follow_up"


@pytest.mark.asyncio
async def test_analyze_response_suggestion_simple():
    """Should provide helpful suggestions for replies."""
    result = await analyze_response(
        "Sounds interesting. What exactly do you offer?",
        lead_name="Alex"
    )
    assert result["suggested_reply_type"] in ("send_info", "value_proposition")
    assert isinstance(result["suggested_reply_type"], str)


@pytest.mark.asyncio
async def test_analyze_response_urgency_detection():
    """High urgency phrases should be detected."""
    result = await analyze_response(
        "I need this today! Can you call me ASAP?",
        lead_name="Urgent"
    )
    assert result["urgency"] >= 70
    assert result["should_alert"] is True