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
        await page.goto("https://www.google.com/maps/search/restaurants+in+Koramangala/",
                         wait_until="networkidle", timeout=30000)
        await asyncio.sleep(4)

        # Get all listing links
        listings = await page.query_selector_all('div[role="feed"] a[href*="maps/place/"]')
        print(f"Found {len(listings)} listings")

        # For each listing, click it and extract details
        for i in range(min(2, len(listings))):
            try:
                card = listings[i]
                parent_div = await card.evaluate_handle("el => el.closest('div[jsaction]') || el.closest('div')")
                card_div = parent_div.as_element()

                # Click the card
                await card_div.click(force=True)
                await asyncio.sleep(2)
                await page.wait_for_load_state("networkidle", timeout=10000)
                await asyncio.sleep(1)

                # Get ALL text from the page
                text = await page.inner_text("body")

                # After clicking, the selected card might have a different class
                # Let me find elements with business names
                all_h2 = await page.query_selector_all("h2")
                print(f"\n--- Listing {i+1} ---")
                print(f"h2 elements: {len(all_h2)}")
                for h2 in all_h2:
                    t = await h2.inner_text()
                    t = t.strip()
                    if t and len(t) > 2:
                        print(f"  h2: '{t}'")

                # Try font class name selectors common in Google Maps
                for cls in ["fontHeadlineSmall", "DUwDvf", "fontTitleSmall"]:
                    els = await page.query_selector_all(f".{cls}")
                    for el in els:
                        t = (await el.inner_text()).strip()
                        if t and len(t) > 2 and t != "Results":
                            print(f"  .{cls}: '{t}'")

                # Get selected card text
                selected = await page.query_selector('[class*="Nv2PK"]')
                if selected:
                    print(f"  Nv2PK: '{(await selected.inner_text())[:100]}'")

            except Exception as e:
                print(f"  Error: {e}")

        await browser.close()

asyncio.run(main())
