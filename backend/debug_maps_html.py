import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir="/tmp/playwright_data",
            headless=True,
            args=["--no-sandbox"],
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            locale="en-IN",
        )
        page = await browser.new_page()
        await page.goto("https://www.google.com/maps/search/restaurants+in+Koramangala/", wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(5)

        # Try different selectors
        selectors = [
            'a[href*="maps/place/"]',
            '[role="article"]',
            '[class*="Nv2PK"]',
            '[class*="hfpxzc"]',
            '[class*="container"]',
            'a[class*="place"]',
            'div[role="feed"] > div > a',
            'div[role="feed"] a',
            'a[class*="place-card"]',
            '[data-place-id]',
        ]

        for sel in selectors:
            els = await page.query_selector_all(sel)
            print(f"Selector '{sel}': {len(els)} elements")

        # Dump page structure around the feed area
        feed = await page.query_selector('[role="feed"]')
        if feed:
            print("\n=== FEED FOUND ===")
            html = await feed.inner_html()
            print(html[:3000])
        else:
            print("\n=== NO FEED ===")
            body = await page.inner_text("body")
            print(body[:2000])

        # Get all links
        links = await page.query_selector_all("a")
        print(f"\nTotal links: {len(links)}")
        for a in links[:20]:
            href = await a.get_attribute("href") or ""
            text = await a.inner_text() or ""
            text = text.strip()[:60]
            if href and ("maps/place" in href or "place" in href):
                print(f"  Link: href={href[:80]} text={text}")

        await browser.close()

asyncio.run(main())
