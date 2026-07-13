const API = import.meta.env.VITE_API_URL || 'https://wintermute-api.cbvarshini1.workers.dev/api/v1';

function getToken(): string | null {
  return localStorage.getItem('wintermute_token');
}

function setToken(t: string) { localStorage.setItem('wintermute_token', t); }
function clearToken() { localStorage.removeItem('wintermute_token'); }

export interface User { id: string; email: string; name: string; org_id: string; role: string; }

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers: { ...headers, ...(opts.headers as Record<string, string> || {}) } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string, name: string) =>
    request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  me: () => request<{ user: User }>('/auth/me'),
  leads: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any>(`/leads${qs}`);
    },
    get: (id: string) => request<any>(`/leads/${id}`),
    create: (data: any) => request<any>('/leads', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/leads/${id}`, { method: 'DELETE' }),
    analyze: (id: string) => request<any>(`/leads/${id}/analyze`, { method: 'POST' }),
    generateOutreach: (id: string, channel: string) =>
      request<any>(`/leads/${id}/generate-outreach`, { method: 'POST', body: JSON.stringify({ channel }) }),
    dashboard: () => request<any>('/leads/stats/dashboard'),
  },
  messages: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any>(`/messages${qs}`);
    },
    create: (data: any) => request<any>('/messages', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => request<any>(`/messages/${id}`),
  },
  orgs: {
    get: (id: string) => request<any>(`/orgs/${id}`),
    members: (id: string) => request<any[]>(`/orgs/${id}/members`),
    addMember: (id: string, data: any) =>
      request<any>(`/orgs/${id}/members`, { method: 'POST', body: JSON.stringify(data) }),
    removeMember: (orgId: string, userId: string) =>
      request<void>(`/orgs/${orgId}/members/${userId}`, { method: 'DELETE' }),
  },
  intelligence: {
    score: (lead_id: string) =>
      request<any>('/intelligence/score', { method: 'POST', body: JSON.stringify({ lead_id }) }),
    batchScore: (lead_ids: string[]) =>
      request<any>('/intelligence/batch-score', { method: 'POST', body: JSON.stringify({ lead_ids }) }),
  },
};

export { setToken, clearToken, getToken };
