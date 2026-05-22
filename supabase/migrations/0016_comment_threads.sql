-- Threaded comments (C-2). Single level of reply (parent → replies). Deeper
-- nesting would explode the UI; we explicitly stop at 1 level by ignoring
-- parent_comment_id on rows that already have one (enforced in the Server
-- Action, not in the DB — DB allows arbitrary depth so we can revisit later
-- without a migration).

alter table comments
  add column if not exists parent_comment_id uuid
    references comments (id) on delete cascade;

create index if not exists comments_parent_idx
  on comments (parent_comment_id);

notify pgrst, 'reload schema';
