import { Context, Next } from 'hono';
import { cors } from 'hono/cors';
import { verifyToken } from './auth';
import { JwtPayload, MemberRole } from './types';

export function corsMiddleware() {
  return cors({
    origin: (origin) => {
      if (!origin) return '*';
      return origin;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
    credentials: true,
  });
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  const payload = await verifyToken(token, c.env as { JWT_SECRET?: string });
  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  c.set('user', payload);
  await next();
}

export function requireRole(...roles: MemberRole[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as JwtPayload | undefined;
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    if (roles.length > 0 && !roles.includes(user.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    await next();
  };
}
