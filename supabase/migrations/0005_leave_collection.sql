--
-- 0005: "Delete collection" becomes "leave collection" under shared ownership.
--
-- A member removing a shared collection should only remove themselves; the collection
-- (and its tree) is deleted only when the last member leaves. Previously the delete
-- RLS policy was `is_collection_member`, so any contributor hard-deleted it for everyone.
--

create or replace function public.leave_collection(p_collection_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.collection_member
   where collection_id = p_collection_id and user_id = auth.uid();

  -- Garbage-collect when nobody is left (cascade removes containers/sections/members).
  if not exists (
    select 1 from public.collection_member where collection_id = p_collection_id
  ) then
    delete from public.collections where id = p_collection_id;
  end if;
end;
$$;
