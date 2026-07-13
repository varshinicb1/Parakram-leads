import asyncio, sys, json, os
from gmaps_scraper import scrape_batch, ScrapeConfig

async def main():
    query = sys.argv[1] if len(sys.argv) > 1 else 'restaurants in Indore'
    max_results = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    url = f'https://www.google.com/maps/search/{query.replace(" ", "+")}'
    
    config = ScrapeConfig(concurrency=3, headless=True, max_results=max_results)
    results = await scrape_batch([url], config)
    
    out = []
    for r in results:
        if r.success and r.place:
            p = r.place
            out.append({
                "name": p.name,
                "phone": p.phone,
                "website": p.website,
                "address": p.address,
                "category": p.category,
                "rating": p.rating,
                "reviews": p.review_count,
                "city": "",
            })
    
    json.dump(out, sys.stdout, indent=2)
    sys.stderr.write(f'\nScraped {len(out)} results for "{query}"\n')

asyncio.run(main())
