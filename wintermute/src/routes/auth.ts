import { Hono } from 'hono';
import { getDb, reqJson, uuid, now } from '../db';
import { hashPassword, verifyPassword, generateToken } from '../auth';
import { authMiddleware } from '../middleware';

interface Env {
  wintermute_db: any;
  JWT_SECRET?: string;
  ACCESS_TOKEN_EXPIRE_MINUTES?: string;
}

const auth = new Hono<{ Bindings: Env; Variables: { user: any } }>();

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'org';
}

auth.post('/register', async (c) => {
  const body = await reqJson(c);
  const { email, password, name, org_name } = body;
  if (!email || !password || !name) {
    return c.json({ error: 'email, password, and name are required' }, 400);
  }

  const db = getDb(c.env);
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    return c.json({ error: 'Email already registered' }, 409);
  }

  const orgId = uuid();
  const orgName = org_name || `${name}'s Organization`;
  const orgSlug = slugify(orgName) + '-' + Date.now().toString(36);
  const userId = uuid();
  const passwordHash = await hashPassword(password);
  const timestamp = now();

  const insertOrg = db.prepare(
    'INSERT INTO organizations (id, name, slug, subscription_tier, max_users, max_leads, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(orgId, orgName, orgSlug, 'free', 5, 50, 1, timestamp, timestamp);
  const insertUser = db.prepare(
    'INSERT INTO users (id, email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(userId, email, passwordHash, name, timestamp);
  const insertMember = db.prepare(
    'INSERT INTO organization_members (user_id, organization_id, role, created_at) VALUES (?, ?, ?, ?)'
  ).bind(userId, orgId, 'admin', timestamp);

  await db.batch([insertOrg, insertUser, insertMember]);

  const token = await generateToken({ id: userId, email, name, org_id: orgId, role: 'admin' }, c.env);
  return c.json({ token, access_token: token, token_type: 'bearer', user: { id: userId, email, name, org_id: orgId, role: 'admin' } }, 201);
});

auth.post('/login', async (c) => {
  const body = await reqJson(c);
  const { email, password } = body;
  if (!email || !password) {
    return c.json({ error: 'email and password are required' }, 400);
  }

  const db = getDb(c.env);
  const user = await db.prepare(
    `SELECT u.id, u.email, u.display_name, u.password_hash, u.created_at,
            om.organization_id as org_id, om.role
     FROM users u
     LEFT JOIN organization_members om ON om.user_id = u.id
     WHERE u.email = ?`
  ).bind(email).first<any>();

  if (!user) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const token = await generateToken(
    { id: user.id, email: user.email, name: user.display_name, org_id: user.org_id || '', role: user.role || 'viewer' },
    c.env
  );
  return c.json({
    token,
    access_token: token,
    token_type: 'bearer',
    user: {
      id: user.id, email: user.email, name: user.display_name,
      org_id: user.org_id || '', role: user.role || 'viewer',
    },
  });
});

auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  return c.json({ user });
  // Also support frontend format
  // return c.json({ user: { ...user } });
});

export default auth;
