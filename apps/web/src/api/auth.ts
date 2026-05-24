import { req } from './client'

export const authApi = {
  login: (email: string, password: string) =>
    req<void>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => req<void>('/api/auth/logout', { method: 'POST' }),
}
