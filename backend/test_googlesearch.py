from googlesearch import search
import re

query = "restaurants in koramangala bangalore phone number contact"
print(f"Searching: {query}")
results = list(search(query, num_results=20))
print(f"Found {len(results)} results")
for r in results[:5]:
    print(f"  {r[:120]}")
