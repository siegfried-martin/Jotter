--
-- 0004: Collection sharing (Phase C). Mirrors section sharing for whole collections.
--

-- Collections the caller belongs to (their own + joined) — the home grid. Replaces the
-- old `user_id =` filter now that SELECT is public.
create or replace function public.get_my_collections()
returns setof public.collections
language sql stable security definer set search_path = public as $$
  select c.*
  from public.collections c
  join public.collection_member m on m.collection_id = c.id
  where m.user_id = auth.uid()
  order by c.sequence asc, c.created_at asc;
$$;

-- Opening a collection you're not in joins you to it (you become a contributor); its
-- whole tree is then accessible via the membership-based RLS. No-op if already a member.
-- Returns true if newly added.
create or replace function public.open_shared_collection(p_collection_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if public.is_collection_member(p_collection_id) then
    return false;
  end if;
  insert into public.collection_member (collection_id, user_id, role)
  values (p_collection_id, auth.uid(), 'editor')
  on conflict do nothing;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;
