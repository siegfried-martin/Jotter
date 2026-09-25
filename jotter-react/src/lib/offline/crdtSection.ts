// CRDT document lifecycle for code/wysiwyg sections (docs/initiatives/offline-sync.md,
// slice 3). The editor binds to a Yjs document persisted to IndexedDB via y-indexeddb, so
// every keystroke is durable locally the instant it happens — closing the laptop mid-edit
// (even offline, even without hitting Save) can't lose work. On save we materialize the
// document to plain `content` and sync that through the normal (offline-aware) path.
//
// Remote ydoc sync (Postgres / a real-time provider) is slice 5; here the document is
// local-only and seeded from the section's legacy `content` the first time it's opened.
//
// Documents are owned by a refcounted registry so a section maps to exactly ONE Y.Doc even
// across React StrictMode's mount→unmount→mount — otherwise two docs could each seed from
// `content` and produce duplicated text. Destruction is deferred so that thrash doesn't
// tear the doc down between the two mounts.

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Awareness } from 'y-protocols/awareness';
import type { NoteSection } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { SupabaseYjsProvider } from './supabaseYjsProvider';
import { bytesToBase64, base64ToBytes } from './base64';
import { isOnline } from './onlineStatus';

export interface CrdtHandle {
  doc: Y.Doc;
  /** The shared plain text the code/markdown editors bind to. */
  text: Y.Text;
  /** The shared rich-text tree the wysiwyg (TipTap/ProseMirror) editor binds to. Legacy
   *  wysiwyg docs hold Quill deltas in `text`; those are deliberately abandoned — the
   *  TipTap editor re-seeds this fragment from the materialized HTML `content` instead
   *  (docs/initiatives/wysiwyg-upgrade.md, owner-approved history wipe). */
  fragment: Y.XmlFragment;
  /** Awareness (presence) — unused until the real-time provider lands, but yCollab wants it. */
  awareness: Awareness;
  /** Resolves once the local store has loaded and any first-open seed has been applied. */
  whenReady: Promise<void>;
}

interface Entry {
  handle: CrdtHandle;
  persistence: IndexeddbPersistence;
  provider: SupabaseYjsProvider;
  refs: number;
  destroyTimer: ReturnType<typeof setTimeout> | null;
}

const registry = new Map<string, Entry>();

/** Stable IndexedDB room name for a section's document. */
function roomFor(sectionId: string): string {
  return `jotter-section-${sectionId}`;
}

function createEntry(section: NoteSection, plainSeed: boolean): Entry {
  const doc = new Y.Doc();
  const text = doc.getText('content');
  const fragment = doc.getXmlFragment('richtext');
  const awareness = new Awareness(doc);
  const persistence = new IndexeddbPersistence(roomFor(section.id), doc);
  // Live multi-user sync over Supabase Realtime (slice 5). Tolerates offline (it just
  // reconnects); local durability is y-indexeddb regardless.
  const provider = new SupabaseYjsProvider(doc, awareness, section.id);

  const whenReady = new Promise<void>((resolve) => {
    persistence.once('synced', async () => {
      // The shared persistent CRDT snapshot (Postgres) is the canonical seed source —
      // applying it is idempotent, so every client converges on the same ops instead of
      // independently re-seeding from `content` (which would duplicate text). The cached
      // row can be hours old (the query cache never goes stale), so also merge the
      // server's CURRENT snapshot — edits made elsewhere (another user, the MCP connector)
      // must be in the doc before we decide whether it needs a seed.
      applySnapshot(doc, section.ydoc);
      applySnapshot(doc, await fetchServerSnapshot(section.id));
      // Legacy section (no ydoc yet): seed plain content for code so nothing's blank.
      // Wysiwyg seeds through the TipTap editor. Only when nothing else populated the doc.
      if (plainSeed && text.length === 0 && section.content) {
        text.insert(0, section.content);
      }
      resolve();
    });
  });

  return {
    handle: { doc, text, fragment, awareness, whenReady },
    persistence,
    provider,
    refs: 0,
    destroyTimer: null
  };
}

const SERVER_SNAPSHOT_TIMEOUT_MS = 3000;

function applySnapshot(doc: Y.Doc, snapshot: string | null | undefined): void {
  if (!snapshot) return;
  try {
    Y.applyUpdate(doc, base64ToBytes(snapshot));
  } catch {
    /* corrupt snapshot — ignore; the local doc stays as it is */
  }
}

/** The section's current shared snapshot from Postgres; null when offline, slow, or unset. */
async function fetchServerSnapshot(sectionId: string): Promise<string | null> {
  if (!isOnline()) return null;
  const fetch = supabase
    .from('note_section')
    .select('ydoc')
    .eq('id', sectionId)
    .maybeSingle()
    .then(({ data }) => (data?.ydoc as string | null | undefined) ?? null);
  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), SERVER_SNAPSHOT_TIMEOUT_MS)
  );
  return Promise.race([fetch, timeout]).catch(() => null);
}

/**
 * Merge the server's current snapshot into a live document. Call before persisting: the
 * save writes the WHOLE local state as the new shared snapshot, so any ops that reached the
 * server while this editor wasn't receiving them live (another user's save, an MCP write)
 * must be merged in first or the save would silently drop them.
 */
export async function mergeServerSnapshot(handle: CrdtHandle, sectionId: string): Promise<void> {
  applySnapshot(handle.doc, await fetchServerSnapshot(sectionId));
}

/** The current document state as a base64 snapshot, for persisting to note_section.ydoc. */
export function encodeDocState(handle: CrdtHandle): string {
  return bytesToBase64(Y.encodeStateAsUpdate(handle.doc));
}

/**
 * Get (or open) a section's CRDT document and register interest in it. `plainSeed` controls
 * whether the document is seeded from `content` as plain text (code) or left for the editor
 * to seed (wysiwyg). Ignored if the document already exists.
 */
export function acquireCrdtText(section: NoteSection, plainSeed: boolean): CrdtHandle {
  let entry = registry.get(section.id);
  if (entry?.destroyTimer) {
    clearTimeout(entry.destroyTimer);
    entry.destroyTimer = null;
  }
  if (!entry) {
    entry = createEntry(section, plainSeed);
    registry.set(section.id, entry);
  }
  entry.refs += 1;
  return entry.handle;
}

/** Release interest; the doc is torn down shortly after the last holder leaves. */
export function releaseCrdtText(sectionId: string): void {
  const entry = registry.get(sectionId);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs <= 0 && !entry.destroyTimer) {
    entry.destroyTimer = setTimeout(() => {
      const e = registry.get(sectionId);
      if (e && e.refs <= 0) {
        tearDown(sectionId, e);
      }
    }, 1000);
  }
}

function tearDown(sectionId: string, entry: Entry): void {
  if (entry.destroyTimer) clearTimeout(entry.destroyTimer);
  entry.provider.destroy();
  entry.handle.awareness.destroy();
  void entry.persistence.destroy();
  entry.handle.doc.destroy();
  registry.delete(sectionId);
}

/** Permanently remove a section's local CRDT store (on delete, so it can't be re-seeded). */
export async function destroyCrdtStore(sectionId: string): Promise<void> {
  const entry = registry.get(sectionId);
  if (entry) tearDown(sectionId, entry); // close the connection so the delete isn't blocked
  try {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(roomFor(sectionId));
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
  } catch {
    /* best-effort cleanup */
  }
}
