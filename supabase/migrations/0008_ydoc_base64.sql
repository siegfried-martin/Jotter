--
-- 0008: Store the Yjs snapshot as base64 text instead of bytea (slice 5).
--
-- The browser ↔ PostgREST path handles text far more cleanly than bytea, and the ydoc is
-- the *shared* CRDT state every client seeds from — so two clients opening the same section
-- converge on identical ops instead of independently re-seeding (which would duplicate
-- text). The column is still empty (no CRDT section has been saved yet), so a plain
-- drop/re-add is safe.
--

alter table public.note_section drop column if exists ydoc;
alter table public.note_section add column ydoc text;

comment on column public.note_section.ydoc is
  'Yjs document snapshot (base64) for CRDT-track sections. content mirrors it.';
