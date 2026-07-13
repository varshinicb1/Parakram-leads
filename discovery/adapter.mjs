const API = process.env.API_URL || 'https://wintermute-api.cbvarshini1.workers.dev/api/v1';
const EMAIL = process.env.API_EMAIL;
const PASSWORD = process.env.API_PASSWORD;

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('Set API_EMAIL and API_PASSWORD');
    process.exit(1);
  }

  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!loginRes.ok) {
    const err = await loginRes.text();
    console.error(`Login failed (${loginRes.status}): ${err}`);
    process.exit(1);
  }
  const loginData = await loginRes.json();
  const token = loginData.access_token || loginData.token;
  const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const existingPhones = new Set();
  try {
    const existingRes = await fetch(`${API}/leads?source=google_maps&per_page=1000`, { headers: authHeaders });
    if (existingRes.ok) {
      const existing = await existingRes.json();
      (existing.data || []).forEach((l) => {
        if (l.phone) existingPhones.add(l.phone.replace(/\s+/g, ''));
        if (l.website) existingPhones.add(l.website.replace(/^https?:\/\//, '').replace(/\/$/, ''));
      });
    }
  } catch (e) {
    console.warn('Dedup fetch failed:', e);
  }

  // Read from stdin (JSON array of scraper output)
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  const input = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  if (!Array.isArray(input)) input = [input];

  let created = 0;
  let skipped = 0;
  const createdIds = [];

  for (const item of input) {
    const phone = (item.phone || '').replace(/\s+/g, '').replace(/[^\d+]/g, '');
    const website = (item.website || '').replace(/^https?:\/\//, '').replace(/\/$/, '');

    if (phone && existingPhones.has(phone)) { skipped++; continue; }
    if (website && existingPhones.has(website)) { skipped++; continue; }

    const lead = {
      business_name: (item.name || item.business_name || '').trim() || 'Unknown',
      source: 'google_maps',
      category: item.category || null,
      notes: '',
    };

    if (phone) lead.phone = phone;
    if (website) lead.website = `https://${website}`;
    if (item.address) lead.address = item.address;
    if (item.email) lead.email = item.email;
    if (item.city) lead.city = item.city;
    else if (item.address) lead.city = extractCity(item.address);
    if (item.rating != null) lead.notes += `Rating: ${item.rating}/5`;
    if (item.reviews != null) lead.notes += (lead.notes ? ', ' : '') + `Reviews: ${item.reviews}`;

    const res = await fetch(`${API}/leads`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(lead),
    });
    if (res.ok) {
      const createdLead = await res.json();
      createdIds.push(createdLead.id);
      created++;
    } else {
      const err = await res.text();
      console.error(`Failed to create lead "${lead.business_name}": ${res.status} ${err}`);
    }
  }

  let analyzed = 0;
  if (createdIds.length > 0) {
    try {
      const analysisRes = await fetch(`${API}/intelligence/batch-score`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ lead_ids: createdIds }),
      });
      if (analysisRes.ok) analyzed = createdIds.length;
    } catch (e) {
      console.error('Analysis error:', e);
    }
  }

  console.log(`Result: ${created} created, ${analyzed} analyzed, ${skipped} skipped`);
}

function extractCity(address) {
  const knownCities = ['Bangalore','Bengaluru','Indore','Mumbai','Delhi','Pune','Hyderabad','Chennai','Kolkata','Ahmedabad','Jaipur','Lucknow','Surat','Goa','Chandigarh'];
  const upper = address.toUpperCase();
  for (const city of knownCities) {
    if (upper.includes(city.toUpperCase())) return city;
  }
  return '';
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
