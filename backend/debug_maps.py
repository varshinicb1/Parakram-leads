import asyncio, sys, re
sys.path.insert(0, "/app")
from app.services.scraper import fetch_page

async def test():
    html = await fetch_page("https://www.google.com/maps/search/Restaurants+in+Koramangala+Bangalore/")
    # Find context around phone numbers
    for m in re.finditer(r'[6-9]\d{9}', html):
        start = max(0, m.start() - 200)
        end = min(len(html), m.end() + 200)
        ctx = html[start:end]
        # Find a name-like string near this phone
        names = re.findall(r'"([A-Z][A-Za-z0-9\s\.&\-]{3,60})"', ctx)
        print(f"Phone: {m.group()}")
        for n in names[:3]:
            print(f"  Near name: {n}")
        print()

asyncio.run(test())
