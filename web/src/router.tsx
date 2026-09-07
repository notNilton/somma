import { Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import AppLayout from './components/AppLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import TransactionsPage from './pages/TransactionsPage'
import BudgetsPage from './pages/BudgetsPage'
import ConfigPage from './pages/ConfigPage'

function RequireAuth() {
  const { authed } = useAuth()
  if (!authed) return <Navigate to="/login" replace />
  return <Outlet />
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { authed } = useAuth()
  if (authed) return <Navigate to="/app" replace />
  return <>{children}</>
}

function PageSpinner() {
  return <div className="page-spinner">Carregando...</div>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <RedirectIfAuthed>
        <LandingPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: '/login',
    element: (
      <RedirectIfAuthed>
        <LoginPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: '/register',
    element: (
      <RedirectIfAuthed>
        <RegisterPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <RedirectIfAuthed>
        <ForgotPasswordPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <RedirectIfAuthed>
        <ResetPasswordPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: '/app',
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '',
            element: (
              <Suspense fallback={<PageSpinner />}>
                <TransactionsPage />
              </Suspense>
            ),
          },
          {
            path: 'budgets',
            element: <BudgetsPage />,
          },
          {
            path: 'config',
            element: <ConfigPage />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
