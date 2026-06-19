--
-- 0003: Section sharing (Phase B). RPCs that encapsulate membership-aware reads/joins,
-- since SELECT is now public and can no longer scope "my data" on its own.
--

-- Recent feed: sections the caller can access — directly shared (section_member) or via
-- membership of the section's collection. Replaces the old `user_id =` filter.
create or replace function public.get_recent_sections(p_limit int default 30)
returns setof public.note_section
language sql stable security definer set search_path = public as $$
  select s.*
  from public.note_section s
  where
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
  order by s.updated_at desc
  limit p_limit;
$$;

-- Opening a section you can't already access adds you as a section member — it becomes
-- an unparented note for you (the spec's "link to a section → unparented for them").
-- No-op if you already have access. Returns true if you were newly added.
create or replace function public.open_shared_section(p_section_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if public.can_write_section(p_section_id) then
    return false;
  end if;
  insert into public.section_member (section_id, user_id)
  values (p_section_id, auth.uid())
  on conflict do nothing;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;
