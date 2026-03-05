const DB_NAME = 'amaanah-offline';
const DB_VERSION = 2;
const QUEUE_STORE = 'mutationQueue';

export interface QueuedMutation {
  id?: number;
  method: string;
  url: string;
  body: unknown;
  headers: Record<string, string>;
  timestamp: number;
  label?: string;
  retryCount: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess = e => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueOfflineMutation(
  method: string,
  url: string,
  body: unknown,
  label?: string
): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const item: Omit<QueuedMutation, 'id'> = {
      method,
      url,
      body,
      headers: { 'Content-Type': 'application/json' },
      timestamp: Date.now(),
      label,
      retryCount: 0,
    };
    const req = store.add(item);
    req.onsuccess = () => {
      const id = req.result as number;
      window.dispatchEvent(new CustomEvent('amaanah:offline-queued', { detail: { label, id } }));
      resolve(id);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const store = tx.objectStore(QUEUE_STORE);
    const index = store.index('timestamp');
    const req = index.getAll();
    req.onsuccess = () => resolve(req.result as QueuedMutation[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getQueueCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueuedMutation(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function incrementRetryCount(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result as QueuedMutation;
      if (item) {
        item.retryCount = (item.retryCount || 0) + 1;
        const putReq = store.put(item);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function clearQueue(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function processMutationQueue(
  onProgress?: (synced: number, failed: number, total: number) => void
): Promise<{ synced: number; failed: number }> {
  const queue = await getQueuedMutations();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const mutation of queue) {
    try {
      const res = await fetch(mutation.url, {
        method: mutation.method,
        headers: mutation.headers,
        body: mutation.body ? JSON.stringify(mutation.body) : undefined,
        credentials: 'include',
      });

      if (res.ok) {
        await removeQueuedMutation(mutation.id!);
        synced++;
      } else if (res.status === 401) {
        failed++;
        await incrementRetryCount(mutation.id!);
      } else if (res.status >= 400 && res.status < 500) {
        await removeQueuedMutation(mutation.id!);
        failed++;
      } else {
        await incrementRetryCount(mutation.id!);
        failed++;
      }
    } catch {
      await incrementRetryCount(mutation.id!);
      failed++;
    }
    onProgress?.(synced, failed, queue.length);
  }

  return { synced, failed };
}
