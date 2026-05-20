-- Write policies for document content, workflow status, and version history.
--
-- Authorization model:
--   - Anyone authenticated can perform the operation at the row level
--     (RLS check passes).
--   - The Server Action is the gate that enforces *role* (editor/reviewer/
--     admin). RLS is the second line of defense; the Action is the first.
--
-- This is the simplest workable split. If we later want pure-RLS role
-- enforcement, we can add a `get_my_role()` helper and gate per status.

-- =====================================================================
-- document_content
-- =====================================================================
drop policy if exists "document_content_update_auth" on document_content;
create policy "document_content_update_auth" on document_content
  for update to authenticated
  using (true)
  with check (true);

drop policy if exists "document_content_insert_auth" on document_content;
create policy "document_content_insert_auth" on document_content
  for insert to authenticated
  with check (true);

-- =====================================================================
-- documents — workflow status updates
-- =====================================================================
drop policy if exists "documents_update_auth" on documents;
create policy "documents_update_auth" on documents
  for update to authenticated
  using (true)
  with check (true);

-- =====================================================================
-- document_versions — INSERT must record author as self
-- =====================================================================
drop policy if exists "document_versions_insert_own" on document_versions;
create policy "document_versions_insert_own" on document_versions
  for insert to authenticated
  with check (
    author_id in (
      select id from public.profiles
       where auth_user_id = (select auth.uid())
    )
  );

notify pgrst, 'reload schema';
