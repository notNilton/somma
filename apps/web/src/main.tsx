import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { RouterProvider } from 'react-router-dom'
import { queryClient, persister } from './queryClient'
import { AuthProvider } from './contexts/AuthContext'
import { router } from './router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
      >
        <RouterProvider router={router} />
      </PersistQueryClientProvider>
    </AuthProvider>
  </StrictMode>,
)
