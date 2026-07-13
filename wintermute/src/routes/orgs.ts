import { Hono } from 'hono';
import { getDb, reqJson, now } from '../db';
import { authMiddleware, requireRole } from '../middleware';
import { JwtPayload, Organization, User } from '../types';

interface Env { wintermute_db: any; }

const orgs = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();
orgs.use('*', authMiddleware);

orgs.get('/', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);
  const orgs = await db.prepare(
    `SELECT o.id, o.name, o.slug, o.subscription_tier as tier, o.is_active, o.created_at
     FROM organizations o JOIN organization_members om ON om.organization_id = o.id
     WHERE om.user_id = ? ORDER BY o.name`
  ).bind(user.sub).all<any>();
  return c.json(orgs.results);
});

orgs.get('/:id', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);

  if (user.org_id !== c.req.param('id')) {
    return c.json({ error: 'Access denied' }, 403);
  }

  const org = await db.prepare('SELECT * FROM organizations WHERE id = ?').bind(c.req.param('id')).first<Organization>();
  if (!org) return c.json({ error: 'Organization not found' }, 404);

  return c.json(org);
});

orgs.get('/:id/members', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);

  if (user.org_id !== c.req.param('id')) {
    return c.json({ error: 'Access denied' }, 403);
  }

  const members = await db.prepare(
    `SELECT u.id, u.email, u.display_name as name, u.created_at, om.role
     FROM users u JOIN organization_members om ON om.user_id = u.id
     WHERE om.organization_id = ? ORDER BY om.role ASC, u.display_name ASC`
  ).bind(c.req.param('id')).all();

  return c.json(members.results);
});

orgs.post('/:id/members', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);
  const body = await reqJson(c);

  if (user.org_id !== c.req.param('id')) {
    return c.json({ error: 'Access denied' }, 403);
  }
  if (!body.email || !body.role) {
    return c.json({ error: 'email and role are required' }, 400);
  }
  if (!['admin', 'member', 'viewer'].includes(body.role)) {
    return c.json({ error: 'Invalid role. Use admin, member, or viewer' }, 400);
  }

  const targetUser = await db.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first<{ id: string }>();
  if (!targetUser) return c.json({ error: 'User not found with that email' }, 404);

  const existing = await db.prepare(
    'SELECT id FROM organization_members WHERE organization_id = ? AND user_id = ?'
  ).bind(c.req.param('id'), targetUser.id).first();
  if (existing) return c.json({ error: 'User is already a member' }, 409);

  await db.prepare(
    'INSERT INTO organization_members (user_id, organization_id, role, created_at) VALUES (?, ?, ?, ?)'
  ).bind(targetUser.id, c.req.param('id'), body.role, now()).run();

  return c.json({ message: 'Member added' }, 201);
});

orgs.delete('/:id/members/:userId', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);

  if (user.org_id !== c.req.param('id')) {
    return c.json({ error: 'Access denied' }, 403);
  }
  if (c.req.param('userId') === user.sub) {
    return c.json({ error: 'Cannot remove yourself from the organization' }, 400);
  }

  const result = await db.prepare(
    'DELETE FROM organization_members WHERE organization_id = ? AND user_id = ?'
  ).bind(c.req.param('id'), c.req.param('userId')).run();

  if (result.meta.changes === 0) return c.json({ error: 'Member not found' }, 404);
  return c.json({ message: 'Member removed' });
});

export default orgs;
