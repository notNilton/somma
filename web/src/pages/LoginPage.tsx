import { useActionState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../i18n'
import PasswordInput from '../components/PasswordInput'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { t } = useLocale()

  const [error, submitAction, isPending] = useActionState(
    async (_prev: string | null, formData: FormData): Promise<string | null> => {
      const email = formData.get('email') as string
      const password = formData.get('password') as string
      try {
        await authApi.login(email, password)
        login(email)
        navigate('/app', { replace: true })
        return null
      } catch (err) {
        return err instanceof Error ? err.message : t.login.genericError
      }
    },
    null,
  )

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <Link to="/" className="login-brand-link">
            <h1 className="login-brand">somma</h1>
          </Link>
          <p className="login-subtitle">{t.login.subtitle}</p>
        </div>
        <form className="login-form" action={submitAction}>
          {error && <div className="form-error">{error}</div>}
          <input
            className="login-input"
            type="email"
            name="email"
            placeholder={t.login.emailPlaceholder}
            required
            autoFocus
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />
          <PasswordInput
            className="login-input"
            name="password"
            placeholder={t.login.passwordPlaceholder}
            required
            autoComplete="current-password"
          />
          <button className="login-submit" type="submit" disabled={isPending}>
            {isPending && <span className="login-spinner" aria-hidden="true" />}
            {isPending ? t.login.submitting : t.login.submit}
          </button>
        </form>
        <div className="login-footer-links">
          <p className="login-alt-link">
            <Link to="/forgot-password">{t.login.forgotPasswordLink}</Link>
          </p>
          <p className="login-alt-link">
            <Link to="/register">{t.login.registerLink}</Link>
          </p>
          <p className="login-home-link">
            <Link to="/">← Voltar para a página inicial</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
