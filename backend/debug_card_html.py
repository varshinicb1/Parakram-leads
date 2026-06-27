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
        await asyncio.sleep(3)

        # Get the first listing card's HTML
        card = await page.query_selector('div[role="feed"] a[href*="maps/place/"]')
        if card:
            parent_div = await card.evaluate_handle("el => el.closest('[role=\"feed\"] > div > div, .m6QErb > div > div') or el.closest('div[jslog]')")
            card_html = await parent_div.as_element().inner_html() if parent_div else "no parent"
            print("=== FIRST CARD HTML ===")
            print(card_html[:3000])

        # Click it and get the detail panel
        print("\n=== Now clicking ===")
        card_parent = await card.evaluate_handle("el => el.closest('div')")
        await card_parent.as_element().click(force=True)
        await asyncio.sleep(3)

        # Look for the detail panel - might be in a different element
        panels = await page.query_selector_all('[class*="m6QErb"][class*="DxyBCb"]')
        print(f"Panels found: {len(panels)}")

        # Get all major divs
        all_divs = await page.query_selector_all("div[role='main'], div[class*='widget'], div[class*='pane']")
        print(f"Major divs: {len(all_divs)}")

        # Try to find the detail widget
        widget = await page.query_selector('[class*="widget-pane"]')
        if widget:
            print("Found widget-pane")
            html = await widget.inner_html()
            print(html[:2000])

        # Or maybe it's in a sidebar
        sidebar = await page.query_selector('[role="complementary"]')
        if sidebar:
            print("\n=== COMPLEMENTARY ===")
            print(await sidebar.inner_text()[:1000])

        # The name might be in the card itself under a specific class
        name_els = await page.query_selector_all(".fontHeadlineSmall, .fontTitleSmall, .fontBodyMedium span")
        print(f"\nName elements: {len(name_els)}")
        for el in name_els[:10]:
            text = await el.inner_text()
            print(f"  '{text}'")

        await browser.close()

asyncio.run(main())
