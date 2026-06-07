import { req } from './client'

export interface ProfileResponse {
  id: string
  email: string
  name?: string
  phone?: string
  avatarUrl?: string
}

export const settingsApi = {
  getProfile: () => req<ProfileResponse>('/api/v1/settings/profile'),

  updateProfile: (data: { name?: string }) =>
    req<ProfileResponse>('/api/v1/settings/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    req<void>('/api/v1/settings/change-password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  deleteAccount: (currentPassword: string) =>
    req<void>('/api/v1/settings/account', {
      method: 'DELETE',
      body: JSON.stringify({ currentPassword }),
    }),

  getInitialBalance: () =>
    req<{ initialBalance: number }>('/api/v1/settings/initial-balance'),

  updateInitialBalance: (initialBalance: number) =>
    req<{ initialBalance: number }>('/api/v1/settings/initial-balance', {
      method: 'PATCH',
      body: JSON.stringify({ initialBalance }),
    }),
}
