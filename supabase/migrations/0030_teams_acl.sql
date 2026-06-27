-- 0030_teams_acl.sql
-- A. 권한·조직 정교화 — 팀/부서(다대다) + 문서별 가시성(ACL)
--
-- 1) teams / team_members 테이블 (한 사용자가 여러 팀에 소속 가능)
-- 2) documents.visibility(all/team/private) + owner_team_id
-- 3) can_view_document() 에 가시성 게이트 AND 추가 (기존 민감도·상태/역할 게이트 유지)
-- 4) RLS + service_role/authenticated GRANT
--
-- 적용: Supabase SQL Editor 에서 수동 실행. CLI 사용 안 함.

-- ──────────────────────────────────────────────────────────────
-- 1) teams
-- ──────────────────────────────────────────────────────────────
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

-- ──────────────────────────────────────────────────────────────
-- 2) team_members (다대다)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.team_members (
  team_id    uuid not null references public.teams (id)    on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (team_id, profile_id)
);
create index if not exists idx_team_members_profile on public.team_members (profile_id);

-- ──────────────────────────────────────────────────────────────
-- 3) documents 가시성 + 소유 팀
-- ──────────────────────────────────────────────────────────────
do $$ begin
  create type doc_visibility as enum ('all', 'team', 'private');
exception
  when duplicate_object then null;
end $$;

alter table public.documents
  add column if not exists visibility    doc_visibility not null default 'all',
  add column if not exists owner_team_id uuid references public.teams (id) on delete set null;

create index if not exists idx_documents_owner_team on public.documents (owner_team_id)
  where owner_team_id is not null;

-- ──────────────────────────────────────────────────────────────
-- 4) can_view_document() 재정의
--    민감도(그룹6) · 상태/역할(그룹1) 게이트는 그대로 두고
--    팀/문서 가시성 게이트를 AND 로 추가한다.
-- ──────────────────────────────────────────────────────────────
create or replace function public.can_view_document(p_doc_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.documents d
    join public.profiles p on p.auth_user_id = (select auth.uid())
    where d.id = p_doc_id
      -- 민감도 게이트 (그룹 6)
      and (
        d.sensitivity = 'general'
        or (d.sensitivity = 'confidential' and p.role in ('admin','reviewer'))
        or (d.sensitivity = 'restricted'   and p.role = 'admin')
      )
      -- 상태·역할 가시성 (그룹 1)
      and (
        d.type in ('chapter','section')
        or p.role in ('admin','reviewer')
        or (
          p.role = 'editor' and (
            d.status = 'published'
            or d.created_by = p.id
            or d.created_by is null
          )
        )
        or (p.role = 'viewer' and d.status = 'published')
      )
      -- 팀/문서 가시성 게이트 (A) — 신규
      and (
        d.type in ('chapter','section')        -- 컨테이너는 트리 구조 위해 항상 통과
        or d.visibility = 'all'
        or p.role in ('admin','reviewer')      -- 관리자/검토자는 소속 무관 항상 열람
        or (
          d.visibility = 'team'
          and d.owner_team_id is not null
          and exists (
            select 1 from public.team_members tm
            where tm.team_id = d.owner_team_id and tm.profile_id = p.id
          )
        )
        or (d.visibility = 'private' and d.created_by = p.id)
      )
  )
$$;

grant execute on function public.can_view_document(text) to authenticated;

-- ──────────────────────────────────────────────────────────────
-- 5) RLS
--    읽기: 인증 사용자 전체 (드롭다운/소속 표시용)
--    쓰기: 정책 없음 → 차단. 팀 관리 server action 은 service_role 로 수행.
-- ──────────────────────────────────────────────────────────────
alter table public.teams        enable row level security;
alter table public.team_members enable row level security;

drop policy if exists teams_read        on public.teams;
drop policy if exists team_members_read on public.team_members;
create policy teams_read        on public.teams        for select to authenticated using (true);
create policy team_members_read on public.team_members for select to authenticated using (true);

-- ──────────────────────────────────────────────────────────────
-- 6) GRANT (프로젝트가 자동 노출 OFF 라 신규 테이블은 명시 필요 — 0009/0022 패턴)
-- ──────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.teams        to service_role;
grant select, insert, update, delete on public.team_members to service_role;
grant select on public.teams        to authenticated;
grant select on public.team_members to authenticated;
