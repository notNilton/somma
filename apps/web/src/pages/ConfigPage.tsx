import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'

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
  const [theme, setTheme] = useState<Theme>(getStoredTheme)
  const [cacheCleared, setCacheCleared] = useState(false)

  function handleTheme(t: Theme) {
    setTheme(t)
    applyTheme(t)
  }

  function handleClearCache() {
    qc.clear()
    localStorage.removeItem('tallyoh:cache')
    setCacheCleared(true)
    setTimeout(() => setCacheCleared(false), 2500)
  }

  return (
    <div className="config-page">
      <h2 className="config-title">Configurações</h2>

      <section className="config-section">
        <h3 className="config-section-title">Conta</h3>
        <div className="config-row">
          <span className="config-label">Email</span>
          <span className="config-value">{email || '—'}</span>
        </div>
      </section>

      <section className="config-section">
        <h3 className="config-section-title">Aparência</h3>
        <div className="config-row">
          <span className="config-label">Tema</span>
          <div className="config-pills">
            {(['auto', 'light', 'dark'] as Theme[]).map((t) => (
              <span
                key={t}
                className={`pill neutral${theme === t ? ' active-neutral' : ''}`}
                onClick={() => handleTheme(t)}
              >
                {t === 'auto' ? 'Auto' : t === 'light' ? 'Claro' : 'Escuro'}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="config-section">
        <h3 className="config-section-title">Dados</h3>
        <div className="config-row">
          <div>
            <span className="config-label">Cache local</span>
            <p className="config-hint">Limpa os dados em cache e recarrega do servidor.</p>
          </div>
          <button
            className={`btn-action-sm${cacheCleared ? ' btn-action-ok' : ''}`}
            onClick={handleClearCache}
          >
            {cacheCleared ? 'Limpo ✓' : 'Limpar cache'}
          </button>
        </div>
      </section>

      <section className="config-section">
        <h3 className="config-section-title">Sobre</h3>
        <div className="config-row">
          <span className="config-label">Aplicativo</span>
          <span className="config-value">tallyoh</span>
        </div>
        <div className="config-row">
          <span className="config-label">Versão web</span>
          <span className="config-value">0.0.0</span>
        </div>
      </section>
    </div>
  )
}
