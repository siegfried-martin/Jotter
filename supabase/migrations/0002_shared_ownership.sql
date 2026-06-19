--
-- 0002: Shared-ownership foundation (Sharing, docs/features/requested-features.md #5).
--
-- Pivots from single-owner (auth.uid() = user_id) to membership-based access:
--   * SELECT becomes public to any authenticated user (so a shared link can open).
--   * Writes require membership (collection_member / section_member).
--   * "My data" is defined by membership; the app still filters lists by user_id in
--     this phase, and the sole-member backfill makes those equivalent until the
--     join/sharing flows land. So no app change is needed for this migration.
-- `user_id` columns now mean "created_by" (provenance). Concurrency is last-write-wins
-- for now; presence/merge is a later (Realtime) feature.
--
-- Schema-only + backfill. Applied to jotter-dev; prod runs it at the eventual cutover.
--

-- 1. Membership tables --------------------------------------------------------
create table if not exists public.collection_member (
  collection_id uuid not null references public.collections (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor',
  added_at timestamptz not null default now(),
  primary key (collection_id, user_id)
);
create index if not exists idx_collection_member_user on public.collection_member (user_id);

create table if not exists public.section_member (
  section_id uuid not null references public.note_section (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (section_id, user_id)
);
create index if not exists idx_section_member_user on public.section_member (user_id);

alter table public.collection_member enable row level security;
alter table public.section_member enable row level security;

-- 2. Membership helpers (SECURITY DEFINER: bypass RLS for the check itself) ----
create or replace function public.is_collection_member(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.collection_member m
    where m.collection_id = cid and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_write_section(sid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select
    exists (
      select 1 from public.section_member sm
      where sm.section_id = sid and sm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.note_section s
      join public.note_container nc on nc.id = s.note_container_id
      join public.collection_member m on m.collection_id = nc.collection_id
      where s.id = sid and m.user_id = auth.uid()
    );
$$;

-- 3. Backfill existing data as sole member -----------------------------------
insert into public.collection_member (collection_id, user_id)
  select id, user_id from public.collections
  on conflict do nothing;

-- Unparented sections have no collection to derive access from → direct member.
insert into public.section_member (section_id, user_id)
  select id, user_id from public.note_section
  where note_container_id is null
  on conflict do nothing;

-- 4. Auto-membership on create -----------------------------------------------
create or replace function public.add_collection_creator_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.collection_member (collection_id, user_id, role)
  values (new.id, new.user_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists collection_creator_member on public.collections;
create trigger collection_creator_member after insert on public.collections
  for each row execute function public.add_collection_creator_member();

create or replace function public.add_unparented_section_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.note_container_id is null then
    insert into public.section_member (section_id, user_id)
    values (new.id, new.user_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists section_creator_member on public.note_section;
create trigger section_creator_member after insert on public.note_section
  for each row execute function public.add_unparented_section_member();

-- 5. Drop obsolete single-owner constraints ----------------------------------
-- Per-user collection cap is meaningless once collections are shared.
drop trigger if exists enforce_collection_limit on public.collections;
-- These validated a child's user_id == its parent's owner — false under shared
-- ownership (a contributor adds sections as themselves to someone else's note).
drop trigger if exists note_container_user_validation on public.note_container;
drop trigger if exists note_section_user_validation on public.note_section;

-- 6. RLS rewrite: SELECT public (authenticated), writes via membership --------
-- collections
drop policy if exists "Users can view their own collections" on public.collections;
drop policy if exists "Users can update their own collections" on public.collections;
drop policy if exists "Users can delete their own collections" on public.collections;
create policy "Authenticated can view collections" on public.collections
  for select using (auth.uid() is not null);
create policy "Members can update collections" on public.collections
  for update using (public.is_collection_member(id));
create policy "Members can delete collections" on public.collections
  for delete using (public.is_collection_member(id));
-- INSERT policy unchanged: with check (auth.uid() = user_id).

-- note_container
drop policy if exists "Users can view their own note containers" on public.note_container;
drop policy if exists "Users can update their own note containers" on public.note_container;
drop policy if exists "Users can delete their own note containers" on public.note_container;
drop policy if exists "Users can insert their own note containers" on public.note_container;
create policy "Authenticated can view note containers" on public.note_container
  for select using (auth.uid() is not null);
create policy "Members can insert note containers" on public.note_container
  for insert with check (auth.uid() = user_id and public.is_collection_member(collection_id));
create policy "Members can update note containers" on public.note_container
  for update using (public.is_collection_member(collection_id));
create policy "Members can delete note containers" on public.note_container
  for delete using (public.is_collection_member(collection_id));

-- note_section
drop policy if exists "Users can view their own note sections" on public.note_section;
drop policy if exists "Users can update their own note sections" on public.note_section;
drop policy if exists "Users can delete their own note sections" on public.note_section;
drop policy if exists "Users can insert their own note sections" on public.note_section;
create policy "Authenticated can view note sections" on public.note_section
  for select using (auth.uid() is not null);
create policy "Members can insert note sections" on public.note_section
  for insert with check (
    auth.uid() = user_id
    and (
      note_container_id is null
      or public.is_collection_member(
        (select nc.collection_id from public.note_container nc where nc.id = note_container_id)
      )
    )
  );
create policy "Writers can update note sections" on public.note_section
  for update using (public.can_write_section(id));
create policy "Writers can delete note sections" on public.note_section
  for delete using (public.can_write_section(id));

-- 7. Membership-table RLS -----------------------------------------------------
create policy "See own + co-members" on public.collection_member
  for select using (user_id = auth.uid() or public.is_collection_member(collection_id));
create policy "Join a collection (self)" on public.collection_member
  for insert with check (user_id = auth.uid());
create policy "Leave a collection (self)" on public.collection_member
  for delete using (user_id = auth.uid());

create policy "See own section memberships" on public.section_member
  for select using (user_id = auth.uid());
create policy "Add section (self)" on public.section_member
  for insert with check (user_id = auth.uid());
create policy "Remove section (self)" on public.section_member
  for delete using (user_id = auth.uid());
