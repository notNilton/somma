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

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Navegação móvel">
        <NavLink
          to="/app"
          end
          className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="mobile-nav-icon">📊</span>
          <span className="mobile-nav-label">{t.nav.transactions}</span>
        </NavLink>
        <NavLink
          to="/app/accounts"
          className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="mobile-nav-icon">🏦</span>
          <span className="mobile-nav-label">Contas</span>
        </NavLink>
        <NavLink
          to="/app/projections"
          className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="mobile-nav-icon">📈</span>
          <span className="mobile-nav-label">Projeções</span>
        </NavLink>
        <NavLink
          to="/app/budgets"
          className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="mobile-nav-icon">🎯</span>
          <span className="mobile-nav-label">Metas</span>
        </NavLink>
        <NavLink
          to="/app/reports"
          className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="mobile-nav-icon">📄</span>
          <span className="mobile-nav-label">Relatórios</span>
        </NavLink>
        <NavLink
          to="/app/config"
          className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="mobile-nav-icon">⚙️</span>
          <span className="mobile-nav-label">{t.nav.config}</span>
        </NavLink>
      </nav>

      <ShortcutsHint />
    </>
  )
}
