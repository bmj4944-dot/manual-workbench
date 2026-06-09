-- 그룹 4-③ SLA 추적 (검토 기한).
--
-- review 진입 시 review_deadline = now + REVIEW_SLA_DAYS(3일) 설정. 기한 초과
-- 알림은 cron 없이 멱등하게 처리한다: 워크벤치 로드 시 sweepOverdueReviews 가
-- "내가 승인자이고 기한이 지났으며 아직 알림 안 보낸" 문서에 1회 notify 한 뒤
-- overdue_notified=true 로 표시 → 중복 방지. review 를 벗어나면(승인/공개/초안)
-- deadline 과 플래그를 리셋해 재검토가 새 SLA 로 시작되게 한다.

alter table documents
  add column if not exists review_deadline  timestamptz,
  add column if not exists overdue_notified boolean not null default false;

-- sweep 쿼리(status='review' and review_deadline < now and overdue_notified=false)
-- 가속용 부분 인덱스
create index if not exists documents_review_deadline_idx
  on documents (review_deadline)
  where status = 'review' and overdue_notified = false;

notify pgrst, 'reload schema';
