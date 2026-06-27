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
        await page.goto("https://www.google.com/maps/search/restaurants+in+Koramangala/", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(3)

        # Click first listing
        listing = await page.query_selector('div[role="feed"] a[href*="maps/place/"]')
        if listing:
            parent = await listing.evaluate_handle("el => el.closest('div')")
            await parent.as_element().click(force=True)
            await asyncio.sleep(3)

            # Get inner text of the whole page to find business name
            body = await page.inner_text("body")
            lines = [l.strip() for l in body.split("\n") if l.strip()]
            print("Page text (first 80 lines):")
            for i, l in enumerate(lines[:80]):
                print(f"  [{i}] {l}")

            # Look for the sidebar panel specifically
            panel = await page.query_selector('[role="main"]')
            if panel:
                html = await panel.inner_html()
                print("\n\n=== MAIN PANEL HTML (first 2000 chars) ===")
                print(html[:2000])

        await browser.close()

asyncio.run(main())
