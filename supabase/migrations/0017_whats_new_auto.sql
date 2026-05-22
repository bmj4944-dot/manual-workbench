-- What's New auto-derive (C-6). Every new row in document_versions becomes
-- a whats_new entry, so the topbar bell + sidebar card stay current without
-- the Server Action having to remember to write twice.
--
-- Forward-only: we don't backfill existing versions into whats_new because
-- the seed already has hand-written whats_new entries we'd duplicate.

create or replace function public.emit_whats_new_from_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into whats_new (document_id, what, author_id, occurred_at)
  values (
    new.document_id,
    coalesce(
      nullif(new.description, ''),
      '버전 ' || new.version_label || ' 저장'
    ),
    new.author_id,
    new.created_at
  );
  return new;
end $$;

drop trigger if exists trg_versions_to_whats_new on document_versions;
create trigger trg_versions_to_whats_new
  after insert on document_versions
  for each row execute function public.emit_whats_new_from_version();

notify pgrst, 'reload schema';
