import { useEffect } from 'react';
import type { QueryClient, DehydratedState } from '@tanstack/react-query';
import { dehydrate, hydrate } from '@tanstack/react-query';

const CACHE_KEY = 'personalledger.query-cache.v1';
const MAX_AGE_MS = 1000 * 60 * 60 * 24;

type PersistedCache = {
  savedAt: string;
  state: DehydratedState;
};

function hasWindow() {
  return typeof window !== 'undefined';
}

function getStorage() {
  if (!hasWindow()) return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function restorePersistedQueryClient(queryClient: QueryClient) {
  const storage = getStorage();
  if (!storage) return;

  const raw = storage.getItem(CACHE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as PersistedCache;
    const savedAt = new Date(parsed.savedAt).getTime();
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > MAX_AGE_MS) {
      storage.removeItem(CACHE_KEY);
      return;
    }

    hydrate(queryClient, parsed.state);
  } catch {
    storage.removeItem(CACHE_KEY);
  }
}

function persistQueryClient(queryClient: QueryClient) {
  const storage = getStorage();
  if (!storage) return;

  try {
    const state = dehydrate(queryClient, {
      shouldDehydrateQuery: (query) => query.state.status === 'success',
    });
    const payload: PersistedCache = {
      savedAt: new Date().toISOString(),
      state,
    };
    storage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore cache persistence failures.
  }
}

export function QueryCachePersistenceBridge({ queryClient }: { queryClient: QueryClient }) {
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      persistQueryClient(queryClient);
    });

    persistQueryClient(queryClient);

    return unsubscribe;
  }, [queryClient]);

  return null;
}

