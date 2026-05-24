import { createContext, useContext, useState, type ReactNode } from 'react'

interface AuthContextValue {
  authed: boolean
  email: string
  login: (email: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(() => localStorage.getItem('tallyoh:authed') === '1')
  const [email, setEmail] = useState(() => localStorage.getItem('tallyoh:email') ?? '')

  function login(userEmail: string) {
    localStorage.setItem('tallyoh:authed', '1')
    localStorage.setItem('tallyoh:email', userEmail)
    setAuthed(true)
    setEmail(userEmail)
  }

  function logout() {
    localStorage.removeItem('tallyoh:authed')
    localStorage.removeItem('tallyoh:email')
    setAuthed(false)
    setEmail('')
  }

  return (
    <AuthContext.Provider value={{ authed, email, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
