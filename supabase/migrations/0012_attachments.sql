-- Attachments per document — drag/drop file uploads beyond the single PDF
-- slot we already have (which stays as the "primary PDF" for PDF-typed docs).
-- These are general attachments shown in the right panel.

-- =====================================================================
-- attachments table
-- =====================================================================
create table if not exists attachments (
  id           uuid        primary key default gen_random_uuid(),
  document_id  text        not null references documents (id) on delete cascade,
  file_name    text        not null,
  file_size    bigint      not null,
  mime_type    text,
  storage_path text        not null,
  uploader_id  uuid        references profiles (id),
  uploaded_at  timestamptz not null default now()
);

create index attachments_doc_idx on attachments (document_id, uploaded_at desc);

alter table attachments enable row level security;

drop policy if exists "authenticated_read" on attachments;
create policy "authenticated_read" on attachments
  for select to authenticated using (true);

drop policy if exists "attachments_insert_own" on attachments;
create policy "attachments_insert_own" on attachments for insert to authenticated
  with check (
    uploader_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "attachments_delete_own_or_admin" on attachments;
create policy "attachments_delete_own_or_admin" on attachments for delete to authenticated
  using (
    uploader_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.profiles
       where auth_user_id = (select auth.uid())
         and role in ('admin','reviewer')
    )
  );

-- =====================================================================
-- Storage bucket for attachment files
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('documents-attachments', 'documents-attachments', false)
on conflict (id) do nothing;

drop policy if exists "documents_attachments_read" on storage.objects;
create policy "documents_attachments_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents-attachments');

drop policy if exists "documents_attachments_insert" on storage.objects;
create policy "documents_attachments_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents-attachments');

drop policy if exists "documents_attachments_update" on storage.objects;
create policy "documents_attachments_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'documents-attachments')
  with check (bucket_id = 'documents-attachments');

drop policy if exists "documents_attachments_delete" on storage.objects;
create policy "documents_attachments_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents-attachments');

notify pgrst, 'reload schema';
