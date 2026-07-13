import { Hono } from 'hono';
import { corsMiddleware } from './middleware';
import authRoutes from './routes/auth';
import leadsRoutes from './routes/leads';
import intelligenceRoutes from './routes/intelligence';
import messagesRoutes from './routes/messages';
import orgsRoutes from './routes/orgs';
import { renderScorecardHtml, renderScorecardOgHtml } from './scorecard';
import { ImageResponse } from 'cf-workers-og/html';

interface Env {
  wintermute_db: any;
  JWT_SECRET?: string;
  ACCESS_TOKEN_EXPIRE_MINUTES?: string;
  CORS_ORIGINS?: string;
}

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

app.use('*', corsMiddleware());

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Wintermute API',
    version: '1.0.0',
  });
});

app.get('/', (c) => {
  return c.json({
    name: 'Wintermute API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: { register: 'POST /api/v1/auth/register', login: 'POST /api/v1/auth/login', me: 'GET /api/v1/auth/me' },
      leads: { list: 'GET /api/v1/leads', create: 'POST /api/v1/leads', dashboard: 'GET /api/v1/leads/stats/dashboard' },
      intelligence: { score: 'POST /api/v1/intelligence/score', batch: 'POST /api/v1/intelligence/batch-score' },
      messages: { list: 'GET /api/v1/messages', create: 'POST /api/v1/messages' },
      orgs: { get: 'GET /api/v1/orgs/:id', members: 'GET /api/v1/orgs/:id/members' },
    },
  });
});

app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/leads', leadsRoutes);
app.route('/api/v1/intelligence', intelligenceRoutes);
app.route('/api/v1/messages', messagesRoutes);
app.route('/api/v1/orgs', orgsRoutes);
app.route('/api/v1/organizations', orgsRoutes);

// Public, shareable Digital Scorecard (no auth) — used for viral dogfooding
app.get('/scorecard/:id', async (c) => {
  const db = c.env.wintermute_db;
  const id = c.req.param('id');
  const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first<any>();
  if (!lead) return c.json({ error: 'Scorecard not found' }, 404);
  const analysis = lead.ai_analysis_json ? JSON.parse(lead.ai_analysis_json) : null;
  const origin = new URL(c.req.url).origin;
  const html = renderScorecardHtml(lead, analysis, origin);
  return c.html(html);
});

app.get('/scorecard/:id/og', async (c) => {
  try {
    const db = c.env.wintermute_db;
    const id = c.req.param('id');
    const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first<any>();
    if (!lead) return c.json({ error: 'Scorecard not found' }, 404);
    const analysis = lead.ai_analysis_json ? JSON.parse(lead.ai_analysis_json) : null;
    const html = renderScorecardOgHtml(lead, analysis);
    return await ImageResponse.create(html, { width: 1200, height: 630 });
  } catch (e: any) {
    return c.json({ error: 'OG failed', detail: e?.message || String(e) }, 500);
  }
});

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

export default app;
