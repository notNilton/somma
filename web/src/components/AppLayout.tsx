import { useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../i18n'
import ShortcutsHint from './ShortcutsHint'

export default function AppLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const isFetching = useIsFetching()
  const qc = useQueryClient()
  const { t } = useLocale()

  // Forçar sempre Light Mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    localStorage.removeItem('somma:theme')
    localStorage.removeItem('somma-expenses:theme')
  }, [])

  async function handleLogout() {
    await authApi.logout().catch(() => {})
    qc.clear()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <nav className="app-nav">
        <NavLink className="brand" to="/app">
          somma
        </NavLink>
        <span className="nav-spacer" />
        {isFetching > 0 && (
          <span className="sync-dot syncing" title={t.nav.syncing} />
        )}
        <div className="nav-desktop-links">
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/app" end>
            {t.nav.transactions}
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/app/accounts">
            Contas
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/app/projections">
            Projeções & Runway
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/app/budgets">
            Orçamentos & Metas
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/app/reports">
            Relatórios & Importação
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/app/config">
            {t.nav.config}
          </NavLink>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          {t.nav.logout}
        </button>
      </nav>
      <Outlet />
      <footer className="app-footer">
        <span className="app-footer-brand">somma</span>
        <span className="app-footer-sep" />
        desenvolvido por <a className="app-footer-link" href="https://nilbyte.com.br" target="_blank" rel="noopener noreferrer">nilbyte</a>
        <span className="app-footer-sep" />
        {new Date().getFullYear()}
      </footer>

      {/* Mobile Bottom Navigation Bar - Minimalista */}
      <nav className="mobile-bottom-nav" aria-label="Navegação móvel">
        <NavLink
          to="/app"
          end
          className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span className="mobile-nav-label">{t.nav.transactions}</span>
        </NavLink>
        <NavLink
          to="/app/accounts"
          className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="5" width="20" height="14" rx="0" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          <span className="mobile-nav-label">Contas</span>
        </NavLink>
        <NavLink
          to="/app/projections"
          className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
          <span className="mobile-nav-label">Projeções</span>
        </NavLink>
        <NavLink
          to="/app/budgets"
          className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="12" cy="12" r="1.5" />
          </svg>
          <span className="mobile-nav-label">Metas</span>
        </NavLink>
        <NavLink
          to="/app/reports"
          className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span className="mobile-nav-label">Relatórios</span>
        </NavLink>
        <NavLink
          to="/app/config"
          className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span className="mobile-nav-label">{t.nav.config}</span>
        </NavLink>
      </nav>

      <ShortcutsHint />
    </>
  )
}
