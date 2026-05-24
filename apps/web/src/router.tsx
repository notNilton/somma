import { Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import TransactionsPage from './pages/TransactionsPage'
import ConfigPage from './pages/ConfigPage'

function RequireAuth() {
  const { authed } = useAuth()
  if (!authed) return <Navigate to="/login" replace />
  return <Outlet />
}

function PageSpinner() {
  return <div className="page-spinner">Carregando...</div>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/',
            element: (
              <Suspense fallback={<PageSpinner />}>
                <TransactionsPage />
              </Suspense>
            ),
          },
          {
            path: '/config',
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
