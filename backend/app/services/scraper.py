import asyncio
import re
import json
import os
import csv
from typing import Optional
from urllib.parse import quote_plus
from bs4 import BeautifulSoup
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.lead import Lead, LeadStatus, LeadCategory
from app.services.collector import analyze_website_async


JUSTDIAL_CATEGORIES = [
    "Restaurants", "Beauty Parlours", "Salons", "Gyms", "Yoga Centers",
    "Bakers", "Caterers", "Tiffin Services", "Cloud Kitchens",
    "General Physicians", "Dentists", "Skin Clinics", "Eye Hospitals",
    "Diagnostic Centers", "Path Labs", "Medical Stores", "Ayurvedic",
    "Physiotherapists", "Veterinary Hospitals",
    "Architects", "Interior Designers", "Civil Contractors",
    "Painters", "Plumbers", "Electricians", "Carpenters",
    "Pest Control", "Packers Movers", "Security Services",
    "Housekeeping", "Deep Cleaning",
    "CAs", "Tax Consultants", "Company Registration",
    "Lawyers", "Advocates", "Legal Consultants",
    "Property Agents", "Real Estate", "Property Consultants",
    "Builders", "Developers",
    "Tutors", "Coaching Centers", "Preschools", "Schools",
    "Computer Training", "Language Classes", "Dance Classes",
    "Photographers", "Event Planners", "Wedding Planners",
    "DJs", "Mandap Decorators", "Catering Services",
    "Travel Agents", "Tour Operators", "Cab Services",
    "Car Rentals", "Bus Rentals",
    "Hardware Stores", "Electrical Shops", "Kirana Stores",
    "Departmental Stores", "Furniture Shops", "Electronics Shops",
    "Mobile Shops", "Computer Shops", "Book Shops",
    "Clothing Stores", "Tailors", "Jewelry Stores",
    "Car Mechanics", "Bike Mechanics", "Car Wash",
    "Tyre Dealers", "Auto Parts",
    "DTP Operators", "Printing Shops", "Xerox Centers",
    "CCTV Dealers", "AC Repair", "Washing Machine Repair",
    "Laptop Repair", "Mobile Repair", "TV Repair",
    "Carpet Dealers", "Paint Dealers", "Tile Dealers",
    "Borewells", "Water Purifiers", "Solar Panel Dealers",
    "General Stores", "Provisions", "Bakeries",
    "Sweet Shops", "Ice Cream Parlours", "Juice Centers",
    "Chemists", "Opticians", "Health Clinics",
    "Fitness Trainers", "Zumba Classes", "Crossfit",
    "Beauty Clinics", "Laser Clinics", "Hair Transplant",
    "Counsellors", "Psychologists", "Alternative Medicine",
    "Day Care Centers", "Old Age Homes",
    "Courier Services", "Logistics", "Transport Services",
    "Gift Shops", "Florists", "Stationery Shops",
    "Sports Equipment", "Toy Shops", "Pet Shops",
    "Laundry", "Dry Cleaners", "Ironing Services",
    "Locksmith", "Key Maker",
    "Watch Repair", "Jewelry Repair", "Shoe Repair",
    "Plant Nurseries", "Gardening Services", "Landscaping",
    "CCTV Installation", "Home Automation", "Security Guards",
    "Waste Management", "Scrap Dealers", "Recycling Centers",
    "Tattoo Studios", "Piercing Studios", "Unisex Salons",
    "Spa", "Massage Centers", "Wellness Centers",
    "Dance Academies", "Music Classes", "Art Classes",
    "Pottery Classes", "Cooking Classes",
    "Yoga Teachers", "Meditation Centers", "Naturopathy",
    "Rental Services", "Furniture Rental", "Car Rental",
    "Bicycle Rental", "Scooter Rental", "Bike Rental",
    "PG Accommodation", "Hostels", "Guest Houses",
    "Lodges", "Budget Hotels", "Service Apartments",
]

BANGALORE_LOCATIONS = [
    "Koramangala", "Indiranagar", "Whitefield", "Marathahalli",
    "Jayanagar", "JP Nagar", "BTM Layout", "HSR Layout",
    "Banashankari", "Basavanagudi", "Malleshwaram", "Rajajinagar",
    "Vijayanagar", "RR Nagar", "Yelahanka", "Hebbal",
    "Electronic City", "MG Road", "Brigade Road",
    "Sadashivanagar", "Ulsoor", "Domlur", "HAL",
    "Vasanth Nagar", "Yeshwanthpur", "Peenya",
    "Kengeri", "Nagarabhavi", "Padmanabhanagar",
    "Bannerghatta Road", "Kanakapura Road", "Mysore Road",
    "Sarjapur Road", "Kanakapura", "Anekal",
]


def normalize_phone(raw: str) -> str:
    cleaned = re.sub(r'[\s\-\(\)\+\#\*\.]', '', raw)
    if cleaned.startswith('91') and len(cleaned) >= 12:
        return cleaned
    if cleaned.startswith('0') and len(cleaned) >= 11:
        return '91' + cleaned[1:]
    if len(cleaned) == 10 and cleaned[0] in '6789':
        return '91' + cleaned
    return cleaned


def is_valid_phone(phone: str) -> bool:
    cleaned = re.sub(r'\D', '', phone)
    if cleaned.startswith('91'):
        cleaned = cleaned[2:]
    return len(cleaned) == 10 and cleaned[0] in '6789'


async def scrape_google_maps_browser(
    category: str,
    location: str = "Bangalore",
    max_results: int = 50,
) -> list[dict]:
    from playwright.async_api import async_playwright

    results = []
    seen_phones: set = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=os.path.join(os.path.dirname(__file__), "..", "..", "playwright_data"),
            headless=True,
            args=["--no-sandbox"],
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            locale="en-IN",
        )
        page = await browser.new_page()

        query = quote_plus(f"{category} in {location}")
        url = f"https://www.google.com/maps/search/{query}/"
        print(f"  Opening Maps: {url}")
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        await asyncio.sleep(3)

        await page.evaluate("document.querySelector('[role=\"feed\"]')?.scrollBy(0, 3000)")
        await asyncio.sleep(2)
        await page.evaluate("document.querySelector('[role=\"feed\"]')?.scrollBy(0, 5000)")
        await asyncio.sleep(2)

        listings = await page.query_selector_all('a[href*="maps/place/"]')
        if not listings:
            listings = await page.query_selector_all('[role="article"]')
        if not listings:
            listings = await page.query_selector_all('[class*="Nv2PK"]')
        print(f"    Found {len(listings)} listings")

        for i, listing in enumerate(listings[:max_results]):
            try:
                await listing.click()
                await asyncio.sleep(2)

                # Extract name
                name = ""
                for sel in ["h1", '[class*="DUwDvf"]', '[class*="headline"]', "h2"]:
                    el = await page.query_selector(sel)
                    if el:
                        name = (await el.inner_text()).strip()
                        if name and len(name) > 2:
                            break

                # Extract phone
                phone = ""
                for sel in ['button[data-item-id*="phone"]', 'a[href^="tel:"]', '[class*="phone"]']:
                    el = await page.query_selector(sel)
                    if el:
                        txt = (await el.inner_text()).strip()
                        nums = re.findall(r"[\d\s\-\(\)\+]{10,}", txt)
                        for n in nums:
                            cleaned = normalize_phone(n)
                            if is_valid_phone(cleaned):
                                phone = cleaned
                                break
                        if phone:
                            break

                # Extract website
                website = ""
                for sel in ['a[data-item-id*="authority"]', 'a[href*="http"][aria-label*="website"]']:
                    el = await page.query_selector(sel)
                    if el:
                        href = await el.get_attribute("href") or ""
                        if href and "http" in href:
                            website = href
                            break

                # Extract address
                address = ""
                for sel in ['button[data-item-id*="address"]', '[class*="address"]']:
                    el = await page.query_selector(sel)
                    if el:
                        address = (await el.inner_text()).strip()[:200]
                        if address:
                            break

                if not name or len(name) < 3:
                    continue

                phone = normalize_phone(phone)

                if phone and phone not in seen_phones and is_valid_phone(phone):
                    seen_phones.add(phone)
                    results.append({
                        "business_name": name[:255],
                        "phone": phone,
                        "website": website,
                        "description": f"{category} in {location}",
                        "address": address,
                        "category": category,
                        "source": "google_maps_playwright",
                        "location": location,
                        "has_website": bool(website),
                    })

                if phone:
                    print(f"    [{i+1}] {name[:40]} | Phone: {phone}")
                else:
                    print(f"    [{i+1}] {name[:40]} | No phone")

            except Exception as e:
                continue

        await browser.close()

    return results


async def scrape_justdial_httpx(
    category: str,
    location: str = "Bangalore",
    max_pages: int = 2,
) -> list[dict]:
    import httpx
    results = []
    seen_phones: set = set()

    location_slug = location.lower().replace(" ", "-")
    cat_slug = category.lower().replace(" ", "-")

    for page in range(max_pages):
        url = f"https://www.justdial.com/{location_slug}/{cat_slug}?page={page + 1}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
        }
        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code != 200 or len(resp.text) < 100:
                    continue

                phones = re.findall(r"[6-9]\d{9}", resp.text)
                names = re.findall(r'<h2[^>]*class="[^"]*lng_cont_name[^"]*"[^>]*>(.*?)</h2>', resp.text, re.DOTALL)
                if not names:
                    names = re.findall(r'<h2[^>]*>(.*?)</h2>', resp.text)
                if not names:
                    names = re.findall(r'"storeName":"([^"]+)"', resp.text)
                if not names:
                    names = re.findall(r'"businessName":"([^"]+)"', resp.text)

                for name in names:
                    name = BeautifulSoup(name, "html.parser").get_text(strip=True) if name else ""
                    if len(name) < 3:
                        continue
                    for p in phones:
                        cleaned = normalize_phone(p)
                        if cleaned and is_valid_phone(cleaned) and cleaned not in seen_phones:
                            seen_phones.add(cleaned)
                            results.append({
                                "business_name": name[:255],
                                "phone": cleaned,
                                "website": "",
                                "description": category,
                                "address": "",
                                "category": category,
                                "source": "justdial",
                                "location": location,
                                "has_website": False,
                            })
                            break

                print(f"    Page {page+1}: {len(names)} names, {len(phones)} phones, {len(results)} results")
        except Exception as e:
            print(f"    Error: {e}")
            continue

    return results


async def verify_no_website(lead_data: dict) -> dict:
    if lead_data.get("website"):
        known_no_site = [
            "facebook.com", "instagram.com", "twitter.com", "linkedin.com",
            "youtube.com", "justdial.com", "sulekha.com", "indiamart.com",
            "google.com/maps", "maps.google.com",
        ]
        site = lead_data["website"].lower()
        for no_site in known_no_site:
            if no_site in site:
                lead_data["has_website"] = False
                lead_data["website"] = ""
                return lead_data
        try:
            analysis = await analyze_website_async(lead_data["website"])
            lead_data["has_website"] = analysis.get("website_exists", False)
            if not analysis.get("website_exists", False):
                lead_data["website"] = ""
        except Exception:
            lead_data["has_website"] = True
    return lead_data


async def save_leads_to_db(leads: list[dict], db: AsyncSession) -> int:
    saved = 0
    for ld in leads:
        phone = ld.get("phone", "")
        if not phone:
            continue
        existing = await db.execute(
            select(Lead).where(Lead.phone == phone)
        )
        if existing.scalar_one_or_none():
            continue
        try:
            lead = Lead(
                business_name=ld.get("business_name", "Unknown")[:255],
                phone=phone,
                industry=ld.get("category", "General")[:128],
                category=LeadCategory.COLD,
                status=LeadStatus.DISCOVERED,
                location=ld.get("address", ld.get("location", ""))[:255],
                business_description=ld.get("description", "")[:1000],
                source=ld.get("source", "scraper"),
                website_url=ld.get("website", ""),
                website_exists=ld.get("has_website", False),
                social_profiles={},
            )
            db.add(lead)
            saved += 1
        except Exception:
            continue
    if saved > 0:
        await db.flush()
    return saved


async def run_crawl(
    categories: list[str] | None = None,
    locations: list[str] | None = None,
    max_results: int = 30,
    use_playwright: bool = True,
    use_justdial: bool = True,
    db: AsyncSession | None = None,
) -> dict:
    if categories is None:
        categories = JUSTDIAL_CATEGORIES[:5]
    if locations is None:
        locations = BANGALORE_LOCATIONS[:3]

    all_leads = []
    stats = {"categories_done": 0, "total_leads": 0, "no_website": 0, "saved": 0}

    for i, category in enumerate(categories):
        for location in locations:
            print(f"\n[{i+1}/{len(categories)}] {category} in {location}")

            batch = []
            if use_playwright:
                leads = await scrape_google_maps_browser(category, location, max_results)
                batch.extend(leads)
                print(f"  Maps: {len(leads)} leads")

            if use_justdial:
                leads = await scrape_justdial_httpx(category, location)
                batch.extend(leads)
                print(f"  JD: {len(leads)} leads")

            seen = set()
            unique = []
            for ld in batch:
                p = ld.get("phone", "")
                if p and p not in seen:
                    seen.add(p)
                    ld = await verify_no_website(ld)
                    unique.append(ld)

            no_site = [ld for ld in unique if not ld.get("has_website", False)]
            all_leads.extend(no_site)
            print(f"  Without website: {len(no_site)}")

        stats["categories_done"] = i + 1

    stats["total_leads"] = len(all_leads)
    stats["no_website"] = len([ld for ld in all_leads if not ld.get("has_website")])

    if db:
        saved = await save_leads_to_db(all_leads, db)
        stats["saved"] = saved
        print(f"\nSaved {saved} leads to database")

    return stats


async def export_leads_to_json(leads: list[dict], filepath: str = "scraped_leads.json"):
    os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else ".", exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(leads, f, indent=2, ensure_ascii=False)
    print(f"Exported {len(leads)} leads to {filepath}")


async def import_from_csv(filepath: str, db: AsyncSession) -> int:
    saved = 0
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            phone = normalize_phone(row.get("phone", ""))
            if not phone or not is_valid_phone(phone):
                continue
            existing = await db.execute(select(Lead).where(Lead.phone == phone))
            if existing.scalar_one_or_none():
                continue
            try:
                lead = Lead(
                    business_name=row.get("business_name", "Unknown")[:255],
                    phone=phone,
                    industry=row.get("industry", row.get("category", "General"))[:128],
                    category=LeadCategory.COLD,
                    status=LeadStatus.DISCOVERED,
                    location=row.get("location", row.get("address", ""))[:255],
                    business_description=row.get("description", "")[:1000],
                    source="csv_import",
                    social_profiles={},
                )
                db.add(lead)
                saved += 1
            except Exception:
                continue
    if saved > 0:
        await db.flush()
    return saved


async def scrape_single_category(
    category: str,
    location: str = "Bangalore",
    max_results: int = 30,
    db: AsyncSession | None = None,
) -> list[dict]:
    all_leads = []
    maps_leads = await scrape_google_maps_browser(category, location, max_results)
    jd_leads = await scrape_justdial_httpx(category, location)

    seen = set()
    for ld in maps_leads + jd_leads:
        p = ld.get("phone", "")
        if p and p not in seen:
            seen.add(p)
            ld = await verify_no_website(ld)
            if not ld.get("has_website", False):
                all_leads.append(ld)

    if db:
        saved = await save_leads_to_db(all_leads, db)
        print(f"  Saved {saved} to DB")

    return all_leads
