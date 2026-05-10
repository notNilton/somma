import { auth } from './auth';

const BASE_URL = import.meta.env.VITE_API_URL || '';

interface FetchOptions {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

export interface ApiDataResponse<T> {
  data?: T;
}

export function unwrapData<T>(res: T | ApiDataResponse<T> | null | undefined, fallback: T): T {
  if (res == null) return fallback;
  if (typeof res === 'object' && 'data' in res) {
    return (res.data ?? fallback) as T;
  }
  return res;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      auth.logout();
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `API error: ${res.status}`);
  }

  // 204 No Content ou body vazio — retorna null sem tentar parsear
  const contentType = res.headers.get('content-type') ?? '';
  const contentLength = res.headers.get('content-length');
  if (
    res.status === 204 ||
    contentLength === '0' ||
    !contentType.includes('application/json')
  ) {
    return null as unknown as T;
  }

  const text = await res.text();
  if (!text) return null as unknown as T;
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
  postForm: async <T>(path: string, form: FormData) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      body: form,
      credentials: 'include',
      headers: {
      },
    });
    if (!res.ok) {
      if (res.status === 401 && !path.startsWith('/api/auth/')) {
        auth.logout();
      }
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? body.error ?? `API error: ${res.status}`);
    }
    return res.json() as Promise<T>;
  },

  // --- Dashboard & Analytics ---
  getDashboard: <T>(month?: string) =>
    apiFetch<T>(`/api/v1/dashboard${month ? `?month=${month}` : ''}`),
  getBudgets: <T>() => apiFetch<T>('/api/v1/budgets'),
  postBudgets: <T>(body: unknown) => apiFetch<T>('/api/v1/budgets', { method: 'POST', body: JSON.stringify(body) }),
  patchBudgets: <T>(id: string, body: unknown) =>
    apiFetch<T>(`/api/v1/budgets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteBudgets: <T>(id: string) => apiFetch<T>(`/api/v1/budgets/${id}`, { method: 'DELETE' }),
  getMonthlyEvolution: <T>() => apiFetch<T>('/api/v1/dashboard/monthly-evolution'),
  getAnnualEvolution: <T>(year?: number) =>
    apiFetch<T>(`/api/v1/analytics/annual-evolution${year ? `?year=${year}` : ''}`),
  getCategoryBreakdown: <T>(month?: string, type?: string) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (type) params.append('type', type);
    const qs = params.toString();
    return apiFetch<T>(`/api/v1/dashboard/category-breakdown${qs ? `?${qs}` : ''}`);
  },

};
