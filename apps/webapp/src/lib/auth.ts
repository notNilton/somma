export const AUTH_TOKEN_KEY = 'pagway_auth_token';

export const auth = {
  getToken: (): string | null => {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken: (token: string): void => {
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch {
      // ignore
    }
  },

  logout: (): void => {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // ignore
    }
    window.location.href = '/auth/login';
  },

  isAuthenticated: (): boolean => {
    return !!auth.getToken();
  },
};
