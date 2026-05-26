-- 문서별 👍/👎 피드백. 한 사용자는 문서당 한 표만 가지며 최신 의견으로 덮어쓴다
-- (UNIQUE (document_id, user_id) + UPSERT on conflict). 본문은 RightPanel
-- FeedbackBar 에서 전송된다.

create table if not exists document_feedback (
  id          uuid        primary key default gen_random_uuid(),
  document_id text        not null references documents (id) on delete cascade,
  user_id     uuid        not null references profiles (id) on delete cascade,
  vote        text        not null check (vote in ('up','down')),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (document_id, user_id)
);

create index if not exists document_feedback_doc_idx
  on document_feedback (document_id, created_at desc);

-- updated_at 자동 갱신 (0001 의 set_updated_at + 0004 의 smart 동작 재사용)
drop trigger if exists trg_document_feedback_updated_at on document_feedback;
create trigger trg_document_feedback_updated_at
before update on document_feedback
for each row execute function set_updated_at();

alter table document_feedback enable row level security;

-- 읽기: 인증된 사용자 누구나 (집계/대시보드 용도). 운영에서 작성자 정보가
-- 민감하다면 추후 본인 또는 admin/reviewer 한정으로 좁힐 것.
drop policy if exists "document_feedback_read" on document_feedback;
create policy "document_feedback_read" on document_feedback
  for select to authenticated using (true);

drop policy if exists "document_feedback_insert_own" on document_feedback;
create policy "document_feedback_insert_own" on document_feedback
  for insert to authenticated
  with check (
    user_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "document_feedback_update_own" on document_feedback;
create policy "document_feedback_update_own" on document_feedback
  for update to authenticated
  using (
    user_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  )
  with check (
    user_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "document_feedback_delete_own" on document_feedback;
create policy "document_feedback_delete_own" on document_feedback
  for delete to authenticated
  using (
    user_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );

notify pgrst, 'reload schema';
