import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../i18n'
import { authApi } from '../api'

export default function AppLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isFetching = useIsFetching()
  const { t } = useLocale()

  async function handleLogout() {
    await authApi.logout().catch(() => {})
    qc.clear()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <nav className="app-nav">
        <NavLink className="brand" to="/">
          somma-expenses
        </NavLink>
        <span className="nav-spacer" />
        {isFetching > 0 && (
          <span className="sync-dot syncing" title={t.nav.syncing} />
        )}
        <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/" end>
          {t.nav.transactions}
        </NavLink>
        <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/config">
          {t.nav.config}
        </NavLink>
        <button className="btn-logout" onClick={handleLogout}>
          {t.nav.logout}
        </button>
      </nav>
      <Outlet />
      <footer className="app-footer">
        <span className="app-footer-brand">somma-expenses</span>
        <span className="app-footer-sep" />
        desenvolvido por <a className="app-footer-link" href="https://nilbyte.com.br" target="_blank" rel="noopener noreferrer">nilbyte</a>
        <span className="app-footer-sep" />
        {new Date().getFullYear()}
      </footer>

      <nav className="bottom-nav" aria-label="Navegação principal">
        <NavLink className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`} to="/" end>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-9.5z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9"/>
          </svg>
          {t.nav.transactions}
        </NavLink>
        <NavLink className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`} to="/config">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          {t.nav.config}
        </NavLink>
      </nav>
    </>
  )
}
