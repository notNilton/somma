import { useActionState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [error, submitAction, isPending] = useActionState(
    async (_prev: string | null, formData: FormData): Promise<string | null> => {
      const email = formData.get('email') as string
      const password = formData.get('password') as string
      try {
        await authApi.login(email, password)
        login(email)
        navigate('/', { replace: true })
        return null
      } catch (err) {
        return err instanceof Error ? err.message : 'Erro ao entrar'
      }
    },
    null,
  )

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h1 className="login-brand">tallyoh</h1>
        <form action={submitAction}>
          {error && <div className="form-error">{error}</div>}
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            autoFocus
            style={{ marginBottom: '0.5rem' }}
          />
          <input
            type="password"
            name="password"
            placeholder="Senha"
            required
            style={{ marginBottom: '1rem' }}
          />
          <button type="submit" disabled={isPending} style={{ width: '100%' }}>
            {isPending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
