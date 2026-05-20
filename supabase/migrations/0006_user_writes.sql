-- Write paths for per-user state + RLS write policies.
--
-- Adds:
--   - favorites table (user_id, document_id)
--   - auth_profile_id() helper — maps current auth.uid() to profiles.id
--   - INSERT/UPDATE/DELETE policies on comments, favorites, compliance_records
--
-- Reads remain "authenticated_read = true" from 0005.

-- =====================================================================
-- favorites table
-- =====================================================================
create table if not exists favorites (
  user_id     uuid        not null references profiles (id) on delete cascade,
  document_id text        not null references documents (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, document_id)
);

alter table favorites enable row level security;

drop policy if exists "authenticated_read" on favorites;
create policy "authenticated_read" on favorites
  for select to authenticated using (true);

-- =====================================================================
-- auth_profile_id() — map auth.uid() to profiles.id
-- =====================================================================
create or replace function auth_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from profiles where auth_user_id = auth.uid() limit 1;
$$;

-- =====================================================================
-- Write policies — favorites
-- =====================================================================
drop policy if exists "favorites_insert_own" on favorites;
create policy "favorites_insert_own" on favorites for insert to authenticated
  with check (user_id = auth_profile_id());

drop policy if exists "favorites_delete_own" on favorites;
create policy "favorites_delete_own" on favorites for delete to authenticated
  using (user_id = auth_profile_id());

-- =====================================================================
-- Write policies — compliance_records (must-read acknowledgments)
-- =====================================================================
drop policy if exists "compliance_insert_own" on compliance_records;
create policy "compliance_insert_own" on compliance_records for insert to authenticated
  with check (user_id = auth_profile_id());

drop policy if exists "compliance_delete_own" on compliance_records;
create policy "compliance_delete_own" on compliance_records for delete to authenticated
  using (user_id = auth_profile_id());

-- =====================================================================
-- Write policies — comments
--   INSERT: only as oneself (author_id = current profile)
--   UPDATE: any authenticated user (so any team member can mark resolved)
--   DELETE: only author
-- =====================================================================
drop policy if exists "comments_insert_own" on comments;
create policy "comments_insert_own" on comments for insert to authenticated
  with check (author_id = auth_profile_id());

drop policy if exists "comments_update_any" on comments;
create policy "comments_update_any" on comments for update to authenticated
  using (true) with check (true);

drop policy if exists "comments_delete_own" on comments;
create policy "comments_delete_own" on comments for delete to authenticated
  using (author_id = auth_profile_id());
