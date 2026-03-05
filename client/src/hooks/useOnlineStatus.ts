import { useState, useEffect, useCallback, useRef } from 'react';
import { processMutationQueue, getQueueCount } from '@/lib/offlineQueue';
import { queryClient } from '@/lib/queryClient';

export interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;
}

let syncListeners: Array<(state: SyncState) => void> = [];
let globalState: SyncState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingCount: 0,
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,
};

function notifyListeners(patch: Partial<SyncState>) {
  globalState = { ...globalState, ...patch };
  syncListeners.forEach(fn => fn(globalState));
}

async function refreshPendingCount() {
  const count = await getQueueCount();
  notifyListeners({ pendingCount: count });
}

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

async function triggerSync() {
  if (globalState.isSyncing) return;
  if (!navigator.onLine) return;

  const count = await getQueueCount();
  if (count === 0) {
    await refreshPendingCount();
    return;
  }

  notifyListeners({ isSyncing: true, syncError: null });

  const { synced, failed } = await processMutationQueue();

  await refreshPendingCount();
  notifyListeners({
    isSyncing: false,
    lastSyncedAt: synced > 0 ? new Date() : globalState.lastSyncedAt,
    syncError: failed > 0 && synced === 0 ? `${failed} item(s) failed to sync` : null,
  });

  if (synced > 0) {
    queryClient.invalidateQueries();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    notifyListeners({ isOnline: true });
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => triggerSync(), 1500);
  });

  window.addEventListener('offline', () => {
    notifyListeners({ isOnline: false });
  });

  window.addEventListener('amaanah:offline-queued', () => {
    refreshPendingCount();
  });

  refreshPendingCount();
}

export function useOnlineStatus(): SyncState & { triggerManualSync: () => Promise<void> } {
  const [state, setState] = useState<SyncState>(globalState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const listener = (s: SyncState) => setState({ ...s });
    syncListeners.push(listener);
    setState(globalState);

    const interval = setInterval(refreshPendingCount, 30000);

    return () => {
      syncListeners = syncListeners.filter(l => l !== listener);
      clearInterval(interval);
    };
  }, []);

  const triggerManualSync = useCallback(async () => {
    await triggerSync();
  }, []);

  return { ...state, triggerManualSync };
}

export { refreshPendingCount, triggerSync };
