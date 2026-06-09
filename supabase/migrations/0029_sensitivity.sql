-- 그룹 6 — 민감 매뉴얼 sensitivity(분류 기반 접근 제어).
--
-- 문서당 민감도 레벨을 두고, 기존 RBAC 가시성(can_view_document, 0021) 위에
-- 게이트를 하나 더 AND 한다:
--   general      → 추가 제한 없음 (기존 상태·역할 규칙 그대로)
--   confidential → admin / reviewer 만 열람
--   restricted   → admin 만 열람
-- published 라도 confidential 이면 viewer/editor 에겐 안 보인다.
--
-- can_view_document 에만 얹으므로 document_content / versions / comments /
-- attachments / feedback 정책(모두 이 함수에 위임)에 자동 전파된다.
--
-- 주의: 게이트는 모든 type 에 균일 적용된다. 컨테이너(chapter/section)를
-- confidential 로 분류하면 그 가지 전체가 권한 없는 사용자에게 가려진다.
-- 기본값 general 이라 기존 문서 동작은 불변.

create type doc_sensitivity as enum ('general', 'confidential', 'restricted');

alter table documents
  add column if not exists sensitivity doc_sensitivity not null default 'general';

create index if not exists documents_sensitivity_idx
  on documents (sensitivity) where sensitivity <> 'general';

-- can_view_document 재정의 — 민감도 게이트 추가.
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
  )
$$;

grant execute on function public.can_view_document(text) to authenticated;

notify pgrst, 'reload schema';
