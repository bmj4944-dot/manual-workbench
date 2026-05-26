-- 감사 로그(audit_logs).
--
-- 모든 server action 의 핵심 분기점에서 logAction(...) helper 를 호출해 누가
-- 언제 무엇을 했는지 영구 기록한다. 실패한 시도도 ok=false 로 기록.
--
-- target_type 예시: document, comment, profile, attachment, feedback, version
-- action 예시: document.create / document.delete / workflow.transition /
--              workflow.reject / user.role_change / user.invite / user.disable /
--              user.force_signout / tag.add / tag.remove / feedback.submit /
--              comment.add / comment.resolve
--
-- metadata 는 jsonb — 각 action 별로 자유 양식 (옛/새 값, 사유 등).

create table if not exists audit_logs (
  id           uuid        primary key default gen_random_uuid(),
  actor_id     uuid        references profiles (id),
  action       text        not null,
  target_type  text,
  target_id    text,
  metadata     jsonb       not null default '{}'::jsonb,
  ok           boolean     not null default true,
  ip           inet,
  ua           text,
  created_at   timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx on audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_action_idx on audit_logs (action, created_at desc);
create index if not exists audit_logs_target_idx on audit_logs (target_type, target_id);

alter table audit_logs enable row level security;

-- 읽기는 admin / reviewer 만 (감사 책임자급). 일반 사용자는 자신 로그도 못 봄
-- (필요해지면 별도 정책 추가).
drop policy if exists "audit_logs_read_admin_reviewer" on audit_logs;
create policy "audit_logs_read_admin_reviewer" on audit_logs
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where auth_user_id = (select auth.uid())
        and role in ('admin','reviewer')
        and is_active = true
    )
  );

-- 쓰기는 server-only (service_role 만). 우리 server action 들이 createAdminClient
-- 로 audit_logs 에 직접 insert.
-- authenticated 의 INSERT 정책 없음 = 거부.

notify pgrst, 'reload schema';
