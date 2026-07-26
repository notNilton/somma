export async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `API ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
