import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../i18n'
import type { Locale } from '../i18n/translations'
import { version } from '../../package.json'

type Theme = 'auto' | 'light' | 'dark'

function getStoredTheme(): Theme {
  return (localStorage.getItem('tallyoh:theme') as Theme) ?? 'auto'
}

function applyTheme(t: Theme) {
  localStorage.setItem('tallyoh:theme', t)
  if (t === 'auto') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', t)
  }
}

export default function ConfigPage() {
  const { email } = useAuth()
  const qc = useQueryClient()
  const { t, locale, setLocale } = useLocale()
  const [theme, setTheme] = useState<Theme>(getStoredTheme)
  const [cacheCleared, setCacheCleared] = useState(false)

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

  const themeLabels: Record<Theme, string> = {
    auto: t.config.themeAuto,
    light: t.config.themeLight,
    dark: t.config.themeDark,
  }

  return (
    <div className="config-page">
      <h2 className="config-title">{t.config.title}</h2>

      <section className="config-section">
        <h3 className="config-section-title">{t.config.sections.account}</h3>
        <div className="config-row">
          <span className="config-label">{t.config.email}</span>
          <span className="config-value">{email || '—'}</span>
        </div>
      </section>

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
      </section>

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
    </div>
  )
}
