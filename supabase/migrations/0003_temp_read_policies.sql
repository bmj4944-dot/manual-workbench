-- TEMPORARY read-only policies until Auth + proper user-aware RLS lands in
-- 0004_rls.sql. Allows anon to SELECT public content so the app's read paths
-- work without sign-in. INSERT/UPDATE/DELETE remain blocked (no policy = deny).
--
-- Replace by deleting these policies inside 0004_rls.sql before adding the
-- real ones.

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
    execute format('create policy "temp_open_read" on %I for select using (true)', t);
  end loop;
end $$;
