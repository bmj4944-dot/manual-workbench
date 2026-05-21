-- INSERT/DELETE policies for documents (TOC management UI).
-- Server Action is the first gate (checks 'edit' permission via role); RLS
-- is the second line — restrict to authenticated.

drop policy if exists "documents_insert_auth" on documents;
create policy "documents_insert_auth" on documents
  for insert to authenticated
  with check (true);

drop policy if exists "documents_delete_auth" on documents;
create policy "documents_delete_auth" on documents
  for delete to authenticated
  using (true);

notify pgrst, 'reload schema';
