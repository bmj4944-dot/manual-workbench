-- 그룹 1 (워크플로 RBAC 강화) — 역할·상태·작성자 조합으로 가시성 제어.
--
-- 정책 (요약):
--   admin    → 모든 문서
--   reviewer → 모든 문서
--   editor   → published + 본인이 작성한 draft/review/approved
--   viewer   → published 만
--
-- chapter/section 컨테이너는 status 가 NULL 이라 누구에게나 보인다
-- (트리 골격이 끊기지 않도록). 가시성은 leaf item 단위로 적용.
--
-- created_by 가 NULL 인 기존(시드) 문서는 "system" 으로 간주 → editor 가
-- 본인 것처럼 접근 가능하도록 완화. 신규 문서는 server action 에서 항상
-- 작성자를 채우므로 NULL 이 나오지 않는다.

-- =====================================================================
-- helper: can_view_document(doc_id)
-- =====================================================================
-- SECURITY DEFINER 로 profiles 조회 권한 확보. STABLE 이라 동일 statement
-- 안에서 같은 doc_id 호출은 캐시된다. set search_path 로 search-path
-- hijack 방지.
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

-- =====================================================================
-- documents: 기존 temp_open_read 폐기 + 역할별 정책
-- =====================================================================
drop policy if exists "temp_open_read" on documents;

drop policy if exists "documents_select_by_role" on documents;
create policy "documents_select_by_role" on documents
  for select to authenticated
  using (public.can_view_document(id));

-- =====================================================================
-- document_content: documents 가시성에 종속
-- =====================================================================
drop policy if exists "temp_open_read" on document_content;

drop policy if exists "document_content_select_via_doc" on document_content;
create policy "document_content_select_via_doc" on document_content
  for select to authenticated
  using (public.can_view_document(document_id));

-- =====================================================================
-- document_versions: documents 가시성에 종속
-- =====================================================================
drop policy if exists "temp_open_read" on document_versions;

drop policy if exists "document_versions_select_via_doc" on document_versions;
create policy "document_versions_select_via_doc" on document_versions
  for select to authenticated
  using (public.can_view_document(document_id));

-- =====================================================================
-- comments: documents 가시성에 종속
-- =====================================================================
drop policy if exists "temp_open_read" on comments;

drop policy if exists "comments_select_via_doc" on comments;
create policy "comments_select_via_doc" on comments
  for select to authenticated
  using (public.can_view_document(document_id));

-- =====================================================================
-- attachments: 0012 의 authenticated_read 교체
-- =====================================================================
drop policy if exists "authenticated_read" on attachments;

drop policy if exists "attachments_select_via_doc" on attachments;
create policy "attachments_select_via_doc" on attachments
  for select to authenticated
  using (public.can_view_document(document_id));

-- =====================================================================
-- document_feedback: 0019 의 document_feedback_read 교체
-- =====================================================================
drop policy if exists "document_feedback_read" on document_feedback;

drop policy if exists "document_feedback_select_via_doc" on document_feedback;
create policy "document_feedback_select_via_doc" on document_feedback
  for select to authenticated
  using (public.can_view_document(document_id));

notify pgrst, 'reload schema';
