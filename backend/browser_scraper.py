import asyncio
import re
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from app.database import async_session_factory, init_db
from app.models.lead import Lead, LeadStatus, LeadCategory
from app.services.collector import analyze_website_async
from sqlalchemy import select


CATEGORIES = [
    "Restaurants", "Salons", "Gyms", "Yoga Centers",
    "Bakers", "Caterers", "Tiffin Services",
    "General Physicians", "Dentists", "Skin Clinics", "Eye Hospitals",
    "Diagnostic Centers", "Medical Stores", "Ayurvedic",
    "Physiotherapists", "Veterinary Hospitals",
    "Architects", "Interior Designers", "Civil Contractors",
    "Painters", "Plumbers", "Electricians", "Carpenters",
    "Pest Control", "Packers Movers", "Security Services", "Housekeeping",
    "CAs", "Tax Consultants", "Lawyers", "Real Estate Agents",
    "Property Agents", "Builders", "Developers",
    "Photographers", "Event Planners", "Wedding Planners",
    "Travel Agents", "Cab Services", "Car Rentals",
    "Hardware Stores", "Kirana Stores", "Furniture Shops",
    "Clothing Stores", "Tailors", "Jewelry Stores",
    "Car Mechanics", "Bike Mechanics", "Car Wash",
    "Laptop Repair", "Mobile Repair", "AC Repair",
    "Printing Shops", "CCTV Dealers", "Water Purifiers",
    "Solar Panel Dealers", "General Stores", "Bakeries",
    "Chemists", "Opticians", "Day Care Centers",
    "Laundry", "Dry Cleaners", "Plant Nurseries",
    "Tattoo Studios", "Unisex Salons", "Spa Centers",
    "Dance Classes", "Music Classes", "Tutors",
    "Budget Hotels", "Guest Houses", "Hostels",
    "PG Accommodation", "Gift Shops", "Stationery Shops",
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


async def scrape_category_in_location(
    category: str,
    location: str,
    max_scrolls: int = 5,
    max_results: int = 50,
    db_session=None,
) -> list[dict]:
    """Opens Google Maps in a visible browser. You must scan/be logged in to Google."""
    from playwright.async_api import async_playwright

    results = []
    seen_phones = set()
    data_dir = os.path.join(os.path.dirname(__file__), "..", "playwright_data")

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=data_dir,
            headless=False,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                f"--window-size=1400,900",
            ],
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1400, "height": 900},
            locale="en-IN",
        )

        page = await browser.new_page()

        from urllib.parse import quote_plus
        query = quote_plus(f"{category} in {location}")
        url = f"https://www.google.com/maps/search/{query}/"
        print(f"\nOpening: {url}")
        print("IMPORTANT: Make sure you are logged into Google in the browser window.")
        print("The browser will open visibly. Do not close it until scraping is done.\n")

        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(5)

        for i in range(max_scrolls):
            await page.evaluate("document.querySelector('[role=\"feed\"]')?.scrollBy(0, 8000)")
            await asyncio.sleep(2)
            print(f"  Scrolled {i+1}/{max_scrolls}")

        listings = await page.query_selector_all('a[href*="maps/place/"]')
        if not listings:
            listings = await page.query_selector_all('[role="article"]')
        if not listings:
            listings = await page.query_selector_all('[class*="Nv2PK"], [class*="THOPZb"]')

        print(f"  Found {len(listings)} listings, extracting up to {max_results}...")

        for i, listing in enumerate(listings[:max_results]):
            try:
                await listing.click()
                await asyncio.sleep(2)

                name = ""
                for sel in ["h1", '[class*="DUwDvf"]', '[class*="fontHeadlineLarge"]', "h2"]:
                    el = await page.query_selector(sel)
                    if el:
                        name = (await el.inner_text()).strip()
                        if name and len(name) > 2:
                            break

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

                website = ""
                phone_btn = await page.query_selector('button[data-item-id*="phone"]')
                if phone_btn:
                    await phone_btn.click()
                    await asyncio.sleep(0.5)
                for sel in ['a[data-item-id*="authority"]', 'a[href*="http"][aria-label*="website"]']:
                    el = await page.query_selector(sel)
                    if el:
                        href = await el.get_attribute("href") or ""
                        if href and "http" in href:
                            website = href
                            break

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
                    lead_data = {
                        "business_name": name[:255],
                        "phone": phone,
                        "website": website,
                        "description": f"{category} in {location}",
                        "address": address,
                        "category": category,
                        "source": "google_maps_browser",
                        "location": location,
                        "has_website": bool(website),
                    }

                    if lead_data["has_website"]:
                        lead_data = await verify_no_website(lead_data)

                    if not lead_data["has_website"]:
                        results.append(lead_data)
                        print(f"  [{i+1}] {name[:50]} | {phone} | NO WEBSITE")
                    else:
                        print(f"  [{i+1}] {name[:50]} | {phone} | HAS WEBSITE (skipped)")
                elif phone:
                    print(f"  [{i+1}] {name[:50]} | No phone or duplicate (skipped)")
                else:
                    print(f"  [{i+1}] {name[:50]} | No phone (skipped)")

            except Exception as e:
                continue

        await browser.close()
        print(f"\nTotal without website: {len(results)}")

        if db_session and results:
            saved = await save_to_db(results, db_session)
            print(f"Saved to database: {saved}")

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
    return lead_data


async def save_to_db(leads: list[dict], db) -> int:
    saved = 0
    for ld in leads:
        phone = ld.get("phone", "")
        if not phone:
            continue
        existing = await db.execute(select(Lead).where(Lead.phone == phone))
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
                source="google_maps_browser",
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


async def run_visual_scraper(
    categories: list[str] = None,
    locations: list[str] = None,
    max_scrolls: int = 5,
    max_results: int = 50,
    db=None,
):
    if categories is None:
        categories = CATEGORIES[:3]
    if locations is None:
        locations = ["Koramangala Bangalore", "Indiranagar Bangalore", "HSR Layout Bangalore"]

    all_leads = []

    for category in categories:
        for location in locations:
            print(f"\n{'='*60}")
            print(f"SCRAPING: {category} in {location}")
            print(f"{'='*60}")
            leads = await scrape_category_in_location(
                category, location, max_scrolls, max_results, db_session=db
            )
            all_leads.extend(leads)

            # Save progress after each category
            if leads:
                outfile = f"scraped_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                with open(outfile, "w", encoding="utf-8") as f:
                    json.dump(all_leads, f, indent=2, ensure_ascii=False)
                print(f"Progress saved to {outfile}")

    return all_leads


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Visual Google Maps Scraper - Opens a browser window")
    parser.add_argument("--category", "-c", type=str, default=None,
                        help="Category to scrape (e.g. 'Restaurants'). If omitted, starts interactive.")
    parser.add_argument("--location", "-l", type=str, default="Koramangala Bangalore",
                        help="Location (default: Koramangala Bangalore)")
    parser.add_argument("--max", "-m", type=int, default=30,
                        help="Max results per search (default: 30)")
    parser.add_argument("--scrolls", "-s", type=int, default=5,
                        help="Number of scrolls (default: 5)")
    parser.add_argument("--no-db", action="store_true",
                        help="Don't save to database")

    args = parser.parse_args()

    async def main():
        db = None
        if not args.no_db:
            await init_db()
            async with async_session_factory() as session:
                if args.category:
                    leads = await scrape_category_in_location(
                        args.category, args.location,
                        max_scrolls=args.scrolls, max_results=args.max,
                        db_session=session,
                    )
                    await session.commit()
                else:
                    print("Available categories:")
                    for i, cat in enumerate(CATEGORIES, 1):
                        print(f"  {i}. {cat}")
                    print()

                    leads = []
                    while True:
                        cat_name = input("Category (or 'done' to stop): ").strip()
                        if cat_name.lower() == "done":
                            break
                        loc = input(f"Location [{args.location}]: ").strip() or args.location
                        lds = await scrape_category_in_location(
                            cat_name, loc,
                            max_scrolls=args.scrolls, max_results=args.max,
                            db_session=session,
                        )
                        leads.extend(lds)
                        await session.commit()

                    outfile = f"scraped_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                    with open(outfile, "w", encoding="utf-8") as f:
                        json.dump(leads, f, indent=2, ensure_ascii=False)
                    print(f"\nAll data saved to {outfile}")
        else:
            if args.category:
                leads = await scrape_category_in_location(
                    args.category, args.location,
                    max_scrolls=args.scrolls, max_results=args.max,
                )
            else:
                print("Error: Specify --category or remove --no-db for interactive mode")
                return

        print(f"\nDone! Collected {len(leads)} businesses without websites.")

    asyncio.run(main())
