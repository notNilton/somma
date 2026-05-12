import { useEffect, useMemo, useRef, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import {
  applyQueuedSyncResult,
  isLikelyNetworkError,
  readSyncQueue,
  removeSyncQueueItem,
  sendQueuedItem,
  subscribeSyncQueue,
  updateSyncQueueItem,
  mergeQueuedCategories,
  mergeQueuedBudgets,
  mergeQueuedVehicles,
  mergeQueuedTransactions,
} from '../lib/offline-sync';

function getOnlineState() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function syncQueuedStateIntoCache(queryClient: QueryClient) {
  const queries = queryClient.getQueryCache().findAll();

  for (const query of queries) {
    const key = query.queryKey as unknown[];
    const root = key[0];

    if (root === 'transactions') {
      const search = typeof key[1] === 'string' ? key[1] : '';
      const filterType =
        key[2] === 'INCOME' || key[2] === 'EXPENSE' ? key[2] : ('all' as const);
      const selectedCategory = typeof key[3] === 'string' ? key[3] : 'all';
      const selectedStatus = typeof key[4] === 'string' ? key[4] : undefined;
      const selectedClassification = typeof key[5] === 'string' ? key[5] : undefined;

      queryClient.setQueryData(key, (current) => {
        if (!Array.isArray(current)) return current;
        return mergeQueuedTransactions(current, {
          search,
          filterType,
          selectedCategory,
          selectedStatus,
          selectedClassification,
        });
      });
      continue;
    }

    if (root === 'categories' || root === 'settings-categories') {
      queryClient.setQueryData(key, (current) => {
        if (!Array.isArray(current)) return current;
        return mergeQueuedCategories(current);
      });
      continue;
    }

    if (root === 'budgets' && key[2] !== 'transactions') {
      queryClient.setQueryData(key, (current) => {
        if (!Array.isArray(current)) return current;
        return mergeQueuedBudgets(current);
      });
      continue;
    }

    if (root === 'vehicles') {
      queryClient.setQueryData(key, (current) => {
        if (!Array.isArray(current)) return current;
        return mergeQueuedVehicles(current);
      });
    }
  }
}

function applyQueuedResultIntoCache(
  queryClient: QueryClient,
  item: ReturnType<typeof readSyncQueue>[number],
  result: Record<string, unknown> | null,
) {
  const queries = queryClient.getQueryCache().findAll();
  for (const query of queries) {
    const key = query.queryKey as unknown[];
    const root = key[0];

    if (
      item.kind.startsWith('transaction.') &&
      (root === 'transactions' || (root === 'budgets' && key[2] === 'transactions'))
    ) {
      queryClient.setQueryData(key, (current) => {
        if (!Array.isArray(current)) return current;
        return applyQueuedSyncResult(current, item, result);
      });
      continue;
    }

    if (item.kind.startsWith('category.') && (root === 'categories' || root === 'settings-categories')) {
      queryClient.setQueryData(key, (current) => {
        if (!Array.isArray(current)) return current;
        return applyQueuedSyncResult(current, item, result);
      });
      continue;
    }

    if (item.kind.startsWith('budget.') && root === 'budgets' && key[2] !== 'transactions') {
      queryClient.setQueryData(key, (current) => {
        if (!Array.isArray(current)) return current;
        return applyQueuedSyncResult(current, item, result);
      });
      continue;
    }

    if (item.kind.startsWith('vehicle.') && root === 'vehicles') {
      queryClient.setQueryData(key, (current) => {
        if (!Array.isArray(current)) return current;
        return applyQueuedSyncResult(current, item, result);
      });
    }
  }
}

type Props = {
  queryClient: QueryClient;
};

export default function OfflineSyncBridge({ queryClient }: Props) {
  const [online, setOnline] = useState(getOnlineState);
  const [pendingCount, setPendingCount] = useState(() => readSyncQueue().length);
  const syncingRef = useRef(false);

  useEffect(() => {
    const syncState = () => {
      setOnline(getOnlineState());
      setPendingCount(readSyncQueue().length);
      syncQueuedStateIntoCache(queryClient);
    };

    syncState();
    window.addEventListener('online', syncState);
    window.addEventListener('offline', syncState);
    const unsubscribe = subscribeSyncQueue(syncState);

    return () => {
      window.removeEventListener('online', syncState);
      window.removeEventListener('offline', syncState);
      unsubscribe();
    };
  }, [queryClient]);

  useEffect(() => {
    if (!online || syncingRef.current) return;

    const flush = async () => {
      syncingRef.current = true;

      try {
        const queue = readSyncQueue();
        for (const item of queue) {
          try {
            const result =
              item.method === 'DELETE' ? null : await sendQueuedItem(item);
            applyQueuedResultIntoCache(queryClient, item, result);
            removeSyncQueueItem(item.id);
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['budgets'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['settings-categories'] });
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            queryClient.invalidateQueries({ queryKey: ['vehicle-stats'] });
            queryClient.invalidateQueries({ queryKey: ['vehicle-refuelings'] });
          } catch (error) {
            updateSyncQueueItem(item.id, {
              attempts: item.attempts + 1,
              lastError: error instanceof Error ? error.message : 'Falha ao sincronizar',
            });

            if (isLikelyNetworkError(error)) {
              break;
            }
          }
        }
      } finally {
        syncingRef.current = false;
        setPendingCount(readSyncQueue().length);
        syncQueuedStateIntoCache(queryClient);
      }
    };

    void flush();
  }, [online, pendingCount, queryClient]);

  const banner = useMemo(() => {
    if (!online) {
      return {
        title: 'Trabalhando offline',
        description: 'As mudanças ficam locais e serão enviadas quando a conexão voltar.',
        tone: 'bg-slate-950 text-white border-slate-700',
      };
    }

    if (pendingCount > 0) {
      return {
        title: 'Sincronização pendente',
        description: `${pendingCount} alteração(ões) aguardando confirmação do servidor.`,
        tone: 'bg-amber-100 text-amber-950 border-amber-200',
      };
    }

    return null;
  }, [online, pendingCount]);

  if (!banner) return null;

  return (
    <div className="sticky top-0 z-50 border-b px-4 py-2 text-sm shadow-sm backdrop-blur-md sm:px-6">
      <div className={`mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-xl border px-3 py-2 ${banner.tone}`}>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em]">{banner.title}</p>
          <p className="text-xs opacity-90">{banner.description}</p>
        </div>
      </div>
    </div>
  );
}
