import React from 'react'
import { Navbar } from './Navbar'

interface AppLayoutProps {
  activeTab: 'dashboard' | 'vehicles' | 'refuelings'
  setActiveTab: (tab: 'dashboard' | 'vehicles' | 'refuelings') => void
  onOpenNewRefueling: () => void
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewRefueling,
  children,
}) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewRefueling={onOpenNewRefueling}
      />

      <main className="flex-1">
        {children}
      </main>

      <footer className="app-footer">
        <span className="app-footer-brand">somma</span>
        <span className="app-footer-sep" />
        desenvolvido por{' '}
        <a
          className="app-footer-link"
          href="https://nilbyte.com.br"
          target="_blank"
          rel="noopener noreferrer"
        >
          nilbyte
        </a>
        <span className="app-footer-sep" />
        {new Date().getFullYear()}
      </footer>
    </div>
  )
}
