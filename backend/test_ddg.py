from duckduckgo_search import DDGS
import re

with DDGS() as ddgs:
    query = "restaurants in koramangala bangalore phone number"
    results = list(ddgs.text(query, max_results=15))
    print(f"Found {len(results)} results")
    for r in results[:5]:
        print(f"  Title: {r.get('title','')[:80]}")
        print(f"  URL: {r.get('href','')[:80]}")
        print(f"  Snippet: {r.get('body','')[:120]}")
        print()
