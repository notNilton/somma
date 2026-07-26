import { req } from './client'

export const authApi = {
  login: (email: string, password: string) =>
    req<void>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name: string) =>
    req<void>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  logout: () => req<void>('/api/auth/logout', { method: 'POST' }),
}
