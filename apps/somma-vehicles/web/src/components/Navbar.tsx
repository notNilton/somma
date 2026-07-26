import React from 'react'
import { Fuel, Car, LayoutDashboard, Droplet, ArrowUpRight } from 'lucide-react'

interface NavbarProps {
  activeTab: 'dashboard' | 'vehicles' | 'refuelings'
  setActiveTab: (tab: 'dashboard' | 'vehicles' | 'refuelings') => void
  onOpenNewRefueling: () => void
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewRefueling,
}) => {
  const expensesUrl = import.meta.env.VITE_EXPENSES_URL || 'http://localhost:3400'

  const navItems: { id: 'dashboard' | 'vehicles' | 'refuelings'; label: string }[] = [
    { id: 'dashboard', label: 'Visão geral' },
    { id: 'vehicles', label: 'Veículos' },
    { id: 'refuelings', label: 'Abastecimentos' },
  ]

  return (
    <>
      <header className="app-nav">
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); setActiveTab('dashboard') }}>
          somma
        </a>

        <span className="nav-spacer" />

        <nav className="hidden md:flex items-center">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-link${activeTab === item.id ? ' active' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <a
          href={expensesUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="nav-action hidden sm:flex"
          title="Ir para Expenses"
        >
          <ArrowUpRight className="w-4 h-4" />
        </a>

        <button
          onClick={onOpenNewRefueling}
          className="nav-action"
          title="Novo abastecimento"
        >
          <Droplet className="w-4 h-4" />
        </button>
      </header>

      <nav className="bottom-nav md:hidden" aria-label="Navegação principal">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`bottom-nav-item${activeTab === 'dashboard' ? ' active' : ''}`}
        >
          <LayoutDashboard />
          Visão geral
        </button>
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`bottom-nav-item${activeTab === 'vehicles' ? ' active' : ''}`}
        >
          <Car />
          Veículos
        </button>
        <button
          onClick={() => setActiveTab('refuelings')}
          className={`bottom-nav-item${activeTab === 'refuelings' ? ' active' : ''}`}
        >
          <Fuel />
          Abastecimentos
        </button>
      </nav>
    </>
  )
}
