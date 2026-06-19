// The two-track offline model (docs/initiatives/offline-sync.md).
//
// A section's editor type decides how it persists offline and how concurrent edits
// reconcile:
//   * CRDT track (code, wysiwyg) — Yjs document, automatic merge, real-time collab later.
//   * LWW  track (checklist, diagram) — mutation outbox + last-write-wins + compare-and-
//     swap conflict detection.
//
// This classifier is the single source of that boundary; every offline code path routes
// through it so the split stays consistent. Future text-like editors (e.g. markdown) join
// the CRDT track by adding their type here.

import type { NoteSection } from '@/lib/types';

type SectionType = NoteSection['type'];

const CRDT_TYPES = new Set<SectionType>(['code', 'wysiwyg']);

export type SectionTrack = 'crdt' | 'lww';

/** Which offline track a section type belongs to. */
export function trackForType(type: SectionType): SectionTrack {
  return CRDT_TYPES.has(type) ? 'crdt' : 'lww';
}

/** True for types whose source of truth is a Yjs document (auto-merging). */
export function isCrdtType(type: SectionType): boolean {
  return CRDT_TYPES.has(type);
}

/** True for types that persist via the outbox and reconcile last-write-wins. */
export function isLwwType(type: SectionType): boolean {
  return !CRDT_TYPES.has(type);
}
