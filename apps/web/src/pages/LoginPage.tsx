import { useState, FormEvent } from 'react'
import { api } from '../api'

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    setLoading(true)
    setError('')
    try {
      await api.login(email, password)
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <h1 style={{ textAlign: 'center', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '1.5rem' }}>
          tallyoh
        </h1>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}
          <input type="email" name="email" placeholder="Email" required autoFocus style={{ marginBottom: '0.5rem' }} />
          <input type="password" name="password" placeholder="Senha" required style={{ marginBottom: '1rem' }} />
          <button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
