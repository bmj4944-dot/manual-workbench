-- Full-text search infrastructure (C-7). Two layers:
--   1) pg_trgm GIN indexes for substring/similarity queries on Korean text
--      (Postgres' built-in tsvector dictionaries don't tokenize Korean well;
--      trigrams give better partial-match recall without a custom tokenizer).
--   2) `search_documents(q)` RPC returns ranked matches across title + body.
--
-- The existing client-side search in search-view.tsx still works. This
-- migration adds the server-side path so we can switch over without
-- another migration.

create extension if not exists pg_trgm;

create index if not exists documents_label_trgm_idx
  on documents using gin (label gin_trgm_ops);

create index if not exists documents_label_en_trgm_idx
  on documents using gin (label_en gin_trgm_ops);

create index if not exists document_content_body_trgm_idx
  on document_content using gin (body gin_trgm_ops);

-- Combined ranked search. Returns docs whose label OR body contains q
-- (case-insensitive ILIKE), ordered by similarity to label first, then body.
-- Body strips trivial HTML tags before similarity so the score reflects
-- text content, not markup.
create or replace function public.search_documents(q text)
returns table (
  id           text,
  label        text,
  label_en     text,
  type         node_type,
  parent_id    text,
  matched_in   text,    -- 'title' | 'body'
  snippet      text,    -- ~140 chars around the first match in body
  rank         real
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  needle text := lower(trim(q));
begin
  if needle = '' then
    return;
  end if;

  return query
  with hits as (
    select
      d.id, d.label, d.label_en, d.type, d.parent_id,
      case
        when lower(d.label) like '%' || needle || '%' then 'title'
        when lower(coalesce(d.label_en, '')) like '%' || needle || '%' then 'title'
        else 'body'
      end as matched_in,
      coalesce(c.body, '') as body,
      greatest(
        similarity(lower(d.label), needle),
        similarity(lower(coalesce(d.label_en, '')), needle),
        case
          when c.body is not null then similarity(
            lower(regexp_replace(c.body, '<[^>]+>', ' ', 'g')),
            needle
          )
          else 0
        end
      ) as score
    from documents d
    left join document_content c on c.document_id = d.id
    where lower(d.label) like '%' || needle || '%'
       or lower(coalesce(d.label_en, '')) like '%' || needle || '%'
       or (c.body is not null and lower(c.body) like '%' || needle || '%')
  )
  select
    h.id, h.label, h.label_en, h.type, h.parent_id, h.matched_in,
    -- Snippet: ~60 chars on either side of the first match, stripped of HTML.
    case
      when h.matched_in = 'body' then
        substring(
          regexp_replace(h.body, '<[^>]+>', ' ', 'g')
          from greatest(
            1,
            position(needle in lower(regexp_replace(h.body, '<[^>]+>', ' ', 'g'))) - 60
          )
          for 140
        )
      else null
    end as snippet,
    h.score::real as rank
  from hits h
  order by
    case h.matched_in when 'title' then 0 else 1 end,
    h.score desc;
end $$;

revoke all on function public.search_documents(text) from public;
grant execute on function public.search_documents(text) to authenticated;

notify pgrst, 'reload schema';
