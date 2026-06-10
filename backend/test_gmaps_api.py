import httpx
import re
import json

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}

# Try Google Search for business listings
query = "site:justdial.com restaurants koramangala bangalore phone"
url = f"https://www.google.com/search?q={query}"
r = httpx.get(url, headers=headers, timeout=30, follow_redirects=True)
print(f"Google Search: {r.status_code}, {len(r.text)} bytes")

# Check if we got results
if "justdial" in r.text.lower():
    print("Got JustDial listings from Google")

# Also try google maps API directly
maps_url = "https://www.google.com/maps/search/restaurants+in+Koramangala+Bangalore/?hl=en"
r2 = httpx.get(maps_url, headers=headers, timeout=30, follow_redirects=True)
print(f"Google Maps direct: {r2.status_code}, {len(r2.text)} bytes")

# Let's also try indiamart
im_url = "https://www.indiamart.com/restaurants-bangalore/"
r3 = httpx.get(im_url, headers=headers, timeout=30, follow_redirects=True)
print(f"IndiaMART: {r3.status_code}, {len(r3.text)} bytes")
if r3.status_code == 200:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(r3.text, "html.parser")
    titles = [h2.get_text(strip=True)[:80] for h2 in soup.find_all("h2")[:5]]
    print(f"  Titles: {titles}")
    phones = re.findall(r'[\+\d\s\-\(\)]{10,}', r3.text)[:5]
    print(f"  Phones: {phones}")
