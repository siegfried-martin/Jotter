--
-- 0011: Allow the 'timeline' section type.
--
-- New section type (requested-features #1, Calendar initiative — see
-- docs/initiatives/calendar-timeline-section.md). A resource-swimlane roadmap/timeline
-- backed by vis-timeline. Unlike diagram/table, the library only RENDERS — we own the data:
-- `content` holds our own JSON (a `TimelineDoc` of groups + items), not a library-opaque
-- blob. Synced on the LWW track — no Yjs. The type column is guarded by a CHECK constraint,
-- so the enum has to be widened before any timeline row can be inserted. Additive and safe —
-- no existing rows are affected.
--

alter table public.note_section drop constraint if exists note_section_type_check;
alter table public.note_section add constraint note_section_type_check
  check (type = any (array['checklist'::text, 'code'::text, 'wysiwyg'::text, 'diagram'::text, 'markdown'::text, 'table'::text, 'timeline'::text]));
