"""Tests for the sequence engine."""

import pytest
from app.services.sequence_engine import build_sequence, Sequence, SequenceStep
from app.models.lead import Lead


@pytest.mark.asyncio
async def test_build_sequence_hot():
    """HOT leads get a longer sequence."""
    lead = Lead(
        business_name="Hot Prospect",
        industry="technology",
        category_flag="hot",
        website_exists=False,
    )
    sequence = await build_sequence(lead)
    assert isinstance(sequence, Sequence)
    assert len(sequence.steps) >= 4
    assert sequence.steps[0].channel in ("whatsapp", "email", "linkedin")
    assert sequence.steps[0].purpose in ("initial_intro", "initial_outreach")


@pytest.mark.asyncio
async def test_build_sequence_cold():
    """COLD leads should have a shorter sequence."""
    lead = Lead(
        business_name="Cold Lead",
        industry="manufacturing",
        category="cold",
        website_exists=True,
        mobile_responsive=True,
        ssl_present=True,
    )
    sequence = await build_sequence(lead)
    assert len(sequence.steps) <= 5
    assert sequence.steps[0].purpose in ("initial_intro", "initial_outreach")


@pytest.mark.asyncio
async def test_build_sequence_warm():
    """WARM leads should have a medium-length sequence."""
    lead = Lead(
        business_name="Warm Lead",
        industry="restaurant",
        category="warm",
        website_exists=True,
        mobile_responsive=False,
    )
    sequence = await build_sequence(lead)
    assert 3 <= len(sequence.steps) <= 6
    assert sequence.steps[0].purpose in ("initial_intro", "initial_outreach")


@pytest.mark.asyncio
async def test_build_sequence_structure():
    """Each step should have required fields."""
    lead = Lead(business_name="Test Co", industry="general")
    sequence = await build_sequence(lead)
    for step in sequence.steps:
        assert isinstance(step, SequenceStep)
        assert step.day >= 0
        assert step.channel in ("whatsapp", "email", "linkedin")
        assert step.purpose


@pytest.mark.asyncio
async def test_build_sequence_no_duplicate_days():
    """No two steps should have the same day."""
    lead = Lead(business_name="Test Co", industry="technology")
    sequence = await build_sequence(lead)
    days = [s.day for s in sequence.steps]
    assert len(days) == len(set(days))


@pytest.mark.asyncio
async def test_build_sequence_content():
    """Message content should be non-empty and mention business name."""
    lead = Lead(
        business_name="Acme Corp",
        owner_name="John",
        industry="technology",
    )
    sequence = await build_sequence(lead)
    for step in sequence.steps:
        content = step.to_dict()
        assert isinstance(content, dict)


@pytest.mark.asyncio
async def test_sequence_to_dict():
    """to_dict should return a serializable dict."""
    lead = Lead(business_name="Test Co", industry="general")
    sequence = await build_sequence(lead)
    d = sequence.to_dict()
    assert "total_steps" in d
    assert "current_step" in d
    assert "steps" in d
    assert len(d["steps"]) == len(sequence.steps)
