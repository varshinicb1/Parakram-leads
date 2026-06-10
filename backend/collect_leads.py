import asyncio
import argparse
import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import async_session_factory, init_db
from app.services.scraper import (
    run_crawl,
    scrape_single_category,
    export_leads_to_json,
    JUSTDIAL_CATEGORIES,
    BANGALORE_LOCATIONS,
)


async def main():
    parser = argparse.ArgumentParser(description="Sigma Lead Intelligence - Business Lead Scraper")
    parser.add_argument("--category", "-c", type=str, default=None,
                        help="Single category to scrape (e.g. 'Restaurants')")
    parser.add_argument("--location", "-l", type=str, default="Bangalore",
                        help="Location to search in (default: Bangalore)")
    parser.add_argument("--pages", "-p", type=int, default=2,
                        help="Number of pages to scrape (default: 2)")
    parser.add_argument("--no-db", action="store_true",
                        help="Don't save to database, just export JSON")
    parser.add_argument("--output", "-o", type=str, default="scraped_leads.json",
                        help="Output JSON file path")
    parser.add_argument("--use-maps", action="store_true", default=True,
                        help="Use Google Maps (default: True)")
    parser.add_argument("--no-maps", action="store_false", dest="use_maps",
                        help="Skip Google Maps")
    parser.add_argument("--use-justdial", action="store_true", default=True,
                        help="Use JustDial (default: True)")
    parser.add_argument("--no-justdial", action="store_false", dest="use_justdial",
                        help="Skip JustDial")

    args = parser.parse_args()

    if args.category:
        print(f"\n=== Scraping: {args.category} in {args.location} ===\n")
        leads = await scrape_single_category(
            category=args.category,
            location=args.location,
            max_pages=args.pages,
        )

        print(f"\n=== Found {len(leads)} businesses without websites ===")
        for ld in leads[:20]:
            print(f"  {ld['business_name']}")
            print(f"    Phone: {ld['phone']}")
            print(f"    Desc: {ld['description'][:100]}")
            print()

        if not args.no_db:
            await init_db()
            async with async_session_factory() as db:
                from app.services.scraper import save_leads_to_db
                saved = await save_leads_to_db(leads, db)
                await db.commit()
                print(f"Saved {saved} leads to database")

        if leads:
            await export_leads_to_json(leads, args.output)
    else:
        categories = JUSTDIAL_CATEGORIES[:int(input("Number of categories to scrape (default 10): ") or "10")]
        locations = [args.location]

        print(f"\n=== Scraping {len(categories)} categories in {locations[0]} ===\n")

        if not args.no_db:
            await init_db()

        async with async_session_factory() as db:
            stats = await run_crawl(
                categories=categories,
                locations=locations,
                max_pages=args.pages,
                use_maps=args.use_maps,
                use_justdial=args.use_justdial,
                db=db if not args.no_db else None,
            )
            if not args.no_db:
                await db.commit()

        print(f"\n=== Crawl Complete ===")
        print(f"  Categories: {stats['categories_done']}")
        print(f"  Total leads found: {stats['total_leads']}")
        print(f"  Without website: {stats['no_website']}")
        print(f"  Saved to DB: {stats.get('saved', 0)}")


if __name__ == "__main__":
    asyncio.run(main())
