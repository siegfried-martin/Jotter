--
-- 0006: "Delete section" respects shared ownership (mirror of leave_collection, 0005).
--
-- A section's access has two sources, so deleting branches:
--   * If you're a member of the section's collection (a contributor), deleting is a
--     real delete of the shared section.
--   * If you only have it via a direct share (section_member), deleting just removes
--     your membership (dismiss). The section is GC'd only when it has no direct
--     members and isn't filed in any collection (a true orphan).
--

create or replace function public.leave_section(p_section_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_container uuid;
  v_collection uuid;
  v_is_collection_member boolean := false;
begin
  select note_container_id into v_container from public.note_section where id = p_section_id;
  if v_container is not null then
    select collection_id into v_collection from public.note_container where id = v_container;
    v_is_collection_member := exists (
      select 1 from public.collection_member
      where collection_id = v_collection and user_id = auth.uid()
    );
  end if;

  if v_is_collection_member then
    -- Contributor to the section's collection → delete the shared section.
    delete from public.note_section where id = p_section_id;
  else
    -- Shared with you directly → dismiss (remove your membership); GC a true orphan.
    delete from public.section_member
     where section_id = p_section_id and user_id = auth.uid();
    if v_container is null
       and not exists (select 1 from public.section_member where section_id = p_section_id) then
      delete from public.note_section where id = p_section_id;
    end if;
  end if;
end;
$$;
