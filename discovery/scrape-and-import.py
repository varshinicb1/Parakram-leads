"""Scrape Google Maps for small businesses without websites, then import into Wintermute."""

import asyncio, sys, json, re, os, subprocess

from gmaps_scraper import scrape_batch, ScrapeConfig

CATEGORIES = [
    "restaurants", "salons", "clinics", "gyms", "pharmacies",
    "beauty parlors", "bakeries", "tailors", "laundromats",
    "kirana stores", "general stores", "stationery shops",
    "electronic repair", "mobile repair", "car repair",
    "auto repair", "plumbers", "electricians", "carpenters",
    "packers movers", "tution classes", "coaching centers",
    "cafes", "fast food", "dental clinics", "optical stores",
    "hardware stores", "painting contractors",
]

async def main():
    city = os.environ.get("CITY", "Bangalore")
    limit = int(os.environ.get("LIMIT", "15"))

    all_results = []
    seen = set()

    for cat in CATEGORIES:
        try:
            url = f"https://www.google.com/maps/search/{cat}+in+{city.replace(' ', '+')}"
            config = ScrapeConfig(concurrency=3, headless=True, max_results=limit)
            results = await scrape_batch([url], config)
            count = 0
            for r in results:
                if r.success and r.place and r.place.name:
                    p = r.place
                    name = p.name.split(" | ")[0].strip()[:80]
                    phone = re.sub(r"[^\d+]", "", (p.phone or "").replace("\ue0b0", ""))
                    if phone and phone in seen:
                        continue
                    if phone:
                        seen.add(phone)
                    all_results.append({
                        "name": name,
                        "phone": phone,
                        "website": p.website or None,
                        "address": (p.address or "").replace("\ue0c8", "").strip(),
                        "category": (p.category or "").strip() or None,
                        "rating": p.rating,
                        "reviews": p.review_count,
                        "city": city,
                    })
                    count += 1
            print(f"  {cat}: {count} unique")
        except Exception as e:
            print(f"  {cat} FAILED: {e}")

    no_web = [r for r in all_results if not r.get("website")]
    print(f"\nTotal: {len(all_results)}, No website: {len(no_web)}")

    if not no_web:
        print("No leads to import")
        return

    with open("scrape-output.json", "w") as f:
        json.dump(no_web, f, indent=2)

    api_email = os.environ.get("API_EMAIL")
    api_password = os.environ.get("API_PASSWORD")
    if api_email and api_password:
        result = subprocess.run(
            ["node", "discovery/adapter.mjs"],
            input=open("scrape-output.json", "rb").read(),
            capture_output=True,
        )
        out = result.stdout.decode()
        err = result.stderr.decode()
        if out:
            print(out)
        if err:
            print("STDERR:", err)
        print(f"Adapter exit code: {result.returncode}")
    else:
        print("API_EMAIL/PASSWORD not set, output in scrape-output.json")

if __name__ == "__main__":
    asyncio.run(main())
