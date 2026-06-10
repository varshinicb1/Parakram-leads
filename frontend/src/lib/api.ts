const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('sigma_token');
  }
  return null;
}

export function setToken(token: string) {
  localStorage.setItem('sigma_token', token);
}

export function clearToken() {
  localStorage.removeItem('sigma_token');
}

export const api = {
  auth: {
    login: (data: { email: string; password: string }) =>
      request<{ access_token: string; token_type: string; user: any }>('/auth/login', { method: 'POST', body: data }),
    register: (data: { email: string; password: string; full_name?: string }) =>
      request<{ access_token: string; token_type: string; user: any }>('/auth/register', { method: 'POST', body: data }),
    me: () =>
      request<any>('/auth/me', { token: getToken() || undefined }),
  },
  leads: {
    list: (params?: Record<string, string | number>) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString() : '';
      return request<any>(`/leads${qs}`, { token: getToken() || undefined });
    },
    get: (id: string) =>
      request<any>(`/leads/${id}`, { token: getToken() || undefined }),
    create: (data: any) =>
      request<any>('/leads', { method: 'POST', body: data, token: getToken() || undefined }),
    update: (id: string, data: any) =>
      request<any>(`/leads/${id}`, { method: 'PATCH', body: data, token: getToken() || undefined }),
    delete: (id: string) =>
      request<void>(`/leads/${id}`, { method: 'DELETE', token: getToken() || undefined }),
    approveOutreach: (id: string, data: any) =>
      request<any>(`/leads/${id}/approve-outreach`, { method: 'POST', body: data, token: getToken() || undefined }),
  },
  messages: {
    list: (leadId?: string) => {
      const qs = leadId ? `?lead_id=${leadId}` : '';
      return request<any[]>(`/messages${qs}`, { token: getToken() || undefined });
    },
  },
  dashboard: {
    get: () =>
      request<any>('/messages/dashboard', { token: getToken() || undefined }),
  },
};
