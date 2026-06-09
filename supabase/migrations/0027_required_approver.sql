-- 그룹 4-② 특정 승인자 지정.
--
-- documents.required_approver_id 가 설정되면 그 사람만 review → approved 전이를
-- 할 수 있다(server action 게이트). NULL 이면 기존처럼 approve 권한을 가진 누구나
-- (admin/reviewer) 승인 가능 — 하위호환.
--
-- 지정자는 admin/reviewer(approve 권한). 승인자 후보 역시 approve 가능 역할이어야
-- 실제로 승인할 수 있으므로 server action 에서 후보 역할을 검증한다.
--
-- 갱신은 기존 documents_update_auth 정책으로 충분(컬럼 제한 없음). 새 컬럼이라
-- 별도 GRANT 불필요 — 테이블 단위 권한을 상속.

alter table documents
  add column if not exists required_approver_id uuid references profiles (id) on delete set null;

create index if not exists documents_required_approver_idx
  on documents (required_approver_id) where required_approver_id is not null;

notify pgrst, 'reload schema';
