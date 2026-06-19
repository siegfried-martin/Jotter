--
-- 0007: Offline/sync foundation (docs/initiatives/offline-sync.md, slice 1).
--
-- Additive substrate for the CRDT track. A code/wysiwyg section's source of truth becomes
-- a Yjs document; we store its latest snapshot here. `content` stays as a derived mirror
-- (materialized from the ydoc on flush) so search, the recent feed, previews, RLS, and
-- every non-Yjs reader keep working untouched.
--
-- Nullable + no backfill: existing sections have no ydoc; the first time one is opened in
-- a Yjs editor the ydoc is seeded from its current `content`. Nothing reads this column
-- until slice 3, so this migration is behavior-neutral.
--

alter table public.note_section
  add column if not exists ydoc bytea;

comment on column public.note_section.ydoc is
  'Yjs document snapshot for CRDT-track sections (code/wysiwyg). content mirrors it.';
