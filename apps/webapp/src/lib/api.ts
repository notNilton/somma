import { auth } from './auth';

const BASE_URL = import.meta.env.VITE_API_URL || '';

interface FetchOptions {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
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
    throw new Error(body.message ?? `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
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
      throw new Error(body.message ?? `API error: ${res.status}`);
    }
    return res.json() as Promise<T>;
  },
};
