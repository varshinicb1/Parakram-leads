import asyncio
from app.services.scraper import scrape_google_maps_browser, scrape_justdial_httpx
from app.services.scraper import run_crawl, save_leads_to_db
from app.database import async_session_factory
from duckduckgo_search import DDGS


async def try_duckduckgo():
    print("=== DuckDuckGo Search ===")
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text("restaurants in Koramangala Bangalore", max_results=5))
            for r in results:
                print(f'  {r["title"]} | {r["href"]}')
    except Exception as e:
        print(f"  Error: {e}")


async def try_maps():
    print("\n=== Google Maps Playwright ===")
    leads = await scrape_google_maps_browser("Restaurants", "Koramangala", max_results=3)
    print(f"\nTotal leads: {len(leads)}")
    for l in leads:
        print(f'  {l["business_name"]} | {l["phone"]} | site: {l["website"]}')

    # Save to DB
    if leads:
        async with async_session_factory() as db:
            saved = await save_leads_to_db(leads, db)
            await db.commit()
            print(f"Saved {saved} leads to DB")


async def main():
    await try_maps()
    print("\n" + "="*50)
    await try_duckduckgo()


asyncio.run(main())
