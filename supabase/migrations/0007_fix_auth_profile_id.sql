-- Fix RLS denial (error 42501) on insert paths.
--
-- 0006 declared auth_profile_id() as SECURITY DEFINER. In that mode the
-- function executes as its owner; auth.uid() then frequently resolves to
-- NULL because the JWT claims are tied to the calling session, not the
-- definer. The resulting NULL makes the WITH CHECK comparison
-- (author_id = auth_profile_id()) fail, returning RLS violation.
--
-- SECURITY INVOKER runs as the calling role (authenticated), where
-- auth.uid() works as expected. We also fully qualify the table reference
-- and re-grant EXECUTE so the function is callable by both authenticated
-- and anon roles.

create or replace function auth_profile_id()
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid() limit 1;
$$;

grant execute on function auth_profile_id() to authenticated, anon;
