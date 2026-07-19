--
-- 0013: Keyword search over the caller's accessible sections ("find my lost jots").
-- Same membership scoping as get_recent_sections (0003) — SELECT on note_section is
-- public under open sharing, so search must be an RPC that filters to what the caller
-- can access (direct section_member share, or membership of the section's collection).
--
-- v1 text surface: title for ALL types, plus content for the plain-text types (code,
-- markdown) and tag-stripped content for wysiwyg (HTML). The structured types
-- (checklist, table, diagram, timeline, calendar) match on title only — their content
-- is JSON, where a raw substring match would hit keys ("color", "type") not user text.
-- Long-term shape: a materialized search_text column extracted per type at write time
-- (the copy-as-markdown extractors), collapsing this predicate to one ILIKE.

create or replace function public.search_sections(p_query text, p_limit int default 20)
returns setof public.note_section
language sql stable security definer set search_path = public as $$
  with q as (
    -- Escape LIKE wildcards so the user's text always matches literally.
    select '%' || replace(replace(replace(trim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat
  )
  select s.*
  from public.note_section s, q
  where
    trim(coalesce(p_query, '')) <> ''
    and (
      exists (
        select 1 from public.section_member sm
        where sm.section_id = s.id and sm.user_id = auth.uid()
      )
      or (
        s.note_container_id is not null and exists (
          select 1
          from public.note_container nc
          join public.collection_member m on m.collection_id = nc.collection_id
          where nc.id = s.note_container_id and m.user_id = auth.uid()
        )
      )
    )
    and (
      s.title ilike q.pat
      or (s.type in ('code', 'markdown') and s.content ilike q.pat)
      -- Strip tags, then collapse whitespace (tags/&nbsp; become spaces, so
      -- "Hello <b>world</b>" must still match the single-space query "hello world").
      or (s.type = 'wysiwyg' and regexp_replace(
            regexp_replace(replace(s.content, '&nbsp;', ' '), '<[^>]+>', ' ', 'g'),
            '\s+', ' ', 'g') ilike q.pat)
    )
  order by s.updated_at desc
  limit p_limit;
$$;
