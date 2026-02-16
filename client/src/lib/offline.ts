import { useState, useEffect, useCallback, useRef } from "react";

const AUDIT_DB_NAME = "amaanahAuditLogs";
const AUDIT_DB_VERSION = 2;
const AUDIT_STORE = "auditEvents";
const SYNC_QUEUE_STORE = "syncQueue";
const SESSION_STORE = "sessionState";

const DEVICE_ID_KEY = "amaanah_device_id";
const LAST_SYNC_KEY = "amaanah_last_sync";
const SYNC_RETRY_INTERVAL = 30000;

export type SyncStatus = "pending" | "syncing" | "synced" | "error";

export interface AuditEvent {
  id: string;
  userId: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string | null;
  data: Record<string, unknown>;
  clientTimestamp: string;
  deviceId: string;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  syncStatus: SyncStatus;
  createdAt: string;
}

export interface SyncQueueItem {
  id: string;
  queueType: string;
  payload: unknown;
  clientTimestamp: string;
  deviceId: string;
  userId: string;
  userRole: string;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  syncStatus: SyncStatus;
  retryCount: number;
  lastRetryAt: string | null;
  createdAt: string;
}

export interface SessionState {
  key: string;
  data: unknown;
  updatedAt: string;
}

function openAuditDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(AUDIT_DB_NAME, AUDIT_DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        const auditStore = db.createObjectStore(AUDIT_STORE, { keyPath: "id" });
        auditStore.createIndex("syncStatus", "syncStatus", { unique: false });
        auditStore.createIndex("action", "action", { unique: false });
        auditStore.createIndex("clientTimestamp", "clientTimestamp", { unique: false });
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
          const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: "id" });
          syncStore.createIndex("syncStatus", "syncStatus", { unique: false });
          syncStore.createIndex("queueType", "queueType", { unique: false });
          syncStore.createIndex("createdAt", "createdAt", { unique: false });
        }
        if (!db.objectStoreNames.contains(SESSION_STORE)) {
          db.createObjectStore(SESSION_STORE, { keyPath: "key" });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY);
}

function setLastSyncTime(time: string) {
  localStorage.setItem(LAST_SYNC_KEY, time);
}

export async function appendAuditEvent(event: Omit<AuditEvent, "id" | "createdAt" | "syncStatus" | "deviceId">): Promise<void> {
  const db = await openAuditDB();
  const fullEvent: AuditEvent = {
    ...event,
    id: crypto.randomUUID(),
    deviceId: getDeviceId(),
    syncStatus: "pending",
    createdAt: new Date().toISOString(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIT_STORE, "readwrite");
    tx.objectStore(AUDIT_STORE).add(fullEvent);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingAuditEvents(): Promise<AuditEvent[]> {
  const db = await openAuditDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIT_STORE, "readonly");
    const index = tx.objectStore(AUDIT_STORE).index("syncStatus");
    const request = index.getAll("pending");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function markAuditEventSynced(id: string): Promise<void> {
  const db = await openAuditDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIT_STORE, "readwrite");
    const store = tx.objectStore(AUDIT_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      if (rec) {
        rec.syncStatus = "synced";
        store.put(rec);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function addToSyncQueue(item: Omit<SyncQueueItem, "id" | "createdAt" | "syncStatus" | "retryCount" | "lastRetryAt" | "deviceId">): Promise<string> {
  const db = await openAuditDB();
  const id = crypto.randomUUID();
  const fullItem: SyncQueueItem = {
    ...item,
    id,
    deviceId: getDeviceId(),
    syncStatus: "pending",
    retryCount: 0,
    lastRetryAt: null,
    createdAt: new Date().toISOString(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, "readwrite");
    tx.objectStore(SYNC_QUEUE_STORE).add(fullItem);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingSyncItems(queueType?: string): Promise<SyncQueueItem[]> {
  const db = await openAuditDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, "readonly");
    const store = tx.objectStore(SYNC_QUEUE_STORE);
    const request = queueType
      ? store.index("queueType").getAll(queueType)
      : store.getAll();
    request.onsuccess = () => {
      const items = (request.result as SyncQueueItem[]).filter(
        (i) => i.syncStatus === "pending" || i.syncStatus === "error"
      );
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getAllSyncItems(queueType?: string): Promise<SyncQueueItem[]> {
  const db = await openAuditDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, "readonly");
    const store = tx.objectStore(SYNC_QUEUE_STORE);
    const request = queueType
      ? store.index("queueType").getAll(queueType)
      : store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function markSyncItemStatus(id: string, status: SyncStatus): Promise<void> {
  const db = await openAuditDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, "readwrite");
    const store = tx.objectStore(SYNC_QUEUE_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      if (rec) {
        rec.syncStatus = status;
        if (status === "error") {
          rec.retryCount = (rec.retryCount || 0) + 1;
          rec.lastRetryAt = new Date().toISOString();
        }
        store.put(rec);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeSyncItem(id: string): Promise<void> {
  const db = await openAuditDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, "readwrite");
    tx.objectStore(SYNC_QUEUE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveSessionState(key: string, data: unknown): Promise<void> {
  const db = await openAuditDB();
  const item: SessionState = { key, data, updatedAt: new Date().toISOString() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE, "readwrite");
    tx.objectStore(SESSION_STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadSessionState<T = unknown>(key: string): Promise<T | null> {
  const db = await openAuditDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE, "readonly");
    const request = tx.objectStore(SESSION_STORE).get(key);
    request.onsuccess = () => {
      const result = request.result as SessionState | undefined;
      resolve(result ? (result.data as T) : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearSessionState(key: string): Promise<void> {
  const db = await openAuditDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE, "readwrite");
    tx.objectStore(SESSION_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return isOnline;
}

export function useGeoLocation() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords(null),
        { enableHighAccuracy: false, timeout: 10000 }
      );
    }
  }, []);
  return coords;
}

export interface SyncCounts {
  pending: number;
  syncing: number;
  synced: number;
  error: number;
  total: number;
}

export function useSyncStatus(queueType?: string) {
  const [counts, setCounts] = useState<SyncCounts>({ pending: 0, syncing: 0, synced: 0, error: 0, total: 0 });
  const [lastSyncTime, setLastSyncTimeState] = useState<string | null>(getLastSyncTime());

  const refresh = useCallback(async () => {
    try {
      const items = await getAllSyncItems(queueType);
      const c: SyncCounts = { pending: 0, syncing: 0, synced: 0, error: 0, total: items.length };
      items.forEach((i) => {
        if (i.syncStatus in c) c[i.syncStatus as keyof Omit<SyncCounts, "total">]++;
      });
      setCounts(c);
      setLastSyncTimeState(getLastSyncTime());
    } catch {
      // DB not ready yet
    }
  }, [queueType]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { counts, lastSyncTime, refresh };
}

type SyncHandler = (item: SyncQueueItem) => Promise<boolean>;

const syncHandlers: Map<string, SyncHandler> = new Map();

export function registerSyncHandler(queueType: string, handler: SyncHandler) {
  syncHandlers.set(queueType, handler);
}

export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  const entries = Array.from(syncHandlers.entries());
  for (const [queueType, handler] of entries) {
    const items = await getPendingSyncItems(queueType);
    for (const item of items) {
      try {
        await markSyncItemStatus(item.id, "syncing");
        const success = await handler(item);
        if (success) {
          await markSyncItemStatus(item.id, "synced");
          synced++;
        } else {
          await markSyncItemStatus(item.id, "error");
          failed++;
        }
      } catch {
        await markSyncItemStatus(item.id, "error");
        failed++;
      }
    }
  }

  const pendingAudits = await getPendingAuditEvents();
  for (const event of pendingAudits) {
    try {
      const res = await fetch("/api/audit-logs/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
        credentials: "include",
      });
      if (res.ok) {
        await markAuditEventSynced(event.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  if (synced > 0) {
    setLastSyncTime(new Date().toISOString());
  }

  return { synced, failed };
}

export function useAutoSync(enabled: boolean = true) {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const doSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return { synced: 0, failed: 0 };
    setIsSyncing(true);
    try {
      const result = await processSyncQueue();
      return result;
    } finally {
      if (isMountedRef.current) setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    if (isOnline) {
      doSync();
    }
  }, [isOnline, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      if (navigator.onLine && !isSyncing) {
        doSync();
      }
    }, SYNC_RETRY_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, isSyncing, doSync]);

  return { isOnline, isSyncing, triggerSync: doSync };
}
