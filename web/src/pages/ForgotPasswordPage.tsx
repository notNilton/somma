import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api'
import { useLocale } from '../i18n'

export default function ForgotPasswordPage() {
  const { t } = useLocale()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim()

    setError(null)
    setSuccess(null)
    setIsPending(true)

    try {
      const res = await authApi.forgotPassword(email)
      setSuccess(res.message || t.forgotPassword.successMessage)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.forgotPassword.genericError)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <Link to="/" className="login-brand-link">
            <h1 className="login-brand">somma</h1>
          </Link>
          <p className="login-subtitle">{t.forgotPassword.subtitle}</p>
        </div>

        {success ? (
          <div className="form-success-box">
            <p className="form-success-message">{success}</p>
            <div className="login-footer-links">
              <p className="login-alt-link">
                <Link to="/login">← {t.forgotPassword.backToLogin}</Link>
              </p>
            </div>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="form-error">{error}</div>}
            <input
              className="login-input"
              type="email"
              name="email"
              placeholder={t.forgotPassword.emailPlaceholder}
              required
              autoFocus
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
            <button className="login-submit" type="submit" disabled={isPending}>
              {isPending && <span className="login-spinner" aria-hidden="true" />}
              {isPending ? t.forgotPassword.submitting : t.forgotPassword.submit}
            </button>
            <div className="login-footer-links">
              <p className="login-alt-link">
                <Link to="/login">← {t.forgotPassword.backToLogin}</Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
