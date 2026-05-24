import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import TransactionsPage from './pages/TransactionsPage'

export default function App() {
  const [authed, setAuthed] = useState(() => localStorage.getItem('tallyoh:authed') === '1')

  const handleLogin = () => {
    localStorage.setItem('tallyoh:authed', '1')
    setAuthed(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('tallyoh:authed')
    setAuthed(false)
  }

  if (!authed) return <LoginPage onLogin={handleLogin} />
  return <TransactionsPage onLogout={handleLogout} />
}
