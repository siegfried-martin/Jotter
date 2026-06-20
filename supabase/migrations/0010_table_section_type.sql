--
-- 0010: Allow the 'table' section type.
--
-- New section type (requested-features #4): a real spreadsheet section backed by Univer.
-- Like 'diagram', the editor owns an opaque JSON blob (the workbook snapshot) stored in
-- `content` and synced on the LWW track — no Yjs. The type column is guarded by a CHECK
-- constraint, so the enum has to be widened before any table row can be inserted. Additive
-- and safe — no existing rows are affected.
--

alter table public.note_section drop constraint if exists note_section_type_check;
alter table public.note_section add constraint note_section_type_check
  check (type = any (array['checklist'::text, 'code'::text, 'wysiwyg'::text, 'diagram'::text, 'markdown'::text, 'table'::text]));
