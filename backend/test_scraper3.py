import asyncio
import sys
sys.path.insert(0, "/app")
from app.services.scraper import scrape_google_search, scrape_sulekha, scrape_google_maps_http

async def test():
    print("=== Google Search ===")
    leads = await scrape_google_search("Restaurants", "Koramangala Bangalore", max_pages=1)
    print(f"Found {len(leads)} leads")
    for ld in leads[:5]:
        print(f"  {ld['business_name']} | Phone: {ld['phone']} | Website: {ld.get('website','N/A')[:60]}")

    print("\n=== Google Maps HTTP ===")
    leads2 = await scrape_google_maps_http("Restaurants", "Koramangala Bangalore")
    print(f"Found {len(leads2)} leads")
    for ld in leads2[:5]:
        print(f"  {ld['business_name']} | Phone: {ld['phone']}")

    print("\n=== Sulekha ===")
    leads3 = await scrape_sulekha("Restaurants", "Bangalore", max_pages=1)
    print(f"Found {len(leads3)} leads")
    for ld in leads3[:5]:
        print(f"  {ld['business_name']} | Phone: {ld['phone']}")

asyncio.run(test())
