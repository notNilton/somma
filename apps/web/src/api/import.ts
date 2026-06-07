import type { ImportPreview, ImportRow } from '../types'

export const importApi = {
  preview: async (file: File): Promise<ImportPreview> => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/v1/import/preview', {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
    if (res.status === 401) throw new Error('UNAUTHORIZED')
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(body.error ?? `API ${res.status}`)
    }
    return res.json()
  },

  confirm: async (rows: ImportRow[]): Promise<{ imported: number }> => {
    const res = await fetch('/api/v1/import/confirm', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    })
    if (res.status === 401) throw new Error('UNAUTHORIZED')
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(body.error ?? `API ${res.status}`)
    }
    return res.json()
  },
}
