-- Root cause of all the silent fallback-to-mocks and 42501 errors:
--   When the project was created with "Automatically expose new tables = OFF"
--   (the safer default), SQL-created tables did NOT get the standard GRANTs
--   to the API roles (authenticated, anon). PostgREST then returns
--   "permission denied for table X" before RLS even runs, which our layout
--   try/catch was swallowing into mock data.
--
-- This migration:
--   1. Grants table & sequence permissions to anon (read) and authenticated
--      (read + write). RLS still gates which rows.
--   2. Sets default privileges so future tables get the same treatment.
--   3. Backfills profile rows for any auth.users that signed up before the
--      handle_new_user trigger existed.
--   4. Re-applies the handle_new_user trigger idempotently.
--   5. Pokes PostgREST to reload its schema cache.

-- =====================================================================
-- 1) Permissions
-- =====================================================================
grant usage on schema public to anon, authenticated;

grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

alter default privileges in schema public
  grant select on tables to anon, authenticated;
alter default privileges in schema public
  grant insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;

-- =====================================================================
-- 2) Re-ensure handle_new_user trigger is current (idempotent)
-- =====================================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
  initial_char text;
  random_hue   numeric;
begin
  display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    '신규 사용자'
  );
  initial_char := upper(substring(display_name from 1 for 1));
  random_hue   := floor(random() * 360);

  insert into public.profiles (auth_user_id, name, initials, color, role)
  values (
    new.id,
    display_name,
    initial_char,
    'oklch(0.55 0.14 ' || random_hue::text || ')',
    'editor'
  )
  on conflict (auth_user_id) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
-- 3) Backfill profiles for existing auth.users without one
-- =====================================================================
insert into public.profiles (auth_user_id, name, initials, color, role)
select
  u.id,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1),
    '신규 사용자'
  ) as name,
  upper(substring(
    coalesce(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      split_part(u.email, '@', 1),
      '?'
    ) from 1 for 1
  )) as initials,
  'oklch(0.55 0.14 ' || floor(random() * 360)::text || ')' as color,
  'editor'::member_role as role
from auth.users u
where not exists (
  select 1 from public.profiles p where p.auth_user_id = u.id
);

-- =====================================================================
-- 4) Reload PostgREST schema cache
-- =====================================================================
notify pgrst, 'reload schema';
