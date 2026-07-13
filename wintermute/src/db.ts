import { PaginatedResponse } from './types';

export async function reqJson(c: any): Promise<any> {
  const text = await c.req.text();
  return JSON.parse(text.replace(/^\uFEFF/, ''));
}

export function getDb(env: { wintermute_db: any }) {
  return env.wintermute_db;
}

export function uuid(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

export async function paginate<T>(
  db: any,
  table: string,
  where: string[],
  params: any[],
  page: number = 1,
  per_page: number = 20,
  orderBy: string = 'created_at DESC'
): Promise<PaginatedResponse<T>> {
  const offset = (page - 1) * per_page;
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const countResult = await db.prepare(
    `SELECT COUNT(*) as total FROM ${table} ${whereClause}`
  ).bind(...params).first<{ total: number }>();
  const total = countResult?.total ?? 0;

  const data = await db.prepare(
    `SELECT * FROM ${table} ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  ).bind(...params, per_page, offset).all<T>();

  return {
    data: data.results,
    total,
    page,
    per_page,
    total_pages: Math.ceil(total / per_page),
  };
}
