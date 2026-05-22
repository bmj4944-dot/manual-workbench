-- Live page-stats tracking. Any authenticated user can increment the
-- view/copy/search counter for a document — these are usage metrics, not
-- privileged writes, so we expose them via a SECURITY DEFINER RPC instead
-- of granting blanket UPDATE on page_stats.
--
-- Why RPC, not direct UPDATE:
--   - atomic +1 in a single statement (no read-modify-write race)
--   - UPSERT handles the "no row yet" case in one shot
--   - RLS on page_stats stays restrictive (no UPDATE/INSERT policy needed)

create or replace function public.record_page_stat(
  p_doc_id text,
  p_kind   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inc int := case when p_kind = 'view'   then 1 else 0 end;
  c_inc int := case when p_kind = 'copy'   then 1 else 0 end;
  s_inc int := case when p_kind = 'search' then 1 else 0 end;
begin
  -- Defensive: reject unknown kinds so a typo can't silently no-op.
  if v_inc + c_inc + s_inc = 0 then
    raise exception 'record_page_stat: unknown kind %', p_kind;
  end if;

  insert into page_stats (document_id, views, copies, searches)
  values (p_doc_id, v_inc, c_inc, s_inc)
  on conflict (document_id) do update set
    views    = page_stats.views    + v_inc,
    copies   = page_stats.copies   + c_inc,
    searches = page_stats.searches + s_inc;
end $$;

revoke all on function public.record_page_stat(text, text) from public;
grant execute on function public.record_page_stat(text, text) to authenticated;

notify pgrst, 'reload schema';
