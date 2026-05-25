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
          tallyoh
        </NavLink>
        <span className="nav-spacer" />
        {isFetching > 0 && (
          <span className="sync-dot syncing" title={t.nav.syncing} />
        )}
        <NavLink
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          to="/"
          end
        >
          {t.nav.transactions}
        </NavLink>
        <NavLink
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          to="/budgets"
        >
          {t.nav.budgets}
        </NavLink>
        <NavLink
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          to="/config"
        >
          {t.nav.config}
        </NavLink>
        <button className="btn-logout" onClick={handleLogout}>
          {t.nav.logout}
        </button>
      </nav>
      <Outlet />
    </>
  )
}
