"""Predictive scoring engine for lead intelligence."""

from app.models.lead import Lead, LeadCategory, LeadStatus

# === DIMENSION 1: DIGITAL READINESS (0-100) ===
# How digitally mature is the business? (Lower = more opportunity)
DIGITAL_WEIGHTS = {
    "website_exists": 15,
    "website_quality": 20,
    "mobile_responsive": 10,
    "ssl_present": 10,
    "gbp_complete": 15,
    "social_media_active": 10,
    "has_booking_system": 10,
    "has_lead_form": 10,
    "has_crm_indicators": 10,
    "has_analytics": 10,
    "has_whatsapp": 5,
    "email_domain_quality": 5,
    "review_count_bonus": 5,
    "rating_bonus": 5,
}

# === DIMENSION 2: INTENT SIGNALS (0-100) ===
# Based on patterns that correlate with buying intent
INTENT_SIGNALS = {
    "has_outdated_website": 15,
    "high_reviews_low_tech": 20,
    "growing_industry": 10,
    "competitor_has_presence": 15,
    "no_booking_system": 10,
    "no_lead_form": 10,
    "no_analytics": 10,
    "no_social_media": 10,
    "has_phone_but_no_website": 20,
}

# === DIMENSION 3: BUSINESS HEALTH (0-100) ===
# Based on ratings, reviews, and business fundamentals
HEALTH_WEIGHTS = {
    "high_rating": 20,
    "many_reviews": 15,
    "medium_or_large_business": 10,
    "has_phone_verified": 5,
    "has_email_verified": 5,
    "social_media_activity_score": 5,
}

# === DIMENSION 5: REPLY LIKELIHOOD (0-100) ===
# Based on patterns that correlate with response rates
REPLY_PATTERNS = {
    "has_phone": 10,
    "has_email": 10,
    "has_social_media": 5,
    "recently_reviewed": 8,        # Active in last 30 days
    "business_hours_listed": 5,    # Professional operation
    "verified_listing": 10,        # Active on directories
    "multiple_reviews_recent": 12, # Engaged with customers recently
    "owner_responds_to_reviews": 15, # Already cares about customer feedback
    "has_website_contact_form": 10, # Open to inquiry
    "google_business_posts": 15,   # Actively managing their GBP
}

# === INDUSTRY-SPECIFIC DIGITAL URGENCY ===
# How urgent is digital transformation for each industry? (0-100)
INDUSTRY_DIGITAL_URGENCY = {
    "restaurant": 85,
    "cafe": 80,
    "retail": 75,
    "healthcare": 70,
    "beauty": 70,
    "fitness": 65,
    "real estate": 60,
    "education": 60,
    "legal": 55,
    "accounting": 55,
    "consulting": 50,
    "manufacturing": 45,
    "construction": 40,
    "wholesale": 35,
    "agriculture": 30,
    "farming": 30,
    "fishery": 25,
}


async def compute_predictive_score(lead: Lead) -> dict:
    """
    Compute a multi-dimensional predictive score for any lead.
    Returns detailed breakdown including conversion probability,
    optimal channel, estimated deal value, and urgency.
    """
    scores = {}

    # Dimension 1: Digital Readiness
    scores["digital_readiness"] = _calc_digital_readiness(lead)

    # Dimension 2: Intent Signals
    scores["intent_signals"] = _calc_intent_signals(lead)

    # Dimension 3: Business Health
    scores["business_health"] = _calc_business_health(lead)

    # Dimension 4: Competitive Pressure
    scores["competitive_pressure"] = _calc_competitive_pressure(lead)

    # Dimension 5: Reply Likelihood
    scores["reply_likelihood"] = _calc_reply_likelihood(lead)

    # Calculate overall quality (0-100)
    weights = {
        "digital_readiness": 0.35,
        "intent_signals": 0.15,
        "business_health": 0.25,
        "competitive_pressure": 0.10,
        "reply_likelihood": 0.15,
    }
    quality = sum(scores[key] * weights[key] for key in weights)

    # Conversion probability (0-1) - derived from overall quality
    conversion_prob = quality / 100.0 * 0.6  # Base conversion rate

    # Determine optimal channel based on scores and lead data
    optimal_channel = _predict_best_channel(lead, scores)

    # Calculate urgency (0-100)
    urgency = _calculate_urgency(lead, scores)

    # Refine deal value based on business attributes
    refined_value = _refine_deal_value(lead, quality)

    # Best time to contact
    best_time = _predict_best_time(lead)

    # Recommended sequence length
    sequence_length = _recommend_sequence_length(urgency)

    return {
        "overall_quality": round(quality, 1),
        "conversion_probability": round(conversion_prob, 3),
        "digital_readiness": round(scores["digital_readiness"], 1),
        "intent_signals": round(scores["intent_signals"], 1),
        "business_health": round(scores["business_health"], 1),
        "competitive_pressure": round(scores["competitive_pressure"], 1),
        "reply_likelihood": round(scores["reply_likelihood"], 1),
        "optimal_channel": optimal_channel,
        "urgency": urgency,
        "urgency_label": "ASAP" if urgency >= 75 else "Today" if urgency >= 50 else "This Week" if urgency >= 25 else "Monitor",
        "refined_deal_value": round(refined_value, 2),
        "best_contact_time": best_time,
        "recommended_sequence_length": sequence_length,
        "breakdown": scores,
    }


def _calc_digital_readiness(lead: Lead) -> float:
    """How digitally mature is this business? Low score = more opportunity for us."""
    score = 0.0
    if lead.website_exists:
        score += DIGITAL_WEIGHTS["website_exists"]
    score += (lead.website_quality_score or 0) / 100 * DIGITAL_WEIGHTS["website_quality"]
    if lead.mobile_responsive:
        score += DIGITAL_WEIGHTS["mobile_responsive"]
    if lead.ssl_present:
        score += DIGITAL_WEIGHTS["ssl_present"]
    if lead.gbp_complete:
        score += DIGITAL_WEIGHTS["gbp_complete"]
    if lead.social_media_active:
        score += DIGITAL_WEIGHTS["social_media_active"]
    if lead.has_booking_system:
        score += DIGITAL_WEIGHTS["has_booking_system"]
    if lead.has_lead_form:
        score += DIGITAL_WEIGHTS["has_lead_form"]
    if lead.has_crm_indicators:
        score += DIGITAL_WEIGHTS["has_crm_indicators"]
    if lead.has_analytics:
        score += DIGITAL_WEIGHTS["has_analytics"]
    if lead.has_whatsapp:
        score += DIGITAL_WEIGHTS["has_whatsapp"]
    score += (lead.email_domain_quality or 0) * DIGITAL_WEIGHTS["email_domain_quality"]
    if (lead.review_count or 0) > 20:
        score += DIGITAL_WEIGHTS["review_count_bonus"]
    if (lead.rating or 0) > 4.0:
        score += DIGITAL_WEIGHTS["rating_bonus"]
    return min(score, 100.0)


def _calc_intent_signals(lead: Lead) -> float:
    """Detect signals that indicate buying intent."""
    score = 0.0

    # Outdated website = likely to upgrade
    if lead.website_exists and lead.website_quality_score and lead.website_quality_score < 30:
        score += INTENT_SIGNALS["has_outdated_website"]

    # High reviews but low tech adoption
    if (lead.review_count or 0) > 15 and (lead.rating or 0) > 4.0 and not lead.has_booking_system:
        score += INTENT_SIGNALS["high_reviews_low_tech"]

    # Growing industry (heuristic based on category)
    if lead.industry:
        industry_lower = lead.industry.lower()
        growing_industries = {"restaurant", "cafe", "healthcare", "fitness", "real estate", "construction", "education"}
        if industry_lower in growing_industries:
            score += INTENT_SIGNALS["growing_industry"]

    # Competitor presence check
    if lead.industry and lead.industry.lower() not in ("", "unknown"):
        score += INTENT_SIGNALS["competitor_has_presence"]

    # Missing critical features
    if not lead.has_booking_system:
        score += INTENT_SIGNALS["no_booking_system"]
    if not lead.has_lead_form:
        score += INTENT_SIGNALS["no_lead_form"]
    if not lead.has_analytics:
        score += INTENT_SIGNALS["no_analytics"]
    if not lead.social_media_active:
        score += INTENT_SIGNALS["no_social_media"]

    # Has phone but no website = huge gap
    if lead.phone and not lead.website_exists:
        score += INTENT_SIGNALS["has_phone_but_no_website"]

    # Advanced digital presence = ready for premium services
    advanced_features = sum([
        bool(lead.has_crm_indicators),
        bool(lead.has_analytics),
        bool(lead.has_booking_system),
        bool(lead.has_lead_form),
        bool(lead.gbp_complete),
        bool(lead.social_media_active),
    ])
    if advanced_features >= 5:
        score += 20
    elif advanced_features >= 3:
        score += 12

    return min(score, 100.0)


def _calc_business_health(lead: Lead) -> float:
    """How healthy is this business overall?"""
    score = 15.0  # baseline
    if lead.rating is not None:
        if lead.rating >= 4.5:
            score += HEALTH_WEIGHTS["high_rating"]
        elif lead.rating >= 4.0:
            score += HEALTH_WEIGHTS["high_rating"] * 0.7

    if lead.review_count is not None:
        if lead.review_count > 100:
            score += HEALTH_WEIGHTS["many_reviews"]
        elif lead.review_count > 40:
            score += HEALTH_WEIGHTS["many_reviews"] * 0.8
        elif lead.review_count > 30:
            score += HEALTH_WEIGHTS["many_reviews"] * 0.6

    if lead.business_size_estimate:
        size = lead.business_size_estimate.lower()
        if size in ("medium", "large", "enterprise"):
            score += HEALTH_WEIGHTS["medium_or_large_business"]
        else:
            score += HEALTH_WEIGHTS["medium_or_large_business"] * 0.4

    if lead.phone:
        score += HEALTH_WEIGHTS["has_phone_verified"]
    if lead.email:
        score += HEALTH_WEIGHTS["has_email_verified"]
    if lead.social_profiles and len(lead.social_profiles) > 0:
        score += HEALTH_WEIGHTS["social_media_activity_score"]
    if lead.gbp_complete:
        score += 8
    if lead.social_media_active:
        score += 7

    return min(score, 100.0)


def _calc_competitive_pressure(lead: Lead) -> float:
    """How much competitive pressure exists in this industry?"""
    if not lead.industry:
        return 50.0
    industry_key = lead.industry.lower().strip()
    for key, urgency in INDUSTRY_DIGITAL_URGENCY.items():
        if key in industry_key or industry_key in key:
            return float(urgency)
    return 60.0  # default moderate pressure


def _calc_reply_likelihood(lead: Lead) -> float:
    """How likely is this lead to reply to outreach?"""
    score = 10.0  # baseline
    if lead.phone:
        score += REPLY_PATTERNS["has_phone"]
    if lead.email:
        score += REPLY_PATTERNS["has_email"]
    if lead.social_media_active:
        score += REPLY_PATTERNS["has_social_media"]
    if (lead.rating or 0) > 3.5 and (lead.review_count or 0) > 5:
        score += REPLY_PATTERNS["recently_reviewed"]
    if lead.has_lead_form:
        score += REPLY_PATTERNS["has_website_contact_form"]
    if lead.gbp_complete:
        score += REPLY_PATTERNS["verified_listing"]
    if lead.website_exists and (lead.website_quality_score or 0) > 50:
        score += REPLY_PATTERNS["has_website_contact_form"]
    if (lead.review_count or 0) > 20:
        score += REPLY_PATTERNS["multiple_reviews_recent"]
    if lead.business_description and len(lead.business_description or "") > 50:
        score += REPLY_PATTERNS["owner_responds_to_reviews"] * 0.5
    return min(score, 100.0)


def _refine_deal_value(lead: Lead, quality_score: float) -> float:
    """Refine estimated deal value based on business attributes."""
    base_value = 1000.0  # Base deal value in USD

    # Industry multiplers
    industry_multipliers = {
        "technology": 3.0,
        "finance": 2.5,
        "healthcare": 2.0,
        "real estate": 2.0,
        "construction": 1.8,
        "manufacturing": 1.5,
        "retail": 1.5,
        "restaurant": 1.2,
        "hospitality": 1.2,
        "services": 1.0,
    }

    industry = (lead.industry or "").lower()
    multiplier = 1.0
    for ind, mult in industry_multipliers.items():
        if ind in industry:
            multiplier = mult
            break

    # Size multiplier
    size_multipliers = {
        "startup": 0.5,
        "small": 1.0,
        "medium": 2.0,
        "large": 3.0,
        "enterprise": 5.0,
    }
    size = (lead.business_size_estimate or "").lower()
    size_mult = size_multipliers.get(size, 1.0)

    # Quality adjustment (better quality = higher value they can afford)
    quality_factor = 0.5 + (quality_score / 100) * 1.5  # 0.5 to 2.0

    # Digital maturity adjustment (more mature = can afford more sophisticated solutions)
    digital_factor = 0.5 + (quality_score / 100) * 1.5  # 0.5 to 2.0

    final_value = base_value * multiplier * size_mult * quality_factor * digital_factor
    return max(final_value, 500.0)  # Minimum  deal value


def _predict_best_time(lead: Lead) -> str:
    """Predict best time to contact based on business type."""
    # Simple heuristic - can be enhanced with real data
    if not lead.industry:
        return "Weekday 10am-2pm"

    industry = lead.industry.lower()
    if any(x in industry for x in ["restaurant", "cafe", "food", "hospitality"]):
        return "Weekday 2pm-4pm or 7pm-9pm"
    elif any(x in industry for x in ["retail", "shop", "store"]):
        return "Weekday 11am-1pm or 4pm-6pm"
    elif any(x in industry for x in ["professional", "consulting", "finance", "legal"]):
        return "Weekday 10am-11am or 2pm-4pm"
    elif any(x in industry for x in ["healthcare", "medical", "clinic", "hospital"]):
        return "Weekday 9am-11am or 3pm-5pm"
    else:
        return "Weekday 10am-12pm"


def _predict_best_channel(lead: Lead, scores: dict) -> str:
    """Predict which channel is most likely to get a response."""
    channel_scores = {"whatsapp": 0, "email": 0, "linkedin": 0}

    # WhatsApp is best for phone-heavy, service businesses
    if lead.phone:
        channel_scores["whatsapp"] += 40
    if lead.has_whatsapp:
        channel_scores["whatsapp"] += 20
    if lead.industry and any(x in lead.industry.lower() for x in ["restaurant", "retail", "service", "beauty", "fitness"]):
        channel_scores["whatsapp"] += 20

    # Email is best for professional, B2B, and tech businesses
    if lead.email:
        channel_scores["email"] += 30
    if lead.has_lead_form:
        channel_scores["email"] += 20
    if lead.industry and any(x in lead.industry.lower() for x in ["tech", "software", "consulting", "finance", "legal", "healthcare"]):
        channel_scores["email"] += 20
    if lead.has_analytics:
        channel_scores["email"] += 15

    # LinkedIn is best for B2B and professional services
    if lead.industry and any(x in lead.industry.lower() for x in ["b2b", "enterprise", "consulting", "finance", "legal", "technology"]):
        channel_scores["linkedin"] += 30
    if lead.social_profiles and lead.social_profiles.get("linkedin"):
        channel_scores["linkedin"] += 20
    if getattr(lead, 'website', None) and hasattr(lead, 'website_quality_score') and getattr(lead, 'website_quality_score', 0) > 60:
        channel_scores["linkedin"] += 15

    # Adjust based on reply likelihood score
    reply_score = scores.get("reply_likelihood", 50)
    if reply_score > 70:
        # High reply likelihood - amplify the strongest channel
        max_channel = max(channel_scores, key=channel_scores.get)
        channel_scores[max_channel] *= 1.5
    elif reply_score < 30:
        # Low reply likelihood - be more balanced
        for ch in channel_scores:
            channel_scores[ch] *= 0.8

    return max(channel_scores, key=channel_scores.get)


def _calculate_urgency(lead: Lead, scores: dict) -> float:
    """Calculate urgency score (0-100) based on business signals."""
    urgency = 30.0  # base urgency

    # Digital readiness inversely related to urgency (less digital = more urgent)
    digital_readiness = scores.get("digital_readiness", 50)
    urgency += (50 - digital_readiness) * 0.4  # up to +20

    # Intent signals increase urgency
    intent_signals = scores.get("intent_signals", 0)
    urgency += intent_signals * 0.3  # up to +6

    # Business health - unhealthy businesses may be more urgent to help
    business_health = scores.get("business_health", 50)
    if business_health < 40:
        urgency += (40 - business_health) * 0.2  # up to +8

    # Competitive pressure
    competitive_pressure = scores.get("competitive_pressure", 50)
    if competitive_pressure > 60:
        urgency += (competitive_pressure - 60) * 0.2  # up to +8

    # Reply likelihood - more likely to reply = more urgent to contact now
    reply_likelihood = scores.get("reply_likelihood", 50)
    if reply_likelihood > 60:
        urgency += (reply_likelihood - 60) * 0.2  # up to +8

    # Industry-specific urgency
    if lead.industry:
        industry_key = lead.industry.lower().strip()
        for key, urgency_val in INDUSTRY_DIGITAL_URGENCY.items():
            if key in industry_key or industry_key in key:
                # Blend with calculated urgency
                urgency = urgency * 0.7 + urgency_val * 0.3
                break

    return min(max(urgency, 0), 100)


def _recommend_sequence_length(urgency: float) -> int:
    """Recommend follow-up sequence length based on urgency."""
    if urgency >= 75:
        return 5  # High urgency = more touches
    elif urgency >= 50:
        return 4  # Medium urgency
    elif urgency >= 25:
        return 3  # Low urgency
    else:
        return 2  # Monitor only
