import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../i18n'
import { settingsApi } from '../api'
import type { Locale } from '../i18n/translations'
import { version } from '../../package.json'

type Theme = 'auto' | 'light' | 'dark'

function getStoredTheme(): Theme {
  return (localStorage.getItem('tallyoh:theme') as Theme) ?? 'auto'
}

function applyTheme(th: Theme) {
  localStorage.setItem('tallyoh:theme', th)
  if (th === 'auto') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', th)
  }
}

export default function ConfigPage() {
  const { email, logout } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t, locale, setLocale } = useLocale()
  const [theme, setTheme] = useState<Theme>(getStoredTheme)
  const [cacheCleared, setCacheCleared] = useState(false)

  // Name editing
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => settingsApi.getProfile(),
  })

  const updateNameMutation = useMutation({
    mutationFn: (name: string) => settingsApi.updateProfile({ name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      setEditingName(false)
    },
  })

  // Initial balance
  const [editingBalance, setEditingBalance] = useState(false)
  const [balanceInput, setBalanceInput] = useState('')
  const [balanceSaved, setBalanceSaved] = useState(false)

  const { data: initialBalanceData } = useQuery({
    queryKey: ['initial-balance'],
    queryFn: () => settingsApi.getInitialBalance(),
  })

  const updateBalanceMutation = useMutation({
    mutationFn: (v: number) => settingsApi.updateInitialBalance(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['initial-balance'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setEditingBalance(false)
      setBalanceSaved(true)
      setTimeout(() => setBalanceSaved(false), 2000)
    },
  })

  function handleBalanceSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = parseFloat(balanceInput.replace(',', '.'))
    if (!isNaN(v)) updateBalanceMutation.mutate(v)
  }

  function startEditBalance() {
    setBalanceInput(String(initialBalanceData?.initialBalance ?? 0))
    setEditingBalance(true)
  }

  // Password change
  const [pwdOpen, setPwdOpen] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState(false)

  const changePwdMutation = useMutation({
    mutationFn: () => settingsApi.changePassword(currentPwd, newPwd),
    onSuccess: () => {
      setPwdSuccess(true)
      setCurrentPwd('')
      setNewPwd('')
      setPwdError('')
      setTimeout(() => { setPwdSuccess(false); setPwdOpen(false) }, 2500)
    },
    onError: (err: Error) => {
      if (err.message?.toLowerCase().includes('incorrect')) {
        setPwdError(t.config.changePwd.errorWrong)
      } else {
        setPwdError(err.message)
      }
    },
  })

  function handleChangePwd(e: React.FormEvent) {
    e.preventDefault()
    if (newPwd.length < 12) { setPwdError(t.config.changePwd.errorShort); return }
    setPwdError('')
    changePwdMutation.mutate()
  }

  // Account deletion
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')

  const deleteAccountMutation = useMutation({
    mutationFn: () => settingsApi.deleteAccount(deletePassword),
    onSuccess: () => {
      logout()
      navigate('/login', { replace: true })
    },
    onError: (err: Error) => {
      if (err.message?.toLowerCase().includes('incorrect')) {
        setDeleteError(t.config.deleteAccount.errorWrong)
      } else {
        setDeleteError(err.message)
      }
    },
  })

  function handleTheme(th: Theme) {
    setTheme(th)
    applyTheme(th)
  }

  function handleClearCache() {
    qc.clear()
    localStorage.removeItem('tallyoh:cache')
    setCacheCleared(true)
    setTimeout(() => setCacheCleared(false), 2500)
  }

  function startEditName() {
    setNameInput(profile?.name ?? '')
    setEditingName(true)
  }

  const themeLabels: Record<Theme, string> = {
    auto: t.config.themeAuto,
    light: t.config.themeLight,
    dark: t.config.themeDark,
  }

  return (
    <div className="config-page">
      <h2 className="config-title">{t.config.title}</h2>

      {/* Account */}
      <section className="config-section">
        <h3 className="config-section-title">{t.config.sections.account}</h3>
        <div className="config-row">
          <span className="config-label">{t.config.email}</span>
          <span className="config-value">{email || '—'}</span>
        </div>
        <div className="config-row">
          <span className="config-label">{t.config.name}</span>
          {editingName ? (
            <form
              className="config-inline-form"
              onSubmit={e => { e.preventDefault(); updateNameMutation.mutate(nameInput) }}
            >
              <input
                className="config-inline-input"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder={t.config.namePlaceholder}
                autoFocus
                maxLength={100}
              />
              <button type="submit" className="btn-action-sm" disabled={updateNameMutation.isPending}>
                {t.config.nameSave}
              </button>
              <button type="button" className="btn-action-sm btn-action-ghost" onClick={() => setEditingName(false)}>
                ×
              </button>
            </form>
          ) : (
            <div className="config-value-row">
              <span className="config-value">{profile?.name || '—'}</span>
              <button className="btn-action-sm btn-action-ghost" onClick={startEditName}>
                {t.config.nameEdit}
              </button>
            </div>
          )}
        </div>

        {/* Initial balance */}
        <div className="config-row">
          <div>
            <span className="config-label">{t.config.initialBalance}</span>
            <p className="config-hint">{t.config.initialBalanceHint}</p>
          </div>
          {editingBalance ? (
            <form className="config-inline-form" onSubmit={handleBalanceSubmit}>
              <input
                className="config-inline-input"
                type="number"
                step="0.01"
                placeholder={t.config.initialBalancePlaceholder}
                value={balanceInput}
                onChange={e => setBalanceInput(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn-action-sm" disabled={updateBalanceMutation.isPending}>
                {t.config.initialBalanceSave}
              </button>
              <button type="button" className="btn-action-sm btn-action-ghost" onClick={() => setEditingBalance(false)}>
                ×
              </button>
            </form>
          ) : (
            <div className="config-value-row">
              <span className="config-value">
                {balanceSaved ? '✓' : (initialBalanceData?.initialBalance ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <button className="btn-action-sm btn-action-ghost" onClick={startEditBalance}>
                {t.config.nameEdit}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Appearance */}
      <section className="config-section">
        <h3 className="config-section-title">{t.config.sections.appearance}</h3>
        <div className="config-row">
          <span className="config-label">{t.config.theme}</span>
          <div className="config-pills">
            {(['auto', 'light', 'dark'] as Theme[]).map(th => (
              <span
                key={th}
                className={`pill neutral${theme === th ? ' active-neutral' : ''}`}
                onClick={() => handleTheme(th)}
              >
                {themeLabels[th]}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="config-section">
        <h3 className="config-section-title">{t.config.sections.language}</h3>
        <div className="config-row">
          <span className="config-label">{t.config.languageLabel}</span>
          <div className="config-pills">
            {(['pt-BR', 'en-US', 'es'] as Locale[]).map(l => (
              <span
                key={l}
                className={`pill neutral${locale === l ? ' active-neutral' : ''}`}
                onClick={() => setLocale(l)}
              >
                {t.locale[l]}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Security — change password */}
      <section className="config-section">
        <h3 className="config-section-title">{t.config.sections.security}</h3>
        <div className="config-row">
          <div>
            <span className="config-label">{t.config.changePwd.label}</span>
            {!pwdOpen && <p className="config-hint">{t.config.changePwd.hint}</p>}
          </div>
          {!pwdOpen && (
            <button className="btn-action-sm btn-action-ghost" onClick={() => setPwdOpen(true)}>
              {t.config.nameEdit}
            </button>
          )}
        </div>
        {pwdOpen && (
          <form className="config-pwd-form" onSubmit={handleChangePwd}>
            {pwdError && <div className="config-form-error">{pwdError}</div>}
            {pwdSuccess && <div className="config-form-success">{t.config.changePwd.success}</div>}
            <input
              className="config-inline-input"
              type="password"
              placeholder={t.config.changePwd.current}
              value={currentPwd}
              onChange={e => setCurrentPwd(e.target.value)}
              required
            />
            <input
              className="config-inline-input"
              type="password"
              placeholder={t.config.changePwd.next}
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              required
              minLength={12}
            />
            <div className="config-form-actions">
              <button type="button" className="btn-action-sm btn-action-ghost" onClick={() => { setPwdOpen(false); setPwdError(''); setCurrentPwd(''); setNewPwd('') }}>
                {t.modal.cancel}
              </button>
              <button type="submit" className="btn-action-sm" disabled={changePwdMutation.isPending}>
                {changePwdMutation.isPending ? t.config.changePwd.saving : t.config.changePwd.save}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Data */}
      <section className="config-section">
        <h3 className="config-section-title">{t.config.sections.data}</h3>
        <div className="config-row">
          <div>
            <span className="config-label">{t.config.cacheLabel}</span>
            <p className="config-hint">{t.config.cacheHint}</p>
          </div>
          <button
            className={`btn-action-sm${cacheCleared ? ' btn-action-ok' : ''}`}
            onClick={handleClearCache}
          >
            {cacheCleared ? t.config.cacheDone : t.config.cacheClear}
          </button>
        </div>
        <div className="config-row">
          <div>
            <span className="config-label">{t.config.importLabel}</span>
          </div>
          <button className="btn-action-sm btn-action-ghost" onClick={() => navigate('/import')}>
            {t.config.importButton}
          </button>
        </div>
      </section>

      {/* About */}
      <section className="config-section">
        <h3 className="config-section-title">{t.config.sections.about}</h3>
        <div className="config-row">
          <span className="config-label">{t.config.appLabel}</span>
          <span className="config-value">tallyoh</span>
        </div>
        <div className="config-row">
          <span className="config-label">{t.config.webVersionLabel}</span>
          <span className="config-value">{version}</span>
        </div>
      </section>

      {/* Danger zone */}
      <section className="config-section config-danger-section">
        <h3 className="config-section-title danger">{t.config.sections.danger}</h3>
        <div className="config-row">
          <div>
            <span className="config-label">{t.config.deleteAccount.label}</span>
            <p className="config-hint">{t.config.deleteAccount.hint}</p>
          </div>
          {!deleteOpen && (
            <button className="btn-action-sm btn-action-danger" onClick={() => setDeleteOpen(true)}>
              {t.config.deleteAccount.button}
            </button>
          )}
        </div>
        {deleteOpen && (
          <form className="config-pwd-form" onSubmit={e => { e.preventDefault(); deleteAccountMutation.mutate() }}>
            <p className="config-hint">{t.config.deleteAccount.confirmHint}</p>
            {deleteError && <div className="config-form-error">{deleteError}</div>}
            <input
              className="config-inline-input"
              type="password"
              placeholder={t.config.deleteAccount.passwordPlaceholder}
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              required
              autoFocus
            />
            <div className="config-form-actions">
              <button type="button" className="btn-action-sm btn-action-ghost" onClick={() => { setDeleteOpen(false); setDeleteError(''); setDeletePassword('') }}>
                {t.config.deleteAccount.cancel}
              </button>
              <button type="submit" className="btn-action-sm btn-action-danger" disabled={deleteAccountMutation.isPending}>
                {t.config.deleteAccount.confirm}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
