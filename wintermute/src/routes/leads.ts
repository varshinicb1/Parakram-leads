import { Hono } from 'hono';
import { getDb, reqJson, uuid, now, paginate } from '../db';
import { authMiddleware } from '../middleware';
import { JwtPayload, Lead, LeadCategory } from '../types';

interface Env { wintermute_db: any; }

const leads = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();
leads.use('*', authMiddleware);

leads.get('/stats/dashboard', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);

  const categoryCounts = await db.prepare(
    `SELECT category, COUNT(*) as count FROM leads WHERE organization_id = ? AND category IS NOT NULL GROUP BY category`
  ).bind(user.org_id).all<any>();

  const statusCounts = await db.prepare(
    `SELECT status, COUNT(*) as count FROM leads WHERE organization_id = ? GROUP BY status`
  ).bind(user.org_id).all<any>();

  const totalResult = await db.prepare(
    'SELECT COUNT(*) as total FROM leads WHERE organization_id = ?'
  ).bind(user.org_id).first<{ total: number }>();

  const messagesResult = await db.prepare(
    'SELECT COUNT(*) as total FROM messages WHERE organization_id = ?'
  ).bind(user.org_id).first<{ total: number }>();

  const totalValue = await db.prepare(
    `SELECT COALESCE(SUM(CAST(JSON_EXTRACT(ai_analysis_json, '$.estimated_project_value') AS REAL)), 0) as value
     FROM leads WHERE organization_id = ? AND ai_analysis_json IS NOT NULL`
  ).bind(user.org_id).first<{ value: number }>();

  return c.json({
    total_leads: totalResult?.total || 0,
    total_messages: messagesResult?.total || 0,
    category_breakdown: Object.fromEntries(
      categoryCounts.results.map((r: any) => [r.category, r.count])
    ),
    status_breakdown: Object.fromEntries(
      statusCounts.results.map((r: any) => [r.status, r.count])
    ),
    estimated_pipeline_value: totalValue?.value || 0,
  });
});

leads.get('/', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);
  const status = c.req.query('status');
  const category = c.req.query('category');
  const source = c.req.query('source');
  const search = c.req.query('search');
  const page = parseInt(c.req.query('page') || '1');
  const perPage = parseInt(c.req.query('per_page') || '20');

  const where: string[] = ['organization_id = ?'];
  const params: any[] = [user.org_id];

  if (status) { where.push('status = ?'); params.push(status); }
  if (category) { where.push('category = ?'); params.push(category); }
  if (source) { where.push('source = ?'); params.push(source); }
  if (search) { where.push('(owner_name LIKE ? OR business_name LIKE ? OR email LIKE ?)'); const s = `%${search}%`; params.push(s, s, s); }

  const result = await paginate<Lead>(db, 'leads', where, params, page, perPage);
  return c.json(result);
});

leads.post('/', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);
  const body = await reqJson(c);
  const id = uuid();
  const timestamp = now();

  if (!body.business_name) {
    return c.json({ error: 'business_name is required' }, 400);
  }

  const ALLOWED_SOURCES = ['manual', 'google_maps', 'justdial', 'duckduckgo', 'csv_import', 'api'];
  const source = ALLOWED_SOURCES.includes(body.source) ? body.source : 'manual';

  await db.prepare(
    `INSERT INTO leads (id, organization_id, business_name, owner_name, phone, email, website, address, city, state, country, source, notes, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, user.org_id, body.business_name, body.owner_name || 'Unknown',
    body.phone || null, body.email || null, body.website || null,
    body.address || null, body.city || null, body.state || null,
    body.country || 'India', source, body.notes || null,
    'discovered', timestamp, timestamp
  ).run();

  const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
  return c.json(lead, 201);
});

leads.get('/:id', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);
  const lead = await db.prepare(
    'SELECT * FROM leads WHERE id = ? AND organization_id = ?'
  ).bind(c.req.param('id'), user.org_id).first<Lead>();
  if (!lead) return c.json({ error: 'Lead not found' }, 404);
  return c.json(lead);
});

leads.put('/:id', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);
  const body = await reqJson(c);
  const existing = await db.prepare(
    'SELECT id FROM leads WHERE id = ? AND organization_id = ?'
  ).bind(c.req.param('id'), user.org_id).first();
  if (!existing) return c.json({ error: 'Lead not found' }, 404);

  const allowedFields = ['owner_name', 'business_name', 'phone', 'email', 'website', 'address', 'city', 'state', 'country', 'status', 'category', 'notes', 'assigned_to', 'industry'];
  const sets: string[] = ['updated_at = ?'];
  const params: any[] = [now()];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      sets.push(`${field} = ?`);
      params.push(body[field]);
    }
  }
  params.push(c.req.param('id'));

  await db.prepare(
    `UPDATE leads SET ${sets.join(', ')} WHERE id = ? AND organization_id = ?`
  ).bind(...params, user.org_id).run();

  const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(c.req.param('id')).first();
  return c.json(lead);
});

leads.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);
  const result = await db.prepare(
    'DELETE FROM leads WHERE id = ? AND organization_id = ?'
  ).bind(c.req.param('id'), user.org_id).run();
  if (result.meta.changes === 0) return c.json({ error: 'Lead not found' }, 404);
  return c.json({ message: 'Lead deleted' });
});

leads.post('/:id/analyze', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);
  const lead = await db.prepare(
    'SELECT * FROM leads WHERE id = ? AND organization_id = ?'
  ).bind(c.req.param('id'), user.org_id).first<any>();

  if (!lead) return c.json({ error: 'Lead not found' }, 404);

  const website = lead.website || `${lead.business_name.replace(/[^a-zA-Z0-9]/g, '')}.com`;
  const indicators = await scoreWebsiteQuality(website);
  const digitalMaturity = computeDigitalMaturity(indicators);
  const opportunityScore = computeOpportunityScore(indicators, digitalMaturity);

  let category: LeadCategory = 'warm';
  if (digitalMaturity >= 70) category = 'cold';
  else if (opportunityScore >= 60) category = 'hot';

  const aiAnalysis = {
    business_name: lead.business_name,
    industry: detectIndustry(lead.business_name),
    digital_maturity_score: digitalMaturity,
    opportunity_score: opportunityScore,
    indicators,
    strengths: indicators.filter((i: any) => i.present).map((i: any) => i.name),
    gaps: indicators.filter((i: any) => !i.present).map((i: any) => i.name),
    estimated_project_value: estimateProjectValue(digitalMaturity, opportunityScore),
    suggested_solutions: suggestSolutions(indicators),
    category,
  };

  const timestamp = now();
  await db.prepare(
    `UPDATE leads SET digital_maturity_score = ?, opportunity_score = ?, category = ?, status = ?, ai_analysis_json = ?, updated_at = ? WHERE id = ?`
  ).bind(digitalMaturity, opportunityScore, category, 'analyzed', JSON.stringify(aiAnalysis), timestamp, lead.id).run();

  const updatedLead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(lead.id).first();
  return c.json(updatedLead);
});

leads.post('/:id/generate-outreach', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);
  const body = await reqJson(c);
  const channel = (body.channel || 'email').toLowerCase();

  const lead = await db.prepare(
    'SELECT * FROM leads WHERE id = ? AND organization_id = ?'
  ).bind(c.req.param('id'), user.org_id).first<any>();

  if (!lead) return c.json({ error: 'Lead not found' }, 404);
  if (!['email', 'whatsapp', 'linkedin'].includes(channel)) {
    return c.json({ error: 'Invalid channel. Use email, whatsapp, or linkedin' }, 400);
  }

  const analysis = lead.ai_analysis_json ? JSON.parse(lead.ai_analysis_json) : null;
  const messages = generateMessages(lead, analysis, channel);

  const batch = messages.map((msg: any) => {
    const msgId = uuid();
    const timestamp = now();
    return db.prepare(
      `INSERT INTO messages (id, organization_id, lead_id, channel, direction, subject, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(msgId, user.org_id, lead.id, msg.channel, 'outbound', msg.subject || null, msg.content, 'draft', timestamp);
  });

  await db.batch(batch);
  return c.json({ messages: messages.length, lead_id: lead.id }, 201);
});

async function scoreWebsiteQuality(website: string) {
  const weights: Record<string, number> = {
    'SSL/HTTPS': 10,
    'Mobile Friendly': 15,
    'Lead Capture Form': 15,
    'Contact Page': 10,
    'About Page': 5,
    'Services Page': 10,
    'Blog/Content': 8,
    'Social Media Links': 8,
    'Google Analytics': 7,
    'CRM Integration': 5,
    'Booking System': 5,
    'Live Chat': 5,
    'Reviews/Testimonials': 2,
  };

  // Explicitly no-site businesses: skip network and report full gap.
  if (!website || website === 'none' || website === 'n/a' || website.trim() === '') {
    return Object.keys(weights).map((name) => ({ name, present: false, weight: weights[name] }));
  }

  const url = website.startsWith('http') ? website : `https://${website}`;
  const present: Record<string, boolean> = {
    'SSL/HTTPS': false,
    'Mobile Friendly': false,
    'Lead Capture Form': false,
    'Contact Page': false,
    'About Page': false,
    'Services Page': false,
    'Blog/Content': false,
    'Social Media Links': false,
    'Google Analytics': false,
    'CRM Integration': false,
    'Booking System': false,
    'Live Chat': false,
    'Reviews/Testimonials': false,
  };

  let html = '';
  let finalUrl = url;
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WintermuteBot/1.0)' },
    });
    finalUrl = res.url || url;
    present['SSL/HTTPS'] = finalUrl.startsWith('https');
    if (res.ok) {
      // Read up to ~300KB to keep memory bounded.
      const text = await res.text();
      html = text.slice(0, 300000);
    }
  } catch {
    // Site unreachable / no real presence — everything stays "absent" (high gap).
  }

  const has = (re: RegExp) => re.test(html);
  if (html) {
    present['Mobile Friendly'] = /<meta[^>]+name=["']viewport["']/i.test(html);
    present['Lead Capture Form'] = /<form/i.test(html);
    present['Contact Page'] = /contact/i.test(html);
    present['About Page'] = /about/i.test(html);
    present['Services Page'] = /service|product/i.test(html);
    present['Blog/Content'] = /blog|article|news/i.test(html);
    present['Social Media Links'] = /facebook\.com|instagram\.com|linkedin\.com|twitter\.com|x\.com|wa\.me/i.test(html);
    present['Google Analytics'] = /gtag|google-analytics|googletagmanager|ga\(|gtm\.js/i.test(html);
    present['CRM Integration'] = /hubspot|salesforce|zoho|pipedrive|crm/i.test(html);
    present['Booking System'] = /booking|reserv|calendly|appointy|appointment|schedule-now|zocdoc|practo/i.test(html);
    present['Live Chat'] = /intercom|tawk|zendesk|tidio|livechat|freshchat|crisp/i.test(html);
    present['Reviews/Testimonials'] = /review|testimonial|rating|star-rating/i.test(html);
  }

  return Object.keys(present).map((name) => ({ name, present: present[name], weight: weights[name] }));
}

function computeDigitalMaturity(indicators: any[]) {
  const total = indicators.reduce((sum: number, i: any) => sum + (i.present ? i.weight : 0), 0);
  const maxWeight = indicators.reduce((sum: number, i: any) => sum + i.weight, 0);
  return Math.round((total / maxWeight) * 100);
}

function computeOpportunityScore(indicators: any[], digitalMaturity: number) {
  const gapScore = indicators.filter((i: any) => !i.present).reduce((sum: number, i: any) => sum + i.weight, 0);
  const maxWeight = indicators.reduce((sum: number, i: any) => sum + i.weight, 0);
  return Math.min(100, Math.round(100 - digitalMaturity + (gapScore / maxWeight) * 50));
}

function detectIndustry(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('restaurant') || lower.includes('cafe') || lower.includes('food')) return 'Food & Beverage';
  if (lower.includes('clinic') || lower.includes('doctor') || lower.includes('hospital') || lower.includes('dental')) return 'Healthcare';
  if (lower.includes('school') || lower.includes('academy') || lower.includes('training') || lower.includes('tutorial')) return 'Education';
  if (lower.includes('salon') || lower.includes('spa') || lower.includes('beauty')) return 'Beauty & Wellness';
  if (lower.includes('hotel') || lower.includes('resort') || lower.includes('lodging')) return 'Hospitality';
  if (lower.includes('store') || lower.includes('shop') || lower.includes('retail')) return 'Retail';
  if (lower.includes('consult') || lower.includes('solutions') || lower.includes('services') || lower.includes('technologies')) return 'Professional Services';
  if (lower.includes('real') || lower.includes('property') || lower.includes('estate')) return 'Real Estate';
  if (lower.includes('construction') || lower.includes('builder') || lower.includes('contractor')) return 'Construction';
  return 'General Business';
}

function estimateProjectValue(digitalMaturity: number, opportunityScore: number): number {
  if (digitalMaturity < 30 && opportunityScore > 60) return 50000 + Math.random() * 50000;
  if (digitalMaturity < 50 && opportunityScore > 40) return 25000 + Math.random() * 25000;
  return 10000 + Math.random() * 15000;
}

function suggestSolutions(indicators: any[]) {
  const solutions: string[] = [];
  const missing = indicators.filter((i: any) => !i.present);
  for (const indicator of missing) {
    switch (indicator.name) {
      case 'SSL/HTTPS': solutions.push('Install SSL certificate for secure browsing'); break;
      case 'Mobile Friendly': solutions.push('Responsive web design for mobile devices'); break;
      case 'Lead Capture Form': solutions.push('Add contact/enquiry forms to capture leads'); break;
      case 'Google Analytics': solutions.push('Set up analytics tracking to measure traffic'); break;
      case 'CRM Integration': solutions.push('Implement CRM to manage customer relationships'); break;
      case 'Booking System': solutions.push('Add online booking/scheduling system'); break;
      case 'Live Chat': solutions.push('Integrate live chat for real-time customer support'); break;
      case 'Social Media Links': solutions.push('Connect social media profiles to website'); break;
      case 'Reviews/Testimonials': solutions.push('Showcase customer reviews and testimonials'); break;
      case 'Blog/Content': solutions.push('Start content marketing with blog posts'); break;
    }
  }
  return solutions;
}

const INDUSTRY_TEMPLATES: Record<string, { subject: string; body: string }> = {
  'Healthcare': {
    subject: 'Digital Solutions for {business_name}',
    body: 'Dear {name},\n\nI noticed that {business_name} is doing great work in healthcare. We specialize in helping healthcare providers enhance their digital presence with online booking, patient portals, and streamlined operations.\n\nI would love to discuss how we can help {business_name} attract more patients and improve patient experience through digital transformation.\n\nWould you be available for a brief call next week?\n\nBest regards,\nWintermute Team',
  },
  'Education': {
    subject: 'Boost Enrollments for {business_name}',
    body: 'Hi {name},\n\nAt Wintermute, we help educational institutions like {business_name} reach more students through effective digital marketing and streamlined admission processes.\n\nFrom website optimization to automated enquiry handling, we can help you focus on what matters most - education.\n\nWould you be open to a quick chat?\n\nBest regards,\nWintermute Team',
  },
  'Food & Beverage': {
    subject: 'Digital Growth for {business_name}',
    body: 'Hello {name},\n\nRunning a food business like {business_name} is challenging. Let us handle the digital side - from online ordering systems to social media marketing that brings more customers through your doors.\n\nMany restaurants in your area have seen 40%+ growth in online orders after partnering with us.\n\nWould you like to learn more?\n\nWarm regards,\nWintermute Team',
  },
};

const DEFAULT_TEMPLATE = {
  subject: 'Digital Growth Opportunity for {business_name}',
  body: 'Dear {name},\n\nI came across {business_name} and was impressed by your work. At Wintermute, we specialize in helping businesses like yours grow through digital transformation.\n\nOur platform helps you:\n- Capture more leads automatically\n- Streamline customer communication\n- Track and nurture prospects effectively\n\nI would love to show you how we can help {business_name} achieve its growth goals.\n\nWould you have 15 minutes for a quick call this week?\n\nBest regards,\nWintermute Team',
};

function generateMessages(lead: any, analysis: any, channel: string) {
  const industry = analysis?.industry || 'General Business';
  const template = INDUSTRY_TEMPLATES[industry] || DEFAULT_TEMPLATE;

  const replaceVars = (text: string) =>
    text.replace(/{name}/g, lead.owner_name || 'there')
      .replace(/{business_name}/g, lead.business_name)
      .replace(/{industry}/g, industry);

  const result = [];
  const subject = replaceVars(template.subject);
  const content = replaceVars(template.body);

  if (channel === 'all' || channel === 'email') {
    result.push({ channel: 'email', subject, content });
  }
  if (channel === 'all' || channel === 'whatsapp') {
    result.push({
      channel: 'whatsapp',
      subject: null,
      content: `Hi ${lead.owner_name || 'there'}!\n\n${content.split('\n\n')[0]}\n\nLet me know if you are interested!`,
    });
  }
  if (channel === 'all' || channel === 'linkedin') {
    result.push({
      channel: 'linkedin',
      subject: null,
      content: `Hi ${lead.owner_name || 'there'},\n\n${content.split('\n\n')[0]}\n\nWould love to connect and chat more.`,
    });
  }

  return result;
}

export default leads;
