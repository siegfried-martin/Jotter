// Durable mutation outbox (docs/initiatives/offline-sync.md, slice 1).
//
// The LWW track's offline safety net: when a checklist/diagram/title/meta write can't
// reach the server (offline, or it failed), it's parked here in IndexedDB and replayed on
// reconnect — so closing the laptop mid-edit can never lose the change. Survives reloads
// and crashes (IndexedDB, not memory).
//
// Foundation slice provides the primitive only (enqueue / list / remove / drain); slice 2
// wires it into the section mutations. Entries are processed strictly FIFO so a section's
// edits apply in order; drain stops at the first failure and leaves the rest queued for
// the next attempt.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

const DB_NAME = 'jotter-offline';
const DB_VERSION = 1;
const STORE = 'outbox';

/** A parked section mutation awaiting sync. `payload` is operation-specific (slice 2). */
export interface OutboxEntry {
  /** Monotonic queue key (assigned by the store). */
  seq?: number;
  /** Operation kind — e.g. 'update' | 'delete' (semantics defined when wired in slice 2). */
  kind: string;
  /** The section this mutation targets. */
  sectionId: string;
  /** Operation arguments (must be structured-cloneable). */
  payload: unknown;
  /** `updated_at` the client last saw — for compare-and-swap conflict detection (slice 4). */
  baseUpdatedAt?: string;
  /** When it was queued (ms epoch), for ordering/debugging. */
  enqueuedAt: number;
}

interface OutboxDB extends DBSchema {
  [STORE]: {
    key: number;
    value: OutboxEntry;
  };
}

let dbPromise: Promise<IDBPDatabase<OutboxDB>> | null = null;

function db(): Promise<IDBPDatabase<OutboxDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OutboxDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          // autoIncrement gives us a monotonic FIFO key without tracking it ourselves.
          database.createObjectStore(STORE, { keyPath: 'seq', autoIncrement: true });
        }
      }
    });
  }
  return dbPromise;
}

/** Park a mutation. Returns the assigned queue key. */
export async function enqueue(entry: Omit<OutboxEntry, 'seq' | 'enqueuedAt'>): Promise<number> {
  const record: OutboxEntry = { ...entry, enqueuedAt: now() };
  return (await db()).add(STORE, record) as Promise<number>;
}

/** All queued entries in FIFO order. */
export async function list(): Promise<OutboxEntry[]> {
  return (await db()).getAll(STORE);
}

/** Number of parked mutations. */
export async function count(): Promise<number> {
  return (await db()).count(STORE);
}

/** Remove a processed entry by its queue key. */
export async function remove(seq: number): Promise<void> {
  return (await db()).delete(STORE, seq);
}

/** Drop everything (test cleanup / sign-out). */
export async function clear(): Promise<void> {
  return (await db()).clear(STORE);
}

/**
 * Process queued mutations FIFO via `handler`. Each successfully-handled entry is removed;
 * the first handler rejection stops the drain and leaves that entry (and the rest) queued
 * for a later attempt, preserving per-section order. Returns how many were flushed.
 */
export async function drain(handler: (entry: OutboxEntry) => Promise<void>): Promise<number> {
  const entries = await list();
  let flushed = 0;
  for (const entry of entries) {
    await handler(entry);
    if (entry.seq !== undefined) await remove(entry.seq);
    flushed += 1;
  }
  return flushed;
}

function now(): number {
  // Date.now is fine in app/browser context; only the workflow sandbox forbids it.
  return Date.now();
}

/** Test-only: reset the cached connection so a fresh fake-indexeddb is picked up. */
export function __resetForTests(): void {
  dbPromise = null;
}
