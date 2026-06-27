import asyncio
from app.services.scraper import scrape_google_maps_browser, save_leads_to_db
from app.database import async_session_factory


async def main():
    leads = await scrape_google_maps_browser("Restaurants", "Koramangala", max_results=3)
    print(f"\nTotal leads: {len(leads)}")
    for l in leads:
        print(f'  {l["business_name"]} | {l["phone"]} | site: {l["website"]}')

    if leads:
        async with async_session_factory() as db:
            saved = await save_leads_to_db(leads, db)
            await db.commit()
            print(f"\nSaved {saved} leads to DB")


asyncio.run(main())
