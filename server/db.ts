import { neonConfig, neon } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// ---------------------------------------------------------------------------
// Query serializer — limits Neon HTTP API to 2 in-flight requests at a time.
//
// Root cause of "Too many database connection attempts are currently ongoing":
// Neon (even in HTTP/stateless mode) acquires a DB-level permit for EVERY
// query.  When many simultaneous requests each trigger a query, they all try
// to acquire a permit concurrently → throttle error.
//
// Fix: funnel ALL neon HTTP calls through a semaphore so at most 2 requests
// are in-flight to Neon simultaneously.  Excess callers queue inside the
// semaphore and execute sequentially.  The first call after a cold-start may
// take ~10 s while Neon wakes the compute; subsequent calls are fast (<1 s).
// ---------------------------------------------------------------------------
class Semaphore {
  private available: number;
  private queue: Array<() => void> = [];

  constructor(limit: number) {
    this.available = limit;
  }

  acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.available > 0) {
        this.available--;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.available++;
    }
  }
}

const neonSemaphore = new Semaphore(2);

neonConfig.fetchFunction = (async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  await neonSemaphore.acquire();
  try {
    return await fetch(input, init);
  } finally {
    neonSemaphore.release();
  }
}) as typeof fetch;

// ---------------------------------------------------------------------------
// HTTP-based SQL client — stateless HTTPS fetch per query.
// No persistent WebSocket connections → no zombie connections on restart,
// no permit exhaustion from stale connection retry loops.
// ---------------------------------------------------------------------------
const neonSql = neon(process.env.DATABASE_URL);

// Main drizzle instance (all storage.ts ORM queries go through here).
export const db = drizzleHttp({ client: neonSql, schema });

// rawQuery — drop-in for the former pool.query() call-sites in routes.ts.
export async function rawQuery(text: string, params?: any[]): Promise<{ rows: any[] }> {
  const rows = await neonSql(text, params ?? []) as any[];
  return { rows };
}

// ---------------------------------------------------------------------------
// Fake pg-compatible "pool" for connect-pg-simple session store.
//
// connect-pg-simple calls pool.query(text, values?, callback) using Node.js
// callback style.  We route those calls through rawQuery (neon HTTP) so there
// are ZERO WebSocket connections in the entire application — eliminating the
// WebSocket permit-retry loops that saturate Neon's connection slots.
// ---------------------------------------------------------------------------
export const pool = {
  query(
    text: string,
    valuesOrCallback?: any[] | ((err: Error | null, result?: { rows: any[] }) => void),
    callback?: (err: Error | null, result?: { rows: any[] }) => void,
  ): void | Promise<{ rows: any[] }> {
    let values: any[] = [];
    let cb: ((err: Error | null, result?: { rows: any[] }) => void) | undefined;

    if (typeof valuesOrCallback === "function") {
      cb = valuesOrCallback;
    } else if (Array.isArray(valuesOrCallback)) {
      values = valuesOrCallback;
      cb = callback;
    }

    const p = rawQuery(text, values);

    if (cb) {
      p.then((result) => cb!(null, result)).catch((err) => cb!(err));
      // No return value in callback style
    } else {
      return p;
    }
  },
  // connect-pg-simple also calls pool.connect() when it needs a transaction.
  // We stub it out — session operations don't require transactions.
  connect(callback?: (err: Error | null, client?: any, done?: () => void) => void) {
    const err = new Error("pool.connect() is not supported in HTTP mode");
    if (callback) {
      callback(err);
    } else {
      return Promise.reject(err);
    }
  },
} as any;
