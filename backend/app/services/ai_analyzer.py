from app.models.lead import Lead
from app.config import settings
from typing import Optional
import json


ANALYSIS_PROMPT = """
You are a senior business consultant analyzing a prospect for digital services.

Business: {business_name}
Industry: {industry}
Category: {category}
Location: {location}
Description: {description}
Rating: {rating}/5
Reviews: {review_count}
Website: {website_url}
Digital Maturity Score: {dm_score}/100
Opportunity Score: {opp_score}/100

Digital Presence Indicators:
- Website exists: {website_exists}
- Website quality: {website_quality}/100
- Mobile responsive: {mobile_responsive}
- SSL present: {ssl_present}
- Booking system: {has_booking}
- Lead form: {has_lead_form}
- CRM indicators: {has_crm}
- Analytics: {has_analytics}
- WhatsApp: {has_whatsapp}
- Social media active: {social_active}

Provide a JSON response with exactly these fields:
1. "analysis": 2-3 sentence analysis of their current situation
2. "why_may_buy": Why this prospect is likely to purchase digital services
3. "suggested_solution": What specific solution they need most
4. "estimated_project_value": Numeric estimated project value in INR
5. "estimated_needs": Array of strings listing missing capabilities they need
6. "recommended_outreach": Recommended outreach approach (1-2 sentences)
7. "outreach_strategy": One of: "consultative", "educational", "direct", "value_proposition"
"""


async def analyze_lead(lead: Lead) -> dict:
    if not settings.OPENAI_API_KEY:
        return _generate_analysis_fallback(lead)

    prompt = ANALYSIS_PROMPT.format(
        business_name=lead.business_name or "Unknown",
        industry=lead.industry or "Unknown",
        category=lead.category or "Unknown",
        location=lead.location or "Unknown",
        description=lead.business_description or "No description available",
        rating=lead.rating or 0,
        review_count=lead.review_count or 0,
        website_url=lead.website_url or "None",
        dm_score=lead.digital_maturity_score or 0,
        opp_score=lead.opportunity_score or 0,
        website_exists="Yes" if lead.website_exists else "No",
        website_quality=lead.website_quality_score or 0,
        mobile_responsive="Yes" if lead.mobile_responsive else "No",
        ssl_present="Yes" if lead.ssl_present else "No",
        has_booking="Yes" if lead.has_booking_system else "No",
        has_lead_form="Yes" if lead.has_lead_form else "No",
        has_crm="Yes" if lead.has_crm_indicators else "No",
        has_analytics="Yes" if lead.has_analytics else "No",
        has_whatsapp="Yes" if lead.has_whatsapp else "No",
        social_active="Yes" if lead.social_media_active else "No",
    )

    try:
        import httpx
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.OPENAI_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "response_format": {"type": "json_object"},
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                return json.loads(content)
    except Exception:
        pass

    return _generate_analysis_fallback(lead)


def _generate_analysis_fallback(lead: Lead) -> dict:
    needs = []
    if not lead.website_exists:
        needs.append("Website")
    elif lead.website_quality_score < 50:
        needs.append("Website Redesign")
    if not lead.has_lead_form:
        needs.append("Landing Page")
    if not lead.has_booking_system:
        needs.append("Booking System")
    if not lead.has_crm_indicators:
        needs.append("CRM")
    if not lead.has_analytics:
        needs.append("Analytics")
    if not lead.has_whatsapp:
        needs.append("WhatsApp Integration")

    if not needs:
        needs.append("Business Automation")

    project_value = len(needs) * 25000 + (50000 if not lead.website_exists else 0)

    industry = (lead.industry or "").lower()
    if "lawyer" in industry or "legal" in industry or "advocate" in industry:
        suggested = "Professional website with practice area pages, client portal, and lead capture forms"
    elif "architect" in industry or "interior" in industry:
        suggested = "Portfolio website with project galleries, 3D virtual tours, and inquiry forms"
    elif "doctor" in industry or "clinic" in industry or "hospital" in industry or "health" in industry:
        suggested = "Clinic website with online appointment booking, patient portal, and telemedicine integration"
    elif "restaurant" in industry or "cafe" in industry or "food" in industry:
        suggested = "Website with online ordering, table reservation, and menu management system"
    elif "real estate" in industry or "property" in industry or "builder" in industry:
        suggested = "Property listing website with virtual tours, inquiry forms, and CRM integration"
    elif "manufacturing" in industry or "factory" in industry or "industrial" in industry:
        suggested = "B2B website with product catalog, inquiry system, and inventory management dashboard"
    elif "retail" in industry or "shop" in industry or "store" in industry:
        suggested = "E-commerce website with inventory management, payment integration, and order tracking"
    elif "ca" in industry or "accountant" in industry or "tax" in industry or "financial" in industry:
        suggested = "Professional website with service pages, client portal, and appointment booking"
    elif "photographer" in industry or "photography" in industry:
        suggested = "Portfolio website with high-res galleries, client proofing, and booking system"
    elif "fitness" in industry or "gym" in industry or "trainer" in industry or "yoga" in industry:
        suggested = "Website with class schedules, membership management, and online booking"
    elif "salon" in industry or "spa" in industry or "beauty" in industry or "barber" in industry:
        suggested = "Website with service catalog, online booking, and loyalty program integration"
    else:
        suggested = "Modern website with lead generation forms, CRM integration, and analytics tracking"

    return {
        "analysis": f"{lead.business_name} operates in the {lead.industry or 'general'} industry with a digital maturity score of {lead.digital_maturity_score}/100. "
                    f"The business has {'a website' if lead.website_exists else 'no website'} and is missing {len(needs)} key digital capabilities.",
        "why_may_buy": f"With an opportunity score of {lead.opportunity_score}/100 and "
                       f"{'low' if lead.digital_maturity_score < 40 else 'moderate'} digital maturity, "
                       f"this business stands to gain significant growth from digital transformation.",
        "suggested_solution": suggested,
        "estimated_project_value": project_value,
        "estimated_needs": needs,
    }
