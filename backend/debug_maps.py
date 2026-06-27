import asyncio
from playwright.async_api import async_playwright

async def debug():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-gpu"]
        )
        page = await browser.new_page(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            locale="en-IN",
        )
        await page.goto("https://www.google.com/maps/search/Restaurants+in+Koramangala/", timeout=60000)
        await asyncio.sleep(10)

        # Try query_selector_all matching scraper
        listings = await page.query_selector_all('a[href*="maps/place/"]')
        print(f"query_selector_all found: {len(listings)}")

        # Try with content search
        html = await page.content()
        print(f"Page length: {len(html)} chars")
        has_feed = "role=\"feed\"" in html
        has_links = "maps/place/" in html
        print(f"Has feed: {has_feed}")
        print(f"Has maps/place links: {has_links}")

        # Take screenshot
        await page.screenshot(path="/tmp/debug_maps2.png", full_page=True)
        print("Screenshot saved")

        await browser.close()

asyncio.run(debug())
print("Done")
