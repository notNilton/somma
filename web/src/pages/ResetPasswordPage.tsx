import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../api'
import { useLocale } from '../i18n'
import PasswordInput from '../components/PasswordInput'

export default function ResetPasswordPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) {
      setError(t.resetPassword.invalidToken)
      return
    }

    const form = e.currentTarget
    const newPassword = (form.elements.namedItem('newPassword') as HTMLInputElement).value
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value

    if (newPassword.length < 12) {
      setError(t.resetPassword.passwordTooShort)
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t.resetPassword.passwordMismatch)
      return
    }

    setError(null)
    setIsPending(true)

    try {
      await authApi.resetPassword(token, newPassword)
      setSuccess(true)
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.resetPassword.genericError)
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
          <p className="login-subtitle">{t.resetPassword.subtitle}</p>
        </div>

        {success ? (
          <div className="form-success-box">
            <p className="form-success-message">{t.resetPassword.successMessage}</p>
            <div className="login-footer-links">
              <p className="login-alt-link">
                <Link to="/login">← {t.resetPassword.backToLogin}</Link>
              </p>
            </div>
          </div>
        ) : !token ? (
          <div className="form-error-box">
            <p className="form-error">{t.resetPassword.invalidToken}</p>
            <div className="login-footer-links">
              <p className="login-alt-link">
                <Link to="/forgot-password">Solicitar novo link de recuperação</Link>
              </p>
            </div>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="form-error">{error}</div>}
            <PasswordInput
              className="login-input"
              name="newPassword"
              placeholder={t.resetPassword.newPasswordPlaceholder}
              required
              autoFocus
              autoComplete="new-password"
            />
            <PasswordInput
              className="login-input"
              name="confirmPassword"
              placeholder={t.resetPassword.confirmPasswordPlaceholder}
              required
              autoComplete="new-password"
            />
            <button className="login-submit" type="submit" disabled={isPending}>
              {isPending && <span className="login-spinner" aria-hidden="true" />}
              {isPending ? t.resetPassword.submitting : t.resetPassword.submit}
            </button>
            <div className="login-footer-links">
              <p className="login-alt-link">
                <Link to="/login">← {t.resetPassword.backToLogin}</Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
