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
        <div className="login-header">
          <h1 className="login-brand">tallyoh</h1>
          <p className="login-subtitle">Entrar para acompanhar transacoes, credito, economia e orcamentos.</p>
        </div>
        <form className="login-form" action={submitAction}>
          {error && <div className="form-error">{error}</div>}
          <input
            className="login-input"
            type="email"
            name="email"
            placeholder="Email"
            required
            autoFocus
          />
          <input
            className="login-input"
            type="password"
            name="password"
            placeholder="Senha"
            required
          />
          <button className="login-submit" type="submit" disabled={isPending}>
            {isPending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
