import httpx
from bs4 import BeautifulSoup

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

r = httpx.get("https://www.justdial.com/Bangalore/Restaurants", headers=headers, timeout=30, follow_redirects=True)
print(f"Status: {r.status_code}")
print(f"Length: {len(r.text)}")
soup = BeautifulSoup(r.text, "html.parser")
print(f"Title: {soup.title.string if soup.title else 'No title'}")

cards = soup.select("li[data-href], .cntanr, .store-details")
print(f"Cards: {len(cards)}")

h2s = soup.find_all("h2")
print(f"H2 tags: {len(h2s)}")
for h2 in h2s[:3]:
    txt = h2.get_text(strip=True)[:100]
    print(f"  H2: {txt}")

# Check for phone numbers
import re
phones = re.findall(r'[\+\d\s\-\(\)]{10,}', r.text)
print(f"Phone matches: {len(phones)}")
for p in phones[:5]:
    print(f"  {p.strip()}")
