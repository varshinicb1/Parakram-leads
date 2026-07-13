import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

const query = process.argv[2] || 'restaurants in Indore';
const maxResults = parseInt(process.argv[3], 10) || 10;
const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

const pyScript = `
import asyncio, sys, json
from gmaps_scraper import scrape_batch, ScrapeConfig, PlaceDetails

async def main():
    config = ScrapeConfig(concurrency=3, headless=True, max_results=${maxResults})
    results = await scrape_batch(["${url}"], config)
    out = []
    for r in results:
        if r.success and r.place:
            p = r.place
            out.append({
                "name": p.name,
                "phone": p.phone,
                "website": p.website,
                "address": p.address,
                "category": p.category,
                "rating": p.rating,
                "reviews": p.review_count,
                "city": "",
            })
    print(json.dumps(out, indent=2))

asyncio.run(main())
`;

const py = spawn('python', ['-c', pyScript], { stdio: ['ignore', 'pipe', 'pipe'] });
let stdout = '', stderr = '';
py.stdout.on('data', (d) => stdout += d);
py.stderr.on('data', (d) => stderr += d);
py.on('close', (code) => {
  if (code !== 0) {
    console.error('Scraper failed:', stderr.slice(0, 500));
    process.exit(1);
  }
  const outFile = 'scrape-output.json';
  writeFileSync(outFile, stdout);
  console.log(`Wrote ${outFile} (${stdout.trim().split('\\n').length} lines)`);
  console.log(stdout);
});
