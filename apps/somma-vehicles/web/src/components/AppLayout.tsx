import React from 'react'
import { NavLink } from 'react-router-dom'
import { Activity, LayoutDashboard, ArrowUpRight, LogOut } from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const expensesUrl = import.meta.env.VITE_EXPENSES_URL || 'https://sommae.nilbyte.com.br'

  const handleLogout = () => {
    localStorage.removeItem('somma-expenses:authed')
    localStorage.removeItem('somma-expenses:email')
    localStorage.removeItem('somma-vehicles:authed')
    localStorage.removeItem('token')
    window.location.href = `${expensesUrl}/login`
  }

  const navItems = [
    { to: '/', label: 'Visão geral', icon: LayoutDashboard, end: true },
    { to: '/bi', label: 'Dados Expandidos', icon: Activity, end: false },
  ]

  return (
    <div className="app-container">
      {/* Desktop Sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <NavLink className="brand" to="/">
            somma-vehicles
          </NavLink>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-section">MENU</div>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? ' active' : ''}`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <a
            href={expensesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-external-link"
            title="Ir para o Somma Expenses"
          >
            <span className="font-semibold text-xs text-[var(--text-strong)]">Ir para Expenses</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </a>

          <button
            onClick={handleLogout}
            className="sidebar-logout-btn"
            title="Encerrar sessão"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-content-wrapper">
        <main className="app-main-content">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Lowbar) */}
      <nav className="bottom-nav" aria-label="Navegação principal">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `bottom-nav-item${isActive ? ' active' : ''}`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
        <button
          type="button"
          onClick={handleLogout}
          className="bottom-nav-item text-red-500"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </nav>
    </div>
  )
}
