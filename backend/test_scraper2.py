import asyncio
import sys
sys.path.insert(0, "/app")
from app.services.scraper import scrape_google_maps, scrape_justdial

async def test():
    print("=== Testing Google Maps ===")
    leads = await scrape_google_maps("Restaurants", "Koramangala Bangalore", max_scrolls=2)
    print(f"Found {len(leads)} leads from Maps")
    for ld in leads[:5]:
        print(f"  {ld['business_name']} | Phone: {ld['phone']} | Website: {ld.get('website','N/A')}")

    print("\n=== Testing JustDial ===")
    jd_leads = await scrape_justdial("Restaurants", "Bangalore", max_pages=1)
    print(f"Found {len(jd_leads)} leads from JustDial")
    for ld in jd_leads[:5]:
        print(f"  {ld['business_name']} | Phone: {ld['phone']} | Website: {ld.get('website','N/A')}")

asyncio.run(test())
