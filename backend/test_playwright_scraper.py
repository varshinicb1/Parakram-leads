import asyncio
from app.services.scraper import scrape_google_maps_browser
from app.services.scraper import scrape_justdial_httpx
from app.services.scraper import JUSTDIAL_CATEGORIES, BANGALORE_LOCATIONS


async def test_maps():
    print("=== Google Maps Playwright Scraper ===")
    leads = await scrape_google_maps_browser("Restaurants", "Koramangala", max_results=5)
    print(f"Found {len(leads)} leads:")
    for l in leads:
        print(f'  {l["business_name"]} | {l["phone"]} | website: {l["website"]}')


async def test_google_search():
    """Try Google Search as an API-based approach"""
    print("\n=== Google Search API ===")
    try:
        from googlesearch import search
        results = list(search("site:justdial.com restaurants Koramangala", num_results=5))
        for r in results:
            print(f"  {r}")
    except Exception as e:
        print(f"  Error: {e}")


async def test_duckduckgo():
    """Try DuckDuckGo as an API-based approach"""
    print("\n=== DuckDuckGo API ===")
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            for i, r in enumerate(ddgs.text("restaurants in Koramangala Bangalore", max_results=5)):
                print(f'  {r["title"]} | {r["href"]}')
    except Exception as e:
        print(f"  Error: {e}")


async def test_httpx_justdial_better():
    """Try JustDial with better headers and session handling"""
    print("\n=== JustDial (improved) ===")
    import httpx
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Cache-Control": "max-age=0",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
    }
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        # First visit homepage to get cookies
        await client.get("https://www.justdial.com/", headers=headers)
        resp = await client.get(
            "https://www.justdial.com/Koramangala/Restaurants",
            headers=headers,
        )

        import re
        print(f"Status: {resp.status_code}, Length: {len(resp.text)}, URL: {resp.url}")
        phones = re.findall(r"[6-9]\d{9}", resp.text)
        names = re.findall(r'"storeName":"([^"]+)"', resp.text)
        print(f"Phones: {len(phones)}, Names: {len(names)}")


async def main():
    # Try Playwright first
    await test_maps()

    # Try API-based
    await test_duckduckgo()
    await test_httpx_justdial_better()


asyncio.run(main())
