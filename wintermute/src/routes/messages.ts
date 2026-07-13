import { Hono } from 'hono';
import { getDb, reqJson, uuid, now, paginate } from '../db';
import { authMiddleware } from '../middleware';
import { JwtPayload, Message } from '../types';

interface Env { wintermute_db: any; RESEND_API_KEY?: string; RESEND_FROM?: string; }

const messages = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();
messages.use('*', authMiddleware);

function escapeHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

messages.get('/', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);
  const leadId = c.req.query('lead_id');
  const channel = c.req.query('channel');
  const page = parseInt(c.req.query('page') || '1');
  const perPage = parseInt(c.req.query('per_page') || '20');

  const where: string[] = ['m.organization_id = ?'];
  const params: any[] = [user.org_id];

  if (leadId) { where.push('m.lead_id = ?'); params.push(leadId); }
  if (channel) { where.push('m.channel = ?'); params.push(channel.toLowerCase()); }

  const offset = (page - 1) * perPage;
  const whereClause = where.join(' AND ');

  const countResult = await db.prepare(
    `SELECT COUNT(*) as total FROM messages m WHERE ${whereClause}`
  ).bind(...params).first<{ total: number }>();
  const total = countResult?.total ?? 0;

  const data = await db.prepare(
    `SELECT m.*, l.business_name, l.owner_name
     FROM messages m
     LEFT JOIN leads l ON l.id = m.lead_id
     WHERE ${whereClause}
     ORDER BY m.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, perPage, offset).all();

  return c.json({
    data: data.results,
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  });
});

messages.post('/', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);
  const body = await reqJson(c);

  if (!body.lead_id || !body.channel || !body.body) {
    return c.json({ error: 'lead_id, channel, and body are required' }, 400);
  }

  const lead = await db.prepare(
    'SELECT id FROM leads WHERE id = ? AND organization_id = ?'
  ).bind(body.lead_id, user.org_id).first();
  if (!lead) return c.json({ error: 'Lead not found' }, 404);

  const channel = body.channel.toLowerCase();
  if (!['email', 'whatsapp', 'linkedin'].includes(channel)) {
    return c.json({ error: 'Invalid channel. Use email, whatsapp, or linkedin' }, 400);
  }

  const id = uuid();
  const timestamp = now();

  await db.prepare(
    `INSERT INTO messages (id, organization_id, lead_id, channel, direction, subject, body, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, user.org_id, body.lead_id, channel, 'outbound', body.subject || null, body.body, 'draft', timestamp).run();

  const message = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first();
  return c.json(message, 201);
});

messages.get('/dashboard', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);
  const orgId = user.org_id;

  const [leadStats, categoryCounts, statusCounts] = await Promise.all([
    db.prepare('SELECT COUNT(*) as total FROM leads WHERE organization_id = ?').bind(orgId).first<{ total: number }>(),
    db.prepare('SELECT category, COUNT(*) as count FROM leads WHERE organization_id = ? AND category IS NOT NULL GROUP BY category').bind(orgId).all<any>(),
    db.prepare('SELECT status, COUNT(*) as count FROM leads WHERE organization_id = ? GROUP BY status').bind(orgId).all<any>(),
  ]);

  const totalLeads = leadStats?.total || 0;
  const cats = Object.fromEntries(categoryCounts.results.map((r: any) => [r.category, r.count]));
  const statuses = Object.fromEntries(statusCounts.results.map((r: any) => [r.status, r.count]));

  const hot = cats.hot || 0;
  const warm = cats.warm || 0;
  const cold = cats.cold || 0;
  const messagesSent = statuses.sent || 0;
  const responses = statuses.responded || 0;
  const pipelineValue = hot * 50000 + warm * 25000 + cold * 10000;
  const conversionRate = messagesSent > 0 ? Math.round((responses / messagesSent) * 100) : 0;

  const topLead = await db.prepare(
    `SELECT id, business_name, industry, digital_maturity_score as quality_score, opportunity_score,
            category as category_flag FROM leads WHERE organization_id = ? AND category = 'hot' ORDER BY opportunity_score DESC LIMIT 1`
  ).bind(orgId).first<any>();

  return c.json({
    total_leads: totalLeads,
    hot_leads: hot,
    warm_leads: warm,
    cold_leads: cold,
    messages_sent: messagesSent,
    responses,
    estimated_pipeline_value: pipelineValue,
    conversion_rate: conversionRate,
    revenue_forecast: Math.round(pipelineValue * 0.15),
    high_priority_leads: hot,
    leads_ready_to_contact: (statuses.analyzed || 0) + (statuses.approved || 0),
    avg_quality_score: 45,
    avg_conversion_probability: conversionRate,
    pipeline_counts: statuses,
    top_lead: topLead ? {
      id: topLead.id,
      business_name: topLead.business_name,
      industry: topLead.industry || 'N/A',
      quality_score: topLead.quality_score || 0,
      conversion_probability: 0,
      buying_urgency: topLead.opportunity_score || 0,
      optimal_channel: 'email',
      category_flag: topLead.category_flag || 'hot',
    } : null,
  });
});

messages.get('/:id', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);
  const message = await db.prepare(
    'SELECT m.*, l.business_name, l.owner_name FROM messages m JOIN leads l ON l.id = m.lead_id WHERE m.id = ? AND m.organization_id = ?'
  ).bind(c.req.param('id'), user.org_id).first<any>();
  if (!message) return c.json({ error: 'Message not found' }, 404);
  return c.json(message);
});

messages.post('/:id/send', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);
  const id = c.req.param('id');

  const msg = await db.prepare(
    `SELECT m.*, l.email as lead_email, l.business_name
     FROM messages m JOIN leads l ON l.id = m.lead_id
     WHERE m.id = ? AND m.organization_id = ?`
  ).bind(id, user.org_id).first<any>();
  if (!msg) return c.json({ error: 'Message not found' }, 404);

  let body: any = {};
  try { body = await reqJson(c); } catch { body = {}; }
  const to = body.to || msg.lead_email;
  if (!to) return c.json({ error: 'No recipient. Pass `to` in body or set lead.email.' }, 400);

  const apiKey = c.env.RESEND_API_KEY;
  if (!apiKey) return c.json({ error: 'RESEND_API_KEY not configured. Run `wrangler secret put RESEND_API_KEY`.' }, 500);

  const from = c.env.RESEND_FROM || 'Wintermute <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject: msg.subject || `Quick note for ${msg.business_name || 'your business'}`,
      text: msg.body || '',
      html: `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(msg.body || '')}</pre>`,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return c.json({ error: 'Resend rejected the send', detail: data }, res.status as any);

  await db.prepare('UPDATE messages SET status = ?, updated_at = ? WHERE id = ?')
    .bind('sent', now(), id).run();

  return c.json({ message: 'sent', resend_id: (data as any).id });
});

export default messages;
