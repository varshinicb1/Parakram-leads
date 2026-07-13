"""Scrape businesses from multiple cities and categories, output JSON for adapter."""
import asyncio, sys, json, re
from gmaps_scraper import scrape_batch, ScrapeConfig

def clean_name(raw):
    """Strip Google Maps subtitle/description from the business name."""
    name = (raw or '').strip()
    # Take only before first pipe or double-dash
    for sep in [' | ', '  |  ', ' — ', ' – ']:
        idx = name.find(sep)
        if idx > 0 and idx < 60:
            name = name[:idx].strip()
    # Remove common suffixes
    name = re.sub(r'\s*-\s*Best\s.*$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s*#\w+\s*$', '', name)
    return name.strip()[:80]

def clean_phone(raw):
    if not raw:
        return ''
    return re.sub(r'[^\d+]', '', raw.replace('\ue0b0', '').replace('\n', ''))

async def main():
    queries = [
        ("restaurants in Pune", "Pune"),
        ("salons in Pune", "Pune"),
        ("clinics in Pune", "Pune"),
        ("restaurants in Jaipur", "Jaipur"),
    ]

    all_results = []
    seen_phones = set()

    for query_str, city in queries:
        url = f'https://www.google.com/maps/search/{query_str.replace(" ", "+")}'
        config = ScrapeConfig(concurrency=2, headless=True, max_results=4)
        try:
            results = await scrape_batch([url], config)
            for r in results:
                if not r.success or not r.place or not r.place.name:
                    continue
                p = r.place
                name = clean_name(p.name)
                phone = clean_phone(p.phone)
                # Dedup by phone
                if phone and phone in seen_phones:
                    continue
                if phone:
                    seen_phones.add(phone)

                all_results.append({
                    "name": name,
                    "phone": phone,
                    "website": p.website,
                    "address": (p.address or '').replace('\ue0c8', '').strip(),
                    "category": (p.category or '').strip() or None,
                    "rating": p.rating,
                    "reviews": p.review_count,
                    "city": city,
                })
            sys.stderr.write(f'  {query_str}: {len([r for r in results if r.success and r.place])} results\n')
        except Exception as e:
            sys.stderr.write(f'  {query_str} failed: {e}\n')

    # Filter out entries with no phone and no website (too little data)
    all_results = [r for r in all_results if r['phone'] or r['website']]

    json.dump(all_results, sys.stdout, indent=2)
    sys.stderr.write(f'\nTotal unique leads: {len(all_results)}\n')

asyncio.run(main())
