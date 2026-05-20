-- Supabase Storage setup for PDF attachments.
--
-- Bucket layout:
--   documents-pdf/<document_id>.pdf
--
-- Bucket is private (public = false). Reads go through our authenticated
-- route handler / signed URLs. Writes are gated by RLS to authenticated
-- users; the Server Action additionally enforces the 'edit' role.

-- =====================================================================
-- Create the bucket (idempotent)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('documents-pdf', 'documents-pdf', false)
on conflict (id) do nothing;

-- =====================================================================
-- RLS policies on storage.objects scoped to this bucket
-- =====================================================================
drop policy if exists "documents_pdf_read" on storage.objects;
create policy "documents_pdf_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents-pdf');

drop policy if exists "documents_pdf_insert" on storage.objects;
create policy "documents_pdf_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents-pdf');

drop policy if exists "documents_pdf_update" on storage.objects;
create policy "documents_pdf_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'documents-pdf')
  with check (bucket_id = 'documents-pdf');

drop policy if exists "documents_pdf_delete" on storage.objects;
create policy "documents_pdf_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents-pdf');

notify pgrst, 'reload schema';
