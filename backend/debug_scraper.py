import asyncio
import sys, re
sys.path.insert(0, "/app")
from app.services.scraper import fetch_page
from bs4 import BeautifulSoup

async def test():
    # 1. Google Search
    print("=== Google Search HTML ===")
    html = await fetch_page("https://www.google.com/search?q=restaurants+in+Koramangala+Bangalore+phone+number")
    print(f"Length: {len(html) if html else 0}")
    if html and len(html) > 100:
        soup = BeautifulSoup(html, "html.parser")
        title = soup.title.string if soup.title else "No title"
        print(f"Title: {title[:100]}")
        h3s = soup.find_all("h3")
        print(f"H3 tags: {len(h3s)}")
        for h3 in h3s[:5]:
            print(f"  H3: {h3.get_text(strip=True)[:80]}")
        # Find phone numbers
        phones = re.findall(r'[6-9]\d{9}', html)
        print(f"Phone numbers found: {len(phones)}")
        for p in phones[:5]:
            print(f"  {p}")

    # 2. Google Maps
    print("\n=== Google Maps HTML ===")
    html2 = await fetch_page("https://www.google.com/maps/search/Restaurants+in+Koramangala+Bangalore/")
    print(f"Length: {len(html2) if html2 else 0}")
    if html2 and len(html2) > 100:
        phones2 = re.findall(r'[6-9]\d{9}', html2)
        print(f"Phone numbers found: {len(phones2)}")
        for p in phones2[:5]:
            print(f"  {p}")
        # Check JSON in script tags
        scripts = BeautifulSoup(html2, "html.parser").find_all("script")
        print(f"Script tags: {len(scripts)}")

    # 3. Sulekha
    print("\n=== Sulekha HTML ===")
    html3 = await fetch_page("https://www.sulekha.com/restaurants-in-bangalore")
    print(f"Length: {len(html3) if html3 else 0}")
    if html3 and len(html3) > 100:
        soup3 = BeautifulSoup(html3, "html.parser")
        print(f"Title: {soup3.title.string if soup3.title else 'No title'}")
        phones3 = re.findall(r'[6-9]\d{9}', html3)
        print(f"Phone numbers found: {len(phones3)}")
        for p in phones3[:5]:
            print(f"  {p}")

asyncio.run(test())
