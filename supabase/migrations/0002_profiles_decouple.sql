-- Decouple profiles from auth.users so we can seed people (teams, demo
-- members) before any sign-up exists. A profile becomes linkable to a real
-- auth user via auth_user_id once that user signs in for the first time.

-- 1) Drop the PK->auth.users FK on id, but keep id as a uuid PK with auto-default.
alter table profiles
  alter column id set default gen_random_uuid();

alter table profiles
  drop constraint profiles_id_fkey;

-- 2) Add auth_user_id — nullable, unique, references auth.users.
alter table profiles
  add column auth_user_id uuid unique references auth.users (id) on delete set null;

-- 3) Add code — short stable identifier used by scripts/seed (e.g. 'u-kim').
alter table profiles
  add column code text unique;
