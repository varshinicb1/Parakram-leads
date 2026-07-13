import asyncio, sys, json
from gmaps_scraper import scrape_batch, ScrapeConfig

async def main():
    queries = [
        "restaurants in Indore",
        "salons in Indore",
        "gyms in Indore",
        "clinics in Indore",
        "schools in Indore",
    ]
    
    all_results = []
    seen = set()
    
    for query in queries:
        url = f'https://www.google.com/maps/search/{query.replace(" ", "+")}'
        config = ScrapeConfig(concurrency=2, headless=True, max_results=3)
        try:
            results = await scrape_batch([url], config)
            for r in results:
                if r.success and r.place and r.place.name:
                    p = r.place
                    key = (p.name or '').strip().lower()
                    if key and key not in seen:
                        seen.add(key)
                        phone = (p.phone or '').replace('\ue0b0', '').replace('\n', '').strip()
                        all_results.append({
                            "name": p.name.strip(),
                            "phone": phone,
                            "website": p.website,
                            "address": p.address,
                            "category": p.category,
                            "rating": p.rating,
                            "reviews": p.review_count,
                        })
            sys.stderr.write(f'  "{query}": {sum(1 for r in results if r.success and r.place)} results\n')
        except Exception as e:
            sys.stderr.write(f'  "{query}" failed: {e}\n')
    
    json.dump(all_results, sys.stdout, indent=2)
    sys.stderr.write(f'\nTotal unique leads scraped: {len(all_results)}\n')

asyncio.run(main())
