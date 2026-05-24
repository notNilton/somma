import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,       // 2 min — mostra cache, rebusca em background
      gcTime: 1000 * 60 * 60 * 24,    // 24h no cache
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})

export const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'tallyoh:cache',
})
