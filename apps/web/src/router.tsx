import { Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import TransactionsPage from './pages/TransactionsPage'
import BudgetsPage from './pages/BudgetsPage'
import ConfigPage from './pages/ConfigPage'
import DashboardPage from './pages/DashboardPage'
import ImportPage from './pages/ImportPage'
import GoalsPage from './pages/GoalsPage'
import ReportPage from './pages/ReportPage'

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
    path: '/register',
    element: <RegisterPage />,
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
            path: '/budgets',
            element: (
              <Suspense fallback={<PageSpinner />}>
                <BudgetsPage />
              </Suspense>
            ),
          },
          {
            path: '/dashboard',
            element: (
              <Suspense fallback={<PageSpinner />}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: '/config',
            element: <ConfigPage />,
          },
          {
            path: '/import',
            element: <ImportPage />,
          },
          {
            path: '/goals',
            element: (
              <Suspense fallback={<PageSpinner />}>
                <GoalsPage />
              </Suspense>
            ),
          },
          {
            path: '/report',
            element: (
              <Suspense fallback={<PageSpinner />}>
                <ReportPage />
              </Suspense>
            ),
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
