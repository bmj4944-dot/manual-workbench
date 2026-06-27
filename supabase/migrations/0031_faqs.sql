-- 0031_faqs.sql
-- 콘텐츠 관리 — FAQ(자주 묻는 질문) 영속화
--
-- 기존엔 lib/sample-data.ts 의 FAQ_LIST 하드코딩이었다. 운영 도입을 위해
-- DB 테이블 + 출처(매뉴얼 문서 연결)로 옮기고, /manage/faq 콘솔에서 관리한다.
--
-- 1) faqs / faq_sources 테이블
-- 2) RLS read-only(authenticated) + service_role/authenticated GRANT
-- 3) 기존 FAQ_LIST 7건 seed (전환 시 화면 공백 방지)
--
-- 적용: Supabase SQL Editor 에서 Role=postgres 로 수동 실행.

-- ──────────────────────────────────────────────────────────────
-- 1) faqs
-- ──────────────────────────────────────────────────────────────
create table if not exists public.faqs (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text not null,
  confidence  numeric(4,3) not null default 1.0,   -- 0..1
  tags        text[] not null default '{}',
  asked_count integer not null default 0,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id)
);

-- ──────────────────────────────────────────────────────────────
-- 2) faq_sources — 답변 근거가 되는 매뉴얼 문서 연결
-- ──────────────────────────────────────────────────────────────
create table if not exists public.faq_sources (
  id          uuid primary key default gen_random_uuid(),
  faq_id      uuid not null references public.faqs (id) on delete cascade,
  document_id text references public.documents (id) on delete set null,
  confidence  numeric(4,3),
  snippet     text,
  sort_order  integer not null default 0
);
create index if not exists idx_faq_sources_faq on public.faq_sources (faq_id, sort_order);

-- ──────────────────────────────────────────────────────────────
-- 3) updated_at 트리거 (기존 set_updated_at() 재사용)
-- ──────────────────────────────────────────────────────────────
drop trigger if exists trg_faqs_updated_at on public.faqs;
create trigger trg_faqs_updated_at
  before update on public.faqs
  for each row execute function set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- 4) RLS — 읽기: 인증 사용자 전체. 쓰기: 정책 없음 → service_role 만.
-- ──────────────────────────────────────────────────────────────
alter table public.faqs        enable row level security;
alter table public.faq_sources enable row level security;

drop policy if exists faqs_read        on public.faqs;
drop policy if exists faq_sources_read on public.faq_sources;
create policy faqs_read        on public.faqs        for select to authenticated using (true);
create policy faq_sources_read on public.faq_sources for select to authenticated using (true);

-- ──────────────────────────────────────────────────────────────
-- 5) GRANT (자동 노출 OFF — 0022/0030 패턴)
-- ──────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.faqs        to service_role;
grant select, insert, update, delete on public.faq_sources to service_role;
grant select on public.faqs        to authenticated;
grant select on public.faq_sources to authenticated;

-- ──────────────────────────────────────────────────────────────
-- 6) Seed — 기존 FAQ_LIST 7건. 고정 UUID + on conflict do nothing 으로 멱등.
--    document_id 는 서브쿼리로 연결(없으면 NULL — 스니펫은 보존).
-- ──────────────────────────────────────────────────────────────
insert into public.faqs (id, question, answer, confidence, tags, asked_count, sort_order) values
  ('fac00000-0000-4000-8000-000000000001',
   '결제는 됐는데 주문 내역이 안 보여요. 어떻게 해야 하나요?',
   '주문 시점과 결제 카드사를 알려주시면 즉시 결제 상태를 확인해드리겠습니다. 결제는 정상 처리되었으나 시스템 동기화 지연으로 주문 내역 노출이 1~3분 지연될 수 있습니다.',
   0.94, array['결제','주문'], 412, 0),
  ('fac00000-0000-4000-8000-000000000002',
   '구매한 지 일주일 됐는데 환불 받을 수 있나요?',
   '구매한 지 7일 이내라면 단순 변심도 환불 가능합니다. 다만 제품을 개봉하셨다면 변심 환불은 50%이며 배송비는 고객 부담입니다. 하자가 있다면 전액 환불 + 배송비 회사 부담입니다.',
   0.96, array['환불','교환'], 387, 1),
  ('fac00000-0000-4000-8000-000000000003',
   '배송이 너무 늦어요. 언제 도착하나요?',
   '운송장 번호로 즉시 추적해드리고, 예상 도착일을 다시 안내드리겠습니다. 배송 지연으로 불편을 끼쳐 죄송합니다.',
   0.92, array['배송'], 298, 2),
  ('fac00000-0000-4000-8000-000000000004',
   'VIP 등급인데 환불이 안 된다고요?',
   'VIP 고객님께도 정중히 안내드리며, 사안에 따라 팀장 결재로 예외 처리가 가능합니다. 즉시 매니저에게 연결해드리겠습니다.',
   0.68, array['VIP','환불'], 47, 3),
  ('fac00000-0000-4000-8000-000000000005',
   '개인정보가 어떻게 처리되나요?',
   '개인정보는 회원 식별·서비스 제공·민원 처리 목적으로만 사용되며, 회원 탈퇴 시까지 보관됩니다. 거래 기록은 전자상거래법에 따라 5년간 보관됩니다.',
   0.98, array['개인정보','법무'], 156, 4),
  ('fac00000-0000-4000-8000-000000000006',
   '제품 사용 중 다쳤어요. 어떻게 처리되나요?',
   '정말 놀라셨겠습니다. 즉시 의료비 선보전 후 제품 회수·검사가 진행됩니다. 안전 관련 사고는 D등급으로 사안별 협의되며 24시간 내 1차 보상이 이뤄집니다.',
   0.91, array['안전사고','보상'], 18, 5),
  ('fac00000-0000-4000-8000-000000000007',
   '비밀번호 재설정 메일이 안 와요.',
   '스팸함을 먼저 확인 부탁드립니다. 5분 이상 지연되면 메일 서버 점검일 수 있어 지원팀에서 수동으로 재발송해드릴 수 있습니다.',
   0.42, array['계정','비밀번호'], 89, 6)
on conflict (id) do nothing;

insert into public.faq_sources (id, faq_id, document_id, confidence, snippet, sort_order) values
  ('fade0000-0000-4000-8000-000000000001', 'fac00000-0000-4000-8000-000000000001', (select id from public.documents where id='ch1-2-1'), 0.94, '결제 오류 — 1차 안내 스크립트', 0),
  ('fade0000-0000-4000-8000-000000000002', 'fac00000-0000-4000-8000-000000000001', (select id from public.documents where id='ch3-1-2'), 0.71, '티켓 생성·이관 절차', 1),
  ('fade0000-0000-4000-8000-000000000003', 'fac00000-0000-4000-8000-000000000002', (select id from public.documents where id='ch1-2-1'), 0.96, '응대 분기 가이드 — 환불 가능 여부', 0),
  ('fade0000-0000-4000-8000-000000000004', 'fac00000-0000-4000-8000-000000000002', (select id from public.documents where id='ch2-2-1'), 0.88, '환불 정책 요약표', 1),
  ('fade0000-0000-4000-8000-000000000005', 'fac00000-0000-4000-8000-000000000003', (select id from public.documents where id='ch1-2-1'), 0.92, '배송 지연 — 사과 + 추적 스크립트', 0),
  ('fade0000-0000-4000-8000-000000000006', 'fac00000-0000-4000-8000-000000000004', (select id from public.documents where id='ch2-3-1'), 0.68, 'VIP 등급 구분 (초안)', 0),
  ('fade0000-0000-4000-8000-000000000007', 'fac00000-0000-4000-8000-000000000004', (select id from public.documents where id='ch2-2-1'), 0.55, '환불 정책 요약표', 1),
  ('fade0000-0000-4000-8000-000000000008', 'fac00000-0000-4000-8000-000000000005', (select id from public.documents where id='ch4-1-1'), 0.98, '개인정보처리방침 v5.0', 0),
  ('fade0000-0000-4000-8000-000000000009', 'fac00000-0000-4000-8000-000000000006', (select id from public.documents where id='ch2-1-4'), 0.91, '보상 가이드라인 — D등급 적용', 0),
  ('fade0000-0000-4000-8000-00000000000a', 'fac00000-0000-4000-8000-000000000006', (select id from public.documents where id='ch2-1-1'), 0.66, '1차 진정 단계', 1),
  ('fade0000-0000-4000-8000-00000000000b', 'fac00000-0000-4000-8000-000000000007', (select id from public.documents where id='ch3-1-1'), 0.42, '로그인 및 기본 설정 (작성중)', 0)
on conflict (id) do nothing;
