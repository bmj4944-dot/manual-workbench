-- Auth wire-up:
--   1) When a new auth.users row is inserted, automatically create a matching
--      profile row linked via auth_user_id.
--   2) Replace the temporary anon-read policies with proper authenticated-only
--      read policies.
--
-- Write policies remain absent (no policy = deny). Those come in the next
-- migration alongside Server Actions for comments / favorites / etc.

-- =====================================================================
-- 1) handle_new_user trigger
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

  insert into profiles (auth_user_id, name, initials, color, role)
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
-- 2) Swap temp_open_read → authenticated_read across all read-public tables
-- =====================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'documents', 'document_content', 'document_versions',
    'comments', 'page_stats', 'verifications', 'whats_new',
    'must_read_documents', 'compliance_records',
    'cases', 'case_transcript_lines', 'case_lessons',
    'onboarding_tasks', 'onboarding_questions', 'onboarding_progress'
  ] loop
    execute format('drop policy if exists "temp_open_read" on %I', t);
    execute format('drop policy if exists "authenticated_read" on %I', t);
    execute format(
      'create policy "authenticated_read" on %I for select to authenticated using (true)',
      t
    );
  end loop;
end $$;
