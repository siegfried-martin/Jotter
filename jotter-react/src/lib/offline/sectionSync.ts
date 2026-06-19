// Offline-aware section saves (docs/initiatives/offline-sync.md, slice 2).
//
// Wraps the LWW save path so a write that can't reach the server — offline, or a transient
// transport failure — is parked in the durable outbox instead of being lost, then replayed
// when connectivity returns. The query cache already holds the optimistic value (the
// mutation's onMutate), so to the user the save just succeeds; this guarantees it
// eventually reaches Postgres too.
//
// (Applies to all section types in this slice, which protects code/wysiwyg in the interim;
// slice 3 moves those onto Yjs and they stop using this REST path.)

import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/data/queryKeys';
import { SectionService } from '@/lib/services/sectionService';
import type { CreateNoteSection, NoteSection } from '@/lib/types';
import { isOnline, subscribeOnline } from './onlineStatus';
import { enqueue, list, remove, drain, count } from './outbox';

type SectionUpdates = Partial<CreateNoteSection> & { sequence?: number };

/**
 * A transport failure (offline, DNS, timeout) is retryable; a PostgREST rejection (RLS,
 * validation) is not — those carry a `.code`, so we surface them instead of queuing a
 * write that will never succeed.
 */
function isNetworkError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const err = e as { code?: string; message?: string; name?: string };
  if (err.code) return false;
  const msg = `${err.name ?? ''} ${err.message ?? ''}`.toLowerCase();
  return (
    err.name === 'TypeError' || /fetch|network|timeout|failed to|load failed|offline/.test(msg)
  );
}

/**
 * Save a section update, queuing it when offline / on transport failure. Returns the
 * canonical server row, or `null` when the write was parked (the caller keeps its
 * optimistic state).
 */
export async function saveUpdate(id: string, updates: SectionUpdates): Promise<NoteSection | null> {
  if (!isOnline()) {
    await enqueueUpdate(id, updates);
    return null;
  }
  try {
    return await SectionService.updateSection(id, updates);
  } catch (e) {
    if (isNetworkError(e)) {
      await enqueueUpdate(id, updates);
      return null;
    }
    throw e;
  }
}

/** Park an update, coalescing to the latest per section (LWW: each save is self-contained). */
async function enqueueUpdate(sectionId: string, updates: SectionUpdates): Promise<void> {
  const pending = await list();
  for (const e of pending) {
    if (e.kind === 'update' && e.sectionId === sectionId && e.seq !== undefined) {
      await remove(e.seq);
    }
  }
  await enqueue({ kind: 'update', sectionId, payload: updates });
  await refreshPending();
}

let flushing = false;

/**
 * Replay queued writes FIFO. Re-queues on a fresh transport failure (stops the drain,
 * keeps order); drops an entry the server permanently rejects so it can't poison the queue.
 */
export async function flushOutbox(): Promise<void> {
  if (flushing || !isOnline()) return;
  flushing = true;
  try {
    await drain(async (entry) => {
      try {
        if (entry.kind === 'update') {
          const updated = await SectionService.updateSection(
            entry.sectionId,
            entry.payload as SectionUpdates
          );
          reconcileSection(updated);
        }
      } catch (e) {
        if (isNetworkError(e)) throw e; // stop drain; retry on next reconnect
        console.error('Dropping un-syncable outbox entry (server rejected):', entry, e);
        // resolve → drain removes the poison entry
      }
    });
  } catch {
    // transport dropped mid-drain; remaining entries stay queued
  } finally {
    flushing = false;
    await refreshPending();
  }
}

/** Reconcile the caches with the server's canonical row after a replay. */
function reconcileSection(s: NoteSection): void {
  queryClient.setQueryData<NoteSection[]>(queryKeys.sections(s.note_container_id ?? ''), (old) =>
    old?.map((x) => (x.id === s.id ? s : x))
  );
  queryClient.setQueryData(queryKeys.section(s.id), s);
  queryClient.setQueryData<NoteSection[]>(queryKeys.recentSections(), (old) =>
    old?.map((x) => (x.id === s.id ? s : x))
  );
}

// --- Pending-count store (drives the offline/sync indicator) ------------------
let pendingCount = 0;
const pendingListeners = new Set<() => void>();

async function refreshPending(): Promise<void> {
  pendingCount = await count();
  for (const l of pendingListeners) l();
}

export function getPendingCount(): number {
  return pendingCount;
}

export function subscribePending(cb: () => void): () => void {
  pendingListeners.add(cb);
  return () => pendingListeners.delete(cb);
}

let initialized = false;

/** Start auto-sync: flush on load and whenever connectivity returns. Idempotent. */
export function initOfflineSync(): void {
  if (initialized) return;
  initialized = true;
  void refreshPending();
  void flushOutbox();
  subscribeOnline((online) => {
    if (online) void flushOutbox();
  });
}
