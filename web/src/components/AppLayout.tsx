import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../i18n'
import ShortcutsHint from './ShortcutsHint'

type Theme = 'auto' | 'light' | 'dark'

export default function AppLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const isFetching = useIsFetching()
  const qc = useQueryClient()
  const { t } = useLocale()

  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('somma:theme') as Theme) ?? 'auto')

  useEffect(() => {
    if (theme === 'auto') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
    localStorage.setItem('somma:theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(curr => {
      if (curr === 'light') return 'dark'
      if (curr === 'dark') return 'auto'
      return 'light'
    })
  }

  async function handleLogout() {
    await authApi.logout().catch(() => {})
    qc.clear()
    logout()
    navigate('/login', { replace: true })
  }

  const themeIcon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻'
  const themeTitle = theme === 'dark' ? 'Tema Escuro' : theme === 'light' ? 'Tema Claro' : 'Tema do Sistema'

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
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/app/budgets">
            🎯 Orçamentos & Metas
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/app/config">
            {t.nav.config}
          </NavLink>
        </div>
        <button
          type="button"
          className="btn-theme-toggle"
          onClick={toggleTheme}
          title={`Tema atual: ${themeTitle} (clique para alternar)`}
          aria-label="Alternar tema"
        >
          {themeIcon}
        </button>
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
          to="/app/budgets"
          className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="mobile-nav-icon">🎯</span>
          <span className="mobile-nav-label">Metas</span>
        </NavLink>
        <NavLink
          to="/app/config"
          className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="mobile-nav-icon">⚙️</span>
          <span className="mobile-nav-label">{t.nav.config}</span>
        </NavLink>
        <button
          type="button"
          className="mobile-nav-item mobile-theme-btn"
          onClick={toggleTheme}
          title={themeTitle}
        >
          <span className="mobile-nav-icon">{themeIcon}</span>
          <span className="mobile-nav-label">Tema</span>
        </button>
      </nav>

      <ShortcutsHint />
    </>
  )
}
