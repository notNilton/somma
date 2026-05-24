import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../i18n'

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { t } = useLocale()

  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value

    if (password.length < 12) {
      setError(t.register.passwordTooShort)
      return
    }
    if (password !== confirm) {
      setError(t.register.passwordMismatch)
      return
    }

    setError(null)
    setIsPending(true)
    try {
      await authApi.register(email, password, name)
      login(email)
      navigate('/', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.toLowerCase().includes('already')) {
        setError(t.register.emailConflict)
      } else {
        setError(t.register.genericError)
      }
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-brand">tallyoh</h1>
          <p className="login-subtitle">{t.register.subtitle}</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}
          <input
            className="login-input"
            type="text"
            name="name"
            placeholder={t.register.namePlaceholder}
            required
            autoFocus
            autoComplete="name"
          />
          <input
            className="login-input"
            type="email"
            name="email"
            placeholder={t.register.emailPlaceholder}
            required
            autoComplete="email"
          />
          <input
            className="login-input"
            type="password"
            name="password"
            placeholder={t.register.passwordPlaceholder}
            required
            autoComplete="new-password"
          />
          <input
            className="login-input"
            type="password"
            name="confirm"
            placeholder={t.register.confirmPlaceholder}
            required
            autoComplete="new-password"
          />
          <button className="login-submit" type="submit" disabled={isPending}>
            {isPending ? t.register.submitting : t.register.submit}
          </button>
        </form>
        <p className="login-alt-link">
          <Link to="/login">{t.register.loginLink}</Link>
        </p>
      </div>
    </div>
  )
}
