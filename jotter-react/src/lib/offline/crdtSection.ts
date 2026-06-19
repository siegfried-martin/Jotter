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

export interface CrdtHandle {
  doc: Y.Doc;
  /** The shared text the editor binds to. */
  text: Y.Text;
  /** Awareness (presence) — unused until the real-time provider lands, but yCollab wants it. */
  awareness: Awareness;
  /** Resolves once the local store has loaded and any first-open seed has been applied. */
  whenReady: Promise<void>;
}

interface Entry {
  handle: CrdtHandle;
  persistence: IndexeddbPersistence;
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
  const awareness = new Awareness(doc);
  const persistence = new IndexeddbPersistence(roomFor(section.id), doc);

  const whenReady = new Promise<void>((resolve) => {
    persistence.once('synced', () => {
      // First-ever open of a section that predates CRDT: seed the document from its plain
      // content so nothing appears blank. Only for plain-text (code) — rich-text (wysiwyg)
      // can't be inserted as a string, so its editor seeds through Quill instead.
      if (plainSeed && text.length === 0 && section.content) {
        text.insert(0, section.content);
      }
      resolve();
    });
  });

  return { handle: { doc, text, awareness, whenReady }, persistence, refs: 0, destroyTimer: null };
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
