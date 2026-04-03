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
  const token = auth.getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
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
    const token = auth.getToken();
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      body: form,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      if (res.status === 401) {
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
  getMonthlyEvolution: <T>() => apiFetch<T>('/api/v1/dashboard/monthly-evolution'),
  getCategoryBreakdown: <T>(month?: string, type?: string) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (type) params.append('type', type);
    const qs = params.toString();
    return apiFetch<T>(`/api/v1/dashboard/category-breakdown${qs ? `?${qs}` : ''}`);
  },

  // --- Transfers ---
  listTransfers: <T>() => apiFetch<T>('/api/v1/transfers'),
  createTransfer: <T>(dto: unknown) =>
    apiFetch<T>('/api/v1/transfers', { method: 'POST', body: JSON.stringify(dto) }),
  deleteTransfer: <T>(id: string) =>
    apiFetch<T>(`/api/v1/transfers/${id}`, { method: 'DELETE' }),

  // --- Budgets ---
  listBudgets: <T>(month?: string) =>
    apiFetch<T>(`/api/v1/budgets${month ? `?month=${month}` : ''}`),
  getBudgetsStatus: <T>(month?: string) =>
    apiFetch<T>(`/api/v1/budgets/status${month ? `?month=${month}` : ''}`),
  createBudget: <T>(dto: unknown) =>
    apiFetch<T>('/api/v1/budgets', { method: 'POST', body: JSON.stringify(dto) }),
  updateBudget: <T>(id: string, dto: unknown) =>
    apiFetch<T>(`/api/v1/budgets/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  deleteBudget: <T>(id: string) =>
    apiFetch<T>(`/api/v1/budgets/${id}`, { method: 'DELETE' }),

  // --- Calendar ---
  getFinancialCalendar: <T>(from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const qs = params.toString();
    return apiFetch<T>(`/api/v1/calendar${qs ? `?${qs}` : ''}`);
  },

  // --- Cards ---
  listCards: <T>() => apiFetch<T>('/api/v1/cards'),
  getCardStatement: <T>(cardId: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const qs = params.toString();
    return apiFetch<T>(`/api/v1/cards/${cardId}/statement${qs ? `?${qs}` : ''}`);
  },

  // --- Transactions Export ---
  exportTransactions: async (params: {
    from: string;
    to: string;
    search?: string;
    type?: string;
    categoryId?: string;
    accountId?: string;
  }): Promise<Blob> => {
    const token = auth.getToken();
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) qs.append(k, v);
    });
    const res = await fetch(`${BASE_URL}/api/v1/transactions/export?${qs.toString()}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) throw new Error(`Export error: ${res.status}`);
    return res.blob();
  },
};

