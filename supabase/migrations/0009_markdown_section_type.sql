--
-- 0009: Allow the 'markdown' section type.
--
-- New section type (requested-features #3a): a real Markdown section on the CRDT/CodeMirror
-- track (source + rendered preview). The type column is guarded by a CHECK constraint, so
-- the enum has to be widened before any markdown row can be inserted. Additive and safe —
-- no existing rows are affected.
--

alter table public.note_section drop constraint if exists note_section_type_check;
alter table public.note_section add constraint note_section_type_check
  check (type = any (array['checklist'::text, 'code'::text, 'wysiwyg'::text, 'diagram'::text, 'markdown'::text]));
