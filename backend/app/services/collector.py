import aiohttp
import asyncio
from bs4 import BeautifulSoup
from typing import Optional
from urllib.parse import urlparse


async def fetch_url(url: str, timeout: int = 10) -> Optional[str]:
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout)) as session:
            async with session.get(url, headers={"User-Agent": "Mozilla/5.0"}) as resp:
                if resp.status == 200:
                    return await resp.text()
    except Exception:
        return None
    return None


def analyze_website(html: str, url: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    result = {
        "website_exists": True,
        "ssl_present": url.startswith("https"),
        "has_lead_form": False,
        "has_whatsapp": False,
        "has_booking_system": False,
        "has_analytics": False,
        "mobile_responsive": False,
        "website_quality_score": 0.0,
        "email_domain_quality": 0.0,
    }

    page_text = soup.get_text(separator=" ", strip=True).lower()
    html_lower = str(soup).lower()

    booking_keywords = ["book now", "book a", "schedule", "appointment", "reservation", "calendar"]
    result["has_booking_system"] = any(k in page_text for k in booking_keywords)

    form_keywords = ["contact us", "get in touch", "send message", "inquiry", "quote", "get a quote"]
    result["has_lead_form"] = any(k in page_text for k in form_keywords)

    result["has_whatsapp"] = "whatsapp" in html_lower or "wa.me" in html_lower or "wa.me/" in html_lower

    analytics_keywords = ["gtag(", "google-analytics", "ga('", "analytics", "fbq(", "pixel"]
    result["has_analytics"] = any(k in html_lower for k in analytics_keywords)

    meta_viewport = soup.find("meta", attrs={"name": "viewport"})
    result["mobile_responsive"] = meta_viewport is not None

    title = soup.find("title")
    has_title = title is not None and len(title.get_text(strip=True)) > 0
    has_description = soup.find("meta", attrs={"name": "description"}) is not None
    has_og_tags = bool(soup.find_all("meta", property=lambda x: x and x.startswith("og:")))
    image_count = len(soup.find_all("img"))
    link_count = len(soup.find_all("a"))

    score = 0.0
    if has_title:
        score += 15
    if has_description:
        score += 15
    if has_og_tags:
        score += 10
    if image_count > 5:
        score += 10
    if link_count > 10:
        score += 10
    if result["mobile_responsive"]:
        score += 15
    if result["ssl_present"]:
        score += 10
    if result["has_lead_form"]:
        score += 5
    if result["has_analytics"]:
        score += 5
    if result["has_whatsapp"]:
        score += 5

    result["website_quality_score"] = min(score, 100.0)
    return result


async def analyze_website_async(url: str) -> dict:
    if not url or not url.startswith("http"):
        return {"website_exists": False, "website_quality_score": 0.0}
    html = await fetch_url(url)
    if not html:
        return {"website_exists": False, "website_quality_score": 0.0}
    return analyze_website(html, url)
