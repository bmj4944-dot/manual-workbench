-- 사용자 라이프사이클 컬럼 + RLS write 차단.
--
-- profiles.is_active = false 인 계정은:
--   - server action 단에서 requireProfile() 이 throw 하여 모든 write 차단
--   - RLS 단에서도 백업으로 write 정책에 is_active = true 조건 추가
--   - SELECT 는 그대로 허용 (관리자 콘솔에서 비활성 계정도 보여야 하므로)
--
-- 강제 로그아웃은 별도 — auth.admin.signOut() 으로 supabase 측 세션 무효화.
-- is_active = false 만으로는 이미 발급된 토큰 만료까지 약간의 grace 가 있음.

alter table profiles
  add column if not exists is_active boolean not null default true,
  add column if not exists disabled_at timestamptz,
  add column if not exists disabled_by uuid references profiles (id);

create index if not exists profiles_is_active_idx on profiles (is_active);

-- 비활성 계정 RLS write 차단을 위한 helper
create or replace function public.is_my_profile_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_active from public.profiles where auth_user_id = (select auth.uid())),
    false
  );
$$;

grant execute on function public.is_my_profile_active() to authenticated;

-- 기존 write 정책들에 is_active 검사 추가 (대표적인 것만 — 나머지는
-- requireProfile 게이트에 의존)
drop policy if exists "comments_insert_own" on comments;
create policy "comments_insert_own" on comments
  for insert to authenticated
  with check (
    public.is_my_profile_active()
    and author_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "documents_insert_auth" on documents;
create policy "documents_insert_auth" on documents
  for insert to authenticated
  with check (public.is_my_profile_active());

drop policy if exists "documents_update_auth" on documents;
create policy "documents_update_auth" on documents
  for update to authenticated
  using (public.is_my_profile_active())
  with check (public.is_my_profile_active());

drop policy if exists "documents_delete_auth" on documents;
create policy "documents_delete_auth" on documents
  for delete to authenticated
  using (public.is_my_profile_active());

drop policy if exists "document_content_update_auth" on document_content;
create policy "document_content_update_auth" on document_content
  for update to authenticated
  using (public.is_my_profile_active())
  with check (public.is_my_profile_active());

drop policy if exists "document_content_insert_auth" on document_content;
create policy "document_content_insert_auth" on document_content
  for insert to authenticated
  with check (public.is_my_profile_active());

notify pgrst, 'reload schema';
