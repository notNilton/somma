import { api } from './api';

const OUTBOX_KEY = 'personalledger.sync.outbox.v1';
const OUTBOX_EVENT = 'personalledger.sync.outbox.changed';

export type SyncQueueKind =
  | 'transaction.create'
  | 'category.create'
  | 'category.update'
  | 'category.delete'
  | 'budget.create'
  | 'budget.update'
  | 'budget.delete'
  | 'vehicle.create'
  | 'vehicle.update'
  | 'vehicle.delete';

export interface SyncQueueItem {
  id: string;
  kind: SyncQueueKind;
  method: 'POST' | 'PATCH' | 'DELETE';
  path: string;
  payload?: Record<string, unknown>;
  entityId: string;
  tempEntityId?: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

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

function dispatchOutboxChange() {
  if (!hasWindow()) return;
  window.dispatchEvent(new Event(OUTBOX_EVENT));
}

export function isLikelyNetworkError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof TypeError) return true;
  if (!(error instanceof Error)) return false;
  return /fetch|network|failed to fetch|load failed/i.test(error.message);
}

export function readSyncQueue(): SyncQueueItem[] {
  const storage = getStorage();
  if (!storage) return [];

  const raw = storage.getItem(OUTBOX_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SyncQueueItem[]) : [];
  } catch {
    return [];
  }
}

function writeSyncQueue(queue: SyncQueueItem[]) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(OUTBOX_KEY, JSON.stringify(queue));
  dispatchOutboxChange();
}

export function enqueueSyncQueueItem(item: SyncQueueItem) {
  const queue = readSyncQueue();
  const next = [...queue, item];
  writeSyncQueue(next);
  return item;
}

export function updateSyncQueueItem(id: string, patch: Partial<SyncQueueItem>) {
  const queue = readSyncQueue();
  const next = queue.map((item) => (item.id === id ? { ...item, ...patch } : item));
  writeSyncQueue(next);
}

export function removeSyncQueueItem(id: string) {
  const queue = readSyncQueue();
  const next = queue.filter((item) => item.id !== id);
  writeSyncQueue(next);
}

export function clearSyncQueue() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(OUTBOX_KEY);
  dispatchOutboxChange();
}

export function subscribeSyncQueue(listener: () => void) {
  if (!hasWindow()) return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === OUTBOX_KEY) {
      listener();
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(OUTBOX_EVENT, listener);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(OUTBOX_EVENT, listener);
  };
}

export async function sendQueuedItem(item: SyncQueueItem) {
  if (item.method === 'POST') {
    return api.post<Record<string, unknown>>(item.path, item.payload);
  }

  if (item.method === 'PATCH') {
    return api.patch<Record<string, unknown>>(item.path, item.payload);
  }

  return api.delete<Record<string, unknown>>(item.path);
}

export function createSyncQueueId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `sync-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function upsertById<T extends { id: string }>(list: T[], item: T, prepend = false): T[] {
  const next = list.filter((entry) => entry.id !== item.id);
  return prepend ? [item, ...next] : [...next, item];
}

function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((entry) => entry.id !== id);
}

function patchById<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] {
  return list.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
}

function buildQueuedCategory(item: SyncQueueItem) {
  const payload = item.payload ?? {};
  return {
    id: item.entityId,
    name: String(payload.name ?? 'Categoria'),
    description: typeof payload.description === 'string' ? payload.description : undefined,
    type: payload.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
    color: typeof payload.color === 'string' ? payload.color : undefined,
    syncStatus: 'pending',
  };
}

function buildQueuedBudget(item: SyncQueueItem) {
  const payload = item.payload ?? {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  return {
    id: item.entityId,
    userId: '',
    name: String(payload.name ?? 'Orçamento'),
    targetDate: String(payload.targetDate ?? new Date().toISOString()),
    notes: typeof payload.notes === 'string' ? payload.notes : null,
    isActive: true,
    deletedAt: null,
    createdAt: item.createdAt,
    updatedAt: item.createdAt,
    total: 0,
    totalCents: 0,
    spent: 0,
    spentCents: 0,
    remaining: 0,
    remainingCents: 0,
    progress: 0,
    items: items.map((entry, index) => ({
      id: `${item.entityId}-item-${index}`,
      budgetId: item.entityId,
      categoryId: typeof entry === 'object' && entry && 'categoryId' in entry
        ? String((entry as Record<string, unknown>).categoryId ?? '')
        : null,
      name: typeof entry === 'object' && entry && 'name' in entry
        ? String((entry as Record<string, unknown>).name ?? 'Item')
        : 'Item',
      amount: 0,
      amountCents: 0,
      spent: 0,
      spentCents: 0,
      remaining: 0,
      remainingCents: 0,
      progress: 0,
      sortOrder: index,
    })),
    syncStatus: 'pending',
  };
}

function buildQueuedVehicle(item: SyncQueueItem) {
  const payload = item.payload ?? {};
  return {
    id: item.entityId,
    name: String(payload.name ?? 'Veículo'),
    licensePlate:
      typeof payload.licensePlate === 'string' ? payload.licensePlate : undefined,
    brand: typeof payload.brand === 'string' ? payload.brand : undefined,
    model: typeof payload.model === 'string' ? payload.model : undefined,
    year: typeof payload.year === 'number' ? payload.year : undefined,
    tank: typeof payload.tank === 'number' ? payload.tank : undefined,
    syncStatus: 'pending',
  };
}

export function mergeQueuedCategories<T extends { id: string; name: string; type: string; color?: string; description?: string; children?: T[]; syncStatus?: string }>(list: T[]): T[] {
  const queue = readSyncQueue().filter((item) =>
    item.kind === 'category.create' ||
    item.kind === 'category.update' ||
    item.kind === 'category.delete',
  );

  const byId = new Map<string, T>();
  list.forEach((item) => byId.set(item.id, item));

  for (const item of queue) {
    if (item.kind === 'category.create') {
      byId.set(item.entityId, buildQueuedCategory(item) as T);
      continue;
    }

    if (item.kind === 'category.update') {
      const current = byId.get(item.entityId);
      const payload = item.payload ?? {};
      const patch: Partial<T> = {
        ...(current ?? {}),
        name: typeof payload.name === 'string' ? payload.name : current?.name,
        description:
          typeof payload.description === 'string'
            ? payload.description
            : current?.description,
        type: payload.type === 'INCOME' || payload.type === 'EXPENSE'
          ? payload.type
          : current?.type,
        color: typeof payload.color === 'string' ? payload.color : current?.color,
        syncStatus: 'pending',
      };
      if (current) {
        byId.set(item.entityId, { ...current, ...patch } as T);
      }
      continue;
    }

    if (item.kind === 'category.delete') {
      byId.delete(item.entityId);
    }
  }

  return Array.from(byId.values());
}

export function mergeQueuedBudgets<T extends {
  id: string;
  name: string;
  targetDate: string;
  items: unknown[];
  totalCents?: number;
  spentCents?: number;
  remainingCents?: number;
  progress?: number;
  isActive?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  notes?: string | null;
  syncStatus?: string;
}>(list: T[]): T[] {
  const queue = readSyncQueue().filter((item) =>
    item.kind === 'budget.create' ||
    item.kind === 'budget.update' ||
    item.kind === 'budget.delete',
  );

  const byId = new Map<string, T>();
  list.forEach((item) => byId.set(item.id, item));

  for (const item of queue) {
    if (item.kind === 'budget.create') {
      byId.set(item.entityId, buildQueuedBudget(item) as T);
      continue;
    }

    if (item.kind === 'budget.update') {
      const current = byId.get(item.entityId);
      if (!current) continue;
      const payload = item.payload ?? {};
      const items = Array.isArray(payload.items) ? payload.items : current.items;
      byId.set(item.entityId, {
        ...current,
        name: typeof payload.name === 'string' ? payload.name : current.name,
        targetDate: typeof payload.targetDate === 'string' ? payload.targetDate : current.targetDate,
        notes: typeof payload.notes === 'string' ? payload.notes : current.notes,
        items,
        syncStatus: 'pending',
      } as T);
      continue;
    }

    if (item.kind === 'budget.delete') {
      byId.delete(item.entityId);
    }
  }

  return Array.from(byId.values());
}

export function mergeQueuedVehicles<T extends {
  id: string;
  name: string;
  licensePlate?: string;
  brand?: string;
  model?: string;
  year?: number;
  tank?: number;
  syncStatus?: string;
}>(list: T[]): T[] {
  const queue = readSyncQueue().filter((item) =>
    item.kind === 'vehicle.create' ||
    item.kind === 'vehicle.update' ||
    item.kind === 'vehicle.delete',
  );

  const byId = new Map<string, T>();
  list.forEach((item) => byId.set(item.id, item));

  for (const item of queue) {
    const payload = item.payload ?? {};

    if (item.kind === 'vehicle.create') {
      byId.set(item.entityId, buildQueuedVehicle(item) as T);
      continue;
    }

    if (item.kind === 'vehicle.update') {
      const current = byId.get(item.entityId);
      if (!current) continue;
      byId.set(item.entityId, {
        ...current,
        name: typeof payload.name === 'string' ? payload.name : current.name,
        licensePlate:
          typeof payload.licensePlate === 'string' ? payload.licensePlate : current.licensePlate,
        brand: typeof payload.brand === 'string' ? payload.brand : current.brand,
        model: typeof payload.model === 'string' ? payload.model : current.model,
        year: typeof payload.year === 'number' ? payload.year : current.year,
        tank: typeof payload.tank === 'number' ? payload.tank : current.tank,
        syncStatus: 'pending',
      } as T);
      continue;
    }

    if (item.kind === 'vehicle.delete') {
      byId.delete(item.entityId);
    }
  }

  return Array.from(byId.values());
}

export function applyQueuedSyncResult<T extends { id: string }>(
  list: T[],
  item: SyncQueueItem,
  result: Record<string, unknown> | null,
) {
  if (item.kind.startsWith('transaction.')) {
    if (item.kind === 'transaction.create') {
      if (!result) return list;
      return upsertById(list, { ...(result as T), syncStatus: 'synced' } as T, true);
    }
  }

  if (item.kind.startsWith('category.')) {
    if (item.kind === 'category.delete') {
      return removeById(list, item.entityId);
    }
    if (!result) return list;
    return upsertById(list, { ...(result as T), syncStatus: 'synced' } as T, item.kind === 'category.create');
  }

  if (item.kind.startsWith('budget.')) {
    if (item.kind === 'budget.delete') {
      return removeById(list, item.entityId);
    }
    if (!result) return list;
    return upsertById(list, { ...(result as T), syncStatus: 'synced' } as T, item.kind === 'budget.create');
  }

  if (item.kind.startsWith('vehicle.')) {
    if (item.kind === 'vehicle.delete') {
      return removeById(list, item.entityId);
    }
    if (!result) return list;
    return upsertById(list, { ...(result as T), syncStatus: 'synced' } as T, item.kind === 'vehicle.create');
  }

  return list;
}
