from app.models.lead import Lead
from app.config import settings
import json


OUTREACH_PROMPT = """
You are a professional business development consultant drafting a personalized outreach message.

Prospect: {business_name}
Owner: {owner_name}
Industry: {industry}
Category: {category}
Location: {location}
Website: {website_url}
Description: {description}

Current Gaps (what they need):
{needs}

Suggested Solution: {solution}

Draft 3 short, human-sounding outreach messages (max 2-3 sentences each) in JSON format:
1. "whatsapp": A WhatsApp message - casual, personal, references their business
2. "email": An email with subject line and body
3. "linkedin": A LinkedIn message - professional, connects to their work

Rules:
- Sound completely human, never automated
- Reference their actual business and situation
- Be concise and value-focused
- No generic templates
- No spammy language
- Include a clear, low-friction call to action
- Don't mention "digital maturity score" or "opportunity score"
"""


async def generate_outreach(lead: Lead) -> dict:
    needs = ", ".join(lead.estimated_needs) if lead.estimated_needs else "Digital presence improvement"
    owner = lead.owner_name or "there"

    if not settings.OPENAI_API_KEY:
        return _generate_outreach_fallback(lead, owner, needs)

    prompt = OUTREACH_PROMPT.format(
        business_name=lead.business_name or "Your Business",
        owner_name=owner,
        industry=lead.industry or "your industry",
        category=lead.category or "",
        location=lead.location or "",
        website_url=lead.website_url or "None",
        description=lead.business_description or "",
        needs=needs,
        solution=lead.suggested_solution or "digital solutions",
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
                    "temperature": 0.4,
                    "response_format": {"type": "json_object"},
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                return json.loads(content)
    except Exception:
        pass

    return _generate_outreach_fallback(lead, owner, needs)


def _generate_outreach_fallback(lead: Lead, owner: str, needs: str) -> dict:
    industry = (lead.industry or "").lower()

    if "lawyer" in industry or "legal" in industry or "advocate" in industry:
        whatsapp = f"Hi {owner}, I came across {lead.business_name} and noticed your practice in {lead.industry}. "
        whatsapp += "I have an idea that could help you get more client inquiries directly through your website. "
        whatsapp += "Would you be open to a quick 5-min chat this week?"
        email = f"Subject: Helping {lead.business_name} attract more clients online\n\nHi {owner},\n\n"
        email += f"I was reviewing {lead.business_name}'s online presence and noticed there's a great opportunity to "
        email += "bring in more qualified leads through your website. Many law firms are now using simple digital "
        email += "tools to automate client inquiries. Would you be interested in seeing how this works?\n\n"
        email += "Happy to share a few ideas over a quick call.\n\nBest regards"
        linkedin = f"Hi {owner}, I've been following {lead.business_name}'s work in {lead.industry}. "
        linkedin += "I had an idea about how you could streamline client inquiries digitally. "
        linkedin += "Would love to connect and share."

    elif "architect" in industry or "interior" in industry or "design" in industry:
        whatsapp = f"Hey {owner}, I was checking out {lead.business_name}'s work — impressive projects! "
        whatsapp += "I think a well-designed portfolio website could really showcase your work and bring in more clients. "
        whatsapp += "Up for a quick chat about it?"
        email = f"Subject: Showcasing {lead.business_name}'s projects online\n\nHi {owner},\n\n"
        email += f"Your projects speak for themselves, but I noticed {lead.business_name} could benefit from a "
        email += "more compelling online portfolio. A well-structured website with project galleries can "
        email += "dramatically increase inbound inquiries. Happy to share some ideas.\n\nBest regards"
        linkedin = f"Hi {owner}, love the work {lead.business_name} is doing. I had a thought about how you "
        linkedin += "could showcase your portfolio more effectively online. Would be great to connect."

    elif "photographer" in industry or "photography" in industry:
        whatsapp = f"Hi {owner}, your photography work is amazing! I think a stunning online portfolio "
        whatsapp += "could help you attract even more clients and showcase your best work professionally. "
        whatsapp += "Would you be interested in a quick chat?"
        email = f"Subject: A better online presence for {lead.business_name}\n\nHi {owner},\n\n"
        email += f"I came across {lead.business_name} and your photography is outstanding. I specialize in "
        email += "helping creatives build beautiful portfolio websites that drive client inquiries. "
        email += "Would love to share a few ideas.\n\nBest regards"
        linkedin = f"Hi {owner}, stunning work! I think a custom portfolio website could really elevate "
        linkedin += f"{lead.business_name}'s brand and attract more clients. Would love to connect."

    elif "doctor" in industry or "clinic" in industry or "health" in industry or "hospital" in industry:
        whatsapp = f"Hi {owner}, I was looking at {lead.business_name} and had an idea. Many clinics are now "
        whatsapp += "using simple online booking systems to save time and reduce phone calls. "
        whatsapp += "Would you be interested in seeing how it works?"
        email = f"Subject: Streamlining patient appointments at {lead.business_name}\n\nHi {owner},\n\n"
        email += f"I noticed {lead.business_name} could benefit from an online appointment booking system. "
        email += "It saves your staff time and makes it easy for patients to book anytime. "
        email += "Happy to show you a quick demo.\n\nBest regards"
        linkedin = f"Hi {owner}, I had an idea for {lead.business_name} around digitizing patient appointments. "
        linkedin += "Would be great to connect and share."

    elif "restaurant" in industry or "cafe" in industry or "food" in industry:
        whatsapp = f"Hi {owner}, I was thinking about {lead.business_name} and how an online ordering system "
        whatsapp += "or table reservation feature could bring in more customers. Many restaurants are doing this now. "
        whatsapp += "Up for a quick chat?"
        email = f"Subject: Growing {lead.business_name}'s online orders\n\nHi {owner},\n\n"
        email += f"I had some ideas for {lead.business_name} around digital ordering and table reservations "
        email += "that could help increase revenue. Would love to share them with you.\n\nBest regards"
        linkedin = f"Hi {owner}, love what {lead.business_name} is doing. Had an idea about online ordering "
        linkedin += "that could really help. Let's connect!"

    elif "ca" in industry or "accountant" in industry or "tax" in industry or "financial" in industry:
        whatsapp = f"Hi {owner}, I was looking at {lead.business_name}. I think a professional website with "
        whatsapp += "a client portal could help you manage inquiries and build trust more effectively. "
        whatsapp += "Would you be open to a quick discussion?"
        email = f"Subject: Digital solutions for {lead.business_name}\n\nHi {owner},\n\n"
        email += f"I specialize in helping financial professionals like {lead.business_name} build a stronger "
        email += "online presence with client portals and inquiry management systems. "
        email += "Would love to share some ideas.\n\nBest regards"
        linkedin = f"Hi {owner}, I had an idea about how {lead.business_name} could use digital tools "
        linkedin += "to streamline client interactions. Would be great to connect."

    else:
        whatsapp = f"Hi {owner}, I came across {lead.business_name} and had an idea. I think there's a "
        whatsapp += "great opportunity to improve your online presence and attract more customers. "
        whatsapp += "Would you be open to a 5-minute chat this week?"
        email = f"Subject: Ideas for {lead.business_name}\n\nHi {owner},\n\n"
        email += f"I was reviewing {lead.business_name}'s online presence and see a real opportunity to "
        email += "help you grow through better digital tools. I'd love to share a few ideas "
        email += "that have worked for similar businesses.\n\nHappy to connect for a quick call.\n\nBest regards"
        linkedin = f"Hi {owner}, I had an idea that could help {lead.business_name} grow online. "
        linkedin += "Would love to connect and share."

    return {
        "whatsapp": whatsapp,
        "email": email,
        "linkedin": linkedin,
    }
