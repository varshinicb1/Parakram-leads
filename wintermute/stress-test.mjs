/**
 * Wintermute API stress test
 * Hits the LIVE deployed Worker. Adjust counts to stay within your D1 free-tier
 * write quota (1,000 writes/day) — defaults below are conservative.
 *
 * Usage: node stress-test.mjs [leads] [concurrency] [reads]
 */

const BASE = 'https://wintermute-api.cbvarshini1.workers.dev/api/v1';
const EMAIL = 'admin@wintermute.ai';
const PASS = 'test123';

const N = parseInt(process.argv[2] || '100', 10);
const CONC = parseInt(process.argv[3] || '12', 10);
const READS = parseInt(process.argv[4] || '200', 10);

let TOKEN = '';

const CITIES = ['Bengaluru','Mumbai','Delhi','Hyderabad','Chennai','Pune','Kolkata','Ahmedabad','Jaipur','Lucknow'];
const INDUSTRIES = ['Restaurant','Clinic','Academy','Salon','Hotel','Store','Consultancy','Real Estate','Construction','Tech Solutions'];
const FIRST = ['Amit','Sneha','Rahul','Priya','Vikram','Anita','Rohit','Kavya','Suresh','Meera','Arjun','Neha'];
const LAST = ['Sharma','Verma','Patel','Nair','Reddy','Gupta','Khan','Iyer','Singh','Das'];

const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeLead(i) {
  const ind = rnd(INDUSTRIES);
  const fname = rnd(FIRST);
  const lname = rnd(LAST);
  const slug = `${ind}${i}`.replace(/\s+/g, '').toLowerCase();
  return {
    business_name: `${ind} ${i} ${rnd(CITIES)}`,
    owner_name: `${fname} ${lname}`,
    website: `https://${slug}.com`,
    email: `${slug}@example.com`,
    phone: `+91${Math.floor(9000000000 + Math.random() * 999999999)}`,
    city: rnd(CITIES),
    address: `${Math.floor(Math.random() * 999) + 1} Main Road`,
    country: 'India',
    source: 'csv_import',
  };
}

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      ...(opts.headers || {}),
    },
  });
  return res;
}

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  TOKEN = data.token;
  console.log(`[auth] logged in as ${EMAIL} (org ${data.user.org_id})`);
}

// Generic bounded-concurrency pool over an array of async thunks.
async function pool(items, worker, concurrency, onDone) {
  const results = [];
  let idx = 0;
  async function run() {
    while (idx < items.length) {
      const cur = idx++;
      const t0 = Date.now();
      try {
        const r = await worker(items[cur]);
        results.push({ ok: true, ms: Date.now() - t0, r });
      } catch (e) {
        results.push({ ok: false, ms: Date.now() - t0, err: String(e.message || e) });
      }
      if (onDone) onDone(results.length, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function stats(times) {
  if (!times.length) return { count: 0 };
  const s = [...times].sort((a, b) => a - b);
  const pct = (p) => s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
  const sum = s.reduce((a, b) => a + b, 0);
  return {
    count: s.length,
    avg: Math.round(sum / s.length),
    p50: pct(50),
    p95: pct(95),
    p99: pct(99),
    min: s[0],
    max: s[s.length - 1],
  };
}

function fmt(n) { return n.toLocaleString('en-US'); }

async function main() {
  await login();

  console.log(`\n=== Bulk create ${N} leads (concurrency ${CONC}) ===`);
  const leads = Array.from({ length: N }, (_, i) => makeLead(i));
  const tCreate0 = Date.now();
  const createRes = await pool(leads, async (ld) => {
    const res = await api('/leads', { method: 'POST', body: JSON.stringify(ld) });
    if (!res.ok) throw new Error(`create ${res.status}`);
    const j = await res.json();
    return j.id;
  }, CONC);
  const tCreate1 = Date.now();
  const createdIds = createRes.filter((r) => r.ok).map((r) => r.r);
  const createFails = createRes.filter((r) => !r.ok);
  console.log(`  created: ${createdIds.length}/${N}  failed: ${createFails.length}`);
  console.log(`  total time: ${((tCreate1 - tCreate0) / 1000).toFixed(1)}s  throughput: ${(createdIds.length / ((tCreate1 - tCreate0) / 1000)).toFixed(1)} leads/s`);
  console.log(`  latency/req:`, stats(createRes.map((r) => r.ms)));

  console.log(`\n=== Analyze ${createdIds.length} leads (concurrency ${CONC}) ===`);
  const tA0 = Date.now();
  const analyzeRes = await pool(createdIds, async (id) => {
    const res = await api(`/leads/${id}/analyze`, { method: 'POST' });
    if (!res.ok) throw new Error(`analyze ${res.status}`);
    return true;
  }, CONC);
  const tA1 = Date.now();
  const analyzed = analyzeRes.filter((r) => r.ok).length;
  console.log(`  analyzed: ${analyzed}/${createdIds.length}  failed: ${analyzeRes.filter((r) => !r.ok).length}`);
  console.log(`  total time: ${((tA1 - tA0) / 1000).toFixed(1)}s  throughput: ${(analyzed / ((tA1 - tA0) / 1000)).toFixed(1)} leads/s`);
  console.log(`  latency/req:`, stats(analyzeRes.map((r) => r.ms)));

  console.log(`\n=== Generate outreach for 30 leads ===`);
  const outIds = createdIds.slice(0, 30);
  const tO0 = Date.now();
  const outRes = await pool(outIds, async (id) => {
    const res = await api(`/leads/${id}/generate-outreach`, { method: 'POST', body: JSON.stringify({ channel: 'email' }) });
    if (!res.ok) throw new Error(`outreach ${res.status}`);
    return true;
  }, 8);
  const tO1 = Date.now();
  console.log(`  outreach generated: ${outRes.filter((r) => r.ok).length}/${outIds.length}`);
  console.log(`  latency/req:`, stats(outRes.map((r) => r.ms)));

  console.log(`\n=== Concurrent read test (${READS} mixed GETs, concurrency ${CONC}) ===`);
  const readThunks = Array.from({ length: READS }, (_, i) =>
    i % 2 === 0
      ? () => api('/leads?per_page=50&page=' + (1 + (i % 5)))
      : () => api('/leads/stats/dashboard')
  );
  const tR0 = Date.now();
  const readRes = await pool(readThunks, async (fn) => {
    const res = await fn();
    if (!res.ok) throw new Error(`read ${res.status}`);
    return true;
  }, CONC);
  const tR1 = Date.now();
  const readOk = readRes.filter((r) => r.ok).length;
  console.log(`  reads: ${readOk}/${READS}  failed: ${readRes.filter((r) => !r.ok).length}`);
  console.log(`  wall time: ${((tR1 - tR0) / 1000).toFixed(1)}s  throughput: ${(readOk / ((tR1 - tR0) / 1000)).toFixed(1)} req/s`);
  console.log(`  latency/req:`, stats(readRes.map((r) => r.ms)));

  console.log(`\n=== Cleanup: delete ${createdIds.length} test leads ===`);
  const tD0 = Date.now();
  const delRes = await pool(createdIds, async (id) => {
    const res = await api(`/leads/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error(`delete ${res.status}`);
    return true;
  }, CONC);
  const tD1 = Date.now();
  console.log(`  deleted: ${delRes.filter((r) => r.ok).length}/${createdIds.length}`);
  console.log(`  latency/req:`, stats(delRes.map((r) => r.ms)));

  const totalWrites = N /*create*/ + createdIds.length /*analyze*/ + outIds.length /*outreach*/ + createdIds.length /*delete*/;
  console.log(`\n=== SUMMARY ===`);
  console.log(`  Total D1 writes used by this run: ~${fmt(totalWrites)} (free tier: 1,000/day)`);
  console.log(`  Leads created+analyzed+deleted: ${createdIds.length}`);
  console.log(`  Concurrent reads served: ${readOk} @ ${((readOk / ((tR1 - tR0) / 1000))).toFixed(0)} req/s (p95 ${stats(readRes.map((r) => r.ms)).p95}ms)`);
  console.log(`  Any errors: ${createFails.length + analyzeRes.filter((r)=>!r.ok).length + outRes.filter((r)=>!r.ok).length + readRes.filter((r)=>!r.ok).length + delRes.filter((r)=>!r.ok).length}`);
}

main().catch((e) => {
  console.error('STRESS TEST FAILED:', e);
  process.exit(1);
});
