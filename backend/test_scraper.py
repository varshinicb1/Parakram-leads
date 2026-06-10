import asyncio
import sys
sys.path.insert(0, "/app")
from app.services.scraper import scrape_justdial, JUSTDIAL_CATEGORIES

async def test():
    leads = await scrape_justdial("Restaurants", "Koramangala", max_pages=1)
    print(f"Found {len(leads)} leads")
    for ld in leads[:5]:
        print(f"  {ld['business_name']} | Phone: {ld['phone']} | Website: {ld.get('website','N/A')} | HasSite: {ld.get('has_website')}")

asyncio.run(test())
