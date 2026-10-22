export async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (res.status === 401) {
    // Sessão expirada ou ausente: limpa o estado local e volta ao login,
    // em vez de mostrar telas vazias. Os endpoints de auth tratam o 401 na própria tela.
    if (!path.startsWith('/api/auth/')) {
      localStorage.removeItem('somma:authed')
      localStorage.removeItem('somma:email')
      localStorage.removeItem('somma:cache')
      if (window.location.pathname !== '/login') window.location.assign('/login')
    }
    throw new Error('UNAUTHORIZED')
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `API ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
