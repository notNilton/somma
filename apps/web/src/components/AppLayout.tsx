import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api'

export default function AppLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isFetching = useIsFetching()

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
          <span className="sync-dot syncing" title="Sincronizando..." />
        )}
        <NavLink
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          to="/"
          end
        >
          Transações
        </NavLink>
        <NavLink
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          to="/config"
        >
          Config
        </NavLink>
        <button className="btn-logout" onClick={handleLogout}>
          Sair
        </button>
      </nav>
      <Outlet />
    </>
  )
}
