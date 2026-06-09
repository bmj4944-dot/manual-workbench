-- 그룹 4 (승인 워크플로 강화) — 인앱 알림(notifications).
--
-- 워크플로 전이의 결과를 당사자에게 전달한다. 거부/승인/공개 시 문서 작성자
-- (documents.created_by) 에게 알림 한 줄을 남긴다. 알림은 service_role 만 생성
-- (한 사용자의 액션이 다른 사용자의 알림을 만들기 때문) — server action 의
-- notify() 헬퍼가 createAdminClient 로 insert. 수신자는 자신의 알림만 읽고,
-- read_at 을 직접 갱신(읽음 처리)한다.
--
-- type 예시: workflow.reject / workflow.approved / workflow.published
-- doc_id 는 클릭 시 이동할 대상 문서 (삭제되면 set null — 알림 자체는 유지).
--
-- 이 Supabase 는 "Automatically expose new tables = OFF" 라 anon/authenticated/
-- service_role GRANT 를 명시한다 (0009/0022 템플릿). insert 는 authenticated 에
-- 주지 않는다 = RLS 정책 부재와 무관하게 service_role 만 작성.

create table if not exists notifications (
  id           uuid        primary key default gen_random_uuid(),
  recipient_id uuid        not null references profiles (id) on delete cascade,
  type         text        not null,
  title        text        not null,
  body         text,
  doc_id       text        references documents (id) on delete set null,
  actor_id     uuid        references profiles (id) on delete set null,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists notifications_recipient_idx
  on notifications (recipient_id, created_at desc);
-- 미읽음 카운트(뱃지) 용 부분 인덱스
create index if not exists notifications_unread_idx
  on notifications (recipient_id) where read_at is null;

alter table notifications enable row level security;

-- 읽기: 본인에게 온 알림만. auth_profile_id() 는 SECURITY INVOKER 라
-- 호출자 세션의 auth.uid() 기준으로 profile id 를 돌려준다 (0007).
drop policy if exists "notifications_select_own" on notifications;
create policy "notifications_select_own" on notifications
  for select to authenticated
  using (recipient_id = auth_profile_id());

-- 갱신: 본인 알림만(읽음 처리 read_at). 컬럼 제한은 server action 에서 read_at
-- 만 set 하는 것으로 보장 — RLS 는 행 소유만 검사.
drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_own" on notifications
  for update to authenticated
  using (recipient_id = auth_profile_id())
  with check (recipient_id = auth_profile_id());

-- insert 정책 없음 = authenticated 거부. service_role 이 notify() 로 작성.

grant select, update on notifications to authenticated;
grant all on notifications to service_role;

notify pgrst, 'reload schema';
