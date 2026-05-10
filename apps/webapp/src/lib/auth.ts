const BASE_URL = import.meta.env.VITE_API_URL || '';

async function sessionFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.headers ?? {}),
    },
  });
}

export const auth = {
  async isAuthenticated(): Promise<boolean> {
    try {
      const res = await sessionFetch('/users/me', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async logout(): Promise<void> {
    try {
      await sessionFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }

    window.location.href = '/auth/login';
  },
};
