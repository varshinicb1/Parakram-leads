from app.models.lead import Lead, LeadCategory


async def categorize_lead(lead: Lead) -> LeadCategory:
    dm = lead.digital_maturity_score
    opp = lead.opportunity_score

    if opp >= 60 and dm < 40:
        return LeadCategory.HOT
    if opp >= 40 and (opp >= 50 or dm < 60):
        return LeadCategory.WARM
    return LeadCategory.COLD


def get_category_flags(category: LeadCategory) -> list[str]:
    flags = []
    if category == LeadCategory.HOT:
        flags = ["High opportunity", "Low digital maturity", "Active business", "Ready to buy"]
    elif category == LeadCategory.WARM:
        flags = ["Moderate opportunity", "Some digital presence", "Nurture required"]
    else:
        flags = ["Low priority", "Limited data", "Revisit later"]
    return flags
