-- Replace auth_profile_id() function calls inside RLS policies with an
-- inline subselect against profiles. The (select auth.uid()) wrapper is
-- Supabase's recommended pattern: it avoids per-row evaluation and any
-- SECURITY DEFINER/INVOKER quirks the function form was susceptible to.
--
-- After this, the function is no longer required for write paths. We keep
-- it (and the EXECUTE grant) in case something else relies on it later.

-- =====================================================================
-- comments
-- =====================================================================
drop policy if exists "comments_insert_own" on comments;
create policy "comments_insert_own" on comments
  for insert to authenticated
  with check (
    author_id in (
      select id from public.profiles
       where auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "comments_delete_own" on comments;
create policy "comments_delete_own" on comments
  for delete to authenticated
  using (
    author_id in (
      select id from public.profiles
       where auth_user_id = (select auth.uid())
    )
  );

-- comments_update_any (any authenticated user can mark resolved) stays as-is

-- =====================================================================
-- favorites
-- =====================================================================
drop policy if exists "favorites_insert_own" on favorites;
create policy "favorites_insert_own" on favorites
  for insert to authenticated
  with check (
    user_id in (
      select id from public.profiles
       where auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "favorites_delete_own" on favorites;
create policy "favorites_delete_own" on favorites
  for delete to authenticated
  using (
    user_id in (
      select id from public.profiles
       where auth_user_id = (select auth.uid())
    )
  );

-- =====================================================================
-- compliance_records
-- =====================================================================
drop policy if exists "compliance_insert_own" on compliance_records;
create policy "compliance_insert_own" on compliance_records
  for insert to authenticated
  with check (
    user_id in (
      select id from public.profiles
       where auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "compliance_delete_own" on compliance_records;
create policy "compliance_delete_own" on compliance_records
  for delete to authenticated
  using (
    user_id in (
      select id from public.profiles
       where auth_user_id = (select auth.uid())
    )
  );

-- =====================================================================
-- Diagnostic helper. After applying this migration, from the browser
-- console of a logged-in session:
--   const c = (await import('/lib/supabase/client')).createClient();
--   console.log(await c.rpc('debug_auth_info'));
--
-- Expected:
--   { data: { caller_uid: <uuid>, caller_role: 'authenticated', my_profile_id: <uuid> } }
-- =====================================================================
create or replace function debug_auth_info()
returns table (caller_uid uuid, caller_role text, my_profile_id uuid)
language sql
stable
security invoker
set search_path = public
as $$
  select
    auth.uid()      as caller_uid,
    current_user::text as caller_role,
    (select id from public.profiles where auth_user_id = auth.uid()) as my_profile_id;
$$;

grant execute on function debug_auth_info() to authenticated, anon;
