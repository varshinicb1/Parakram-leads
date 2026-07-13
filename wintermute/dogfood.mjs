/**
 * Wintermute DOGFOOD run — uses the live product on real prospects.
 * Target market: Indore (Tier-2 India) SMBs with weak digital presence.
 * Discovers (curated from public listings) -> ingests -> real website audit -> drafts outreach.
 *
 * Usage: node dogfood.mjs
 */

const BASE = 'https://wintermute-api.cbvarshini1.workers.dev/api/v1';
const EMAIL = 'admin@wintermute.ai';
const PASS = 'test123';
let TOKEN = '';

// Real Indore businesses gathered from public listings (Zomato / JustDial / ThreeBestRated / DataGemba).
// 'none' = no known owned website (audit reports full digital gap).
const LEADS = [
  { business_name: 'Cafe De Casa', website: 'none' },
  { business_name: '11:11 Coffee', website: 'none' },
  { business_name: 'Le Elementary Cafe', website: 'none' },
  { business_name: 'Mangosteen Cafe', website: 'none' },
  { business_name: 'Mr.Beans', website: 'mrbeans.in' },
  { business_name: 'Cafe Bake Well', website: 'none' },
  { business_name: 'Cafe @Blu', website: 'none' },
  { business_name: 'Chai Kaapi', website: 'none' },
  { business_name: 'Mocha Indore', website: 'none' },
  { business_name: 'Cafe Yolo', website: 'none' },
  { business_name: 'Shear Genius', website: 'none' },
  { business_name: 'Lakme Salon Saket', website: 'none' },
  { business_name: "Colors'lon Beauty", website: 'none' },
  { business_name: 'Selfie Unisex Salon', website: 'none' },
  { business_name: 'Orchid Unisex Salon', website: 'none' },
  { business_name: "Gold's Gym Vijay Nagar", website: 'none' },
  { business_name: 'Star Gym', website: 'none' },
  { business_name: 'THE LION GYM', website: 'none' },
  { business_name: 'Transform Gym', website: 'none' },
  { business_name: 'Anytime Fitness', website: 'none' },
];

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  if (!res.ok) throw new Error(`login failed ${res.status}`);
  const d = await res.json();
  TOKEN = d.token;
  console.log(`[auth] logged in as ${EMAIL} (org ${d.user.org_id})\n`);
}

async function api(path, opts = {}) {
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`, ...(opts.headers || {}) },
  });
}

const fmt = (n) => (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

async function main() {
  await login();
  const rows = [];
  for (const l of LEADS) {
    const c = await api('/leads', {
      method: 'POST',
      body: JSON.stringify({
        business_name: l.business_name,
        owner_name: 'Team',
        website: l.website,
        city: 'Indore',
        country: 'India',
        source: 'csv_import',
      }),
    });
    if (!c.ok) { rows.push({ ...l, error: `create ${c.status}` }); continue; }
    const lead = await c.json();

    const a = await api(`/leads/${lead.id}/analyze`, { method: 'POST' });
    const analyzed = await a.json();
    const analysis = JSON.parse(analyzed.ai_analysis_json || '{}');

    let draft = null;
    if (analysis.category && analysis.category !== 'cold') {
      const o = await api(`/leads/${lead.id}/generate-outreach`, {
        method: 'POST',
        body: JSON.stringify({ channel: 'email' }),
      });
      if (o.ok) {
        const m = await (await api(`/messages?lead_id=${lead.id}&channel=email`)).json();
        if (m.data && m.data.length) draft = m.data[0];
      }
    }
    rows.push({
      business_name: l.business_name,
      maturity: analyzed.digital_maturity_score,
      opp: analyzed.opportunity_score,
      cat: analysis.category,
      value: analysis.estimated_project_value,
      gaps: analysis.gaps || [],
      draft,
    });
  }

  console.log('BUSINESS'.padEnd(24), 'CAT  ', 'MAT', 'OPP', 'EST. VALUE', ' TOP GAPS');
  console.log('-'.repeat(100));
  let hot = 0, warm = 0, cold = 0, totalValue = 0;
  for (const r of rows) {
    if (r.error) { console.log(r.business_name.padEnd(24), 'ERR ', r.error); continue; }
    const cat = (r.cat || '').toUpperCase();
    if (cat === 'HOT') hot++; else if (cat === 'WARM') warm++; else cold++;
    totalValue += r.value || 0;
    const gaps = r.gaps.slice(0, 3).join(', ');
    console.log(
      r.business_name.slice(0, 23).padEnd(24),
      cat.padEnd(5),
      String(r.maturity).padEnd(4),
      String(r.opp).padEnd(4),
      ('₹' + fmt(r.value)).padEnd(11),
      gaps
    );
  }

  console.log('\n=== SUMMARY ===');
  console.log(`  Leads ingested+audited: ${rows.filter(r => !r.error).length}`);
  console.log(`  HOT: ${hot}   WARM: ${warm}   COLD: ${cold}`);
  console.log(`  Total estimated pipeline value: ₹${fmt(totalValue)}`);
  console.log(`  Outreach drafts generated: ${rows.filter(r => r.draft).length}`);

  console.log('\n=== SAMPLE OUTREACH DRAFTS (HOT/WARM) ===');
  for (const r of rows.filter(r => r.draft)) {
    console.log(`\n--- ${r.business_name} [${r.cat.toUpperCase()}] ---`);
    console.log('Subject:', r.draft.subject);
    console.log(r.draft.body.split('\n').slice(0, 6).join('\n'));
  }
}

main().catch((e) => { console.error('DOGFOOD RUN FAILED:', e); process.exit(1); });
