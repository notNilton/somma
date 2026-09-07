import { createContext, useContext, useState, type ReactNode } from 'react'

interface AuthContextValue {
  authed: boolean
  email: string
  login: (email: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(() => localStorage.getItem('somma:authed') === '1')
  const [email, setEmail] = useState(() => localStorage.getItem('somma:email') ?? '')

  function login(userEmail: string) {
    localStorage.setItem('somma:authed', '1')
    localStorage.setItem('somma:email', userEmail)
    setAuthed(true)
    setEmail(userEmail)
  }

  function logout() {
    localStorage.removeItem('somma:authed')
    localStorage.removeItem('somma:email')
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
