-- 0032_embeds.sql
-- 본문 임베드 운영화 — CRM 티켓 / 상품 카탈로그를 DB 로.
--
-- 기존엔 components/editor/body-hydration.ts 의 EMBED_DATA 하드코딩이었다.
-- 문서 본문의 .embed[data-embed] 위젯이 이 데이터를 렌더한다. 관리 콘솔에서
-- 운영할 수 있도록 테이블로 옮긴다.
--
-- 적용: Supabase SQL Editor 에서 Role=postgres 로 수동 실행.

-- ──────────────────────────────────────────────────────────────
-- 1) crm_tickets
-- ──────────────────────────────────────────────────────────────
create table if not exists public.crm_tickets (
  id           text primary key,                       -- "T-2026-0089"
  title        text not null,
  customer     text,
  status       text not null default 'open'
                 check (status in ('open','resolved','closed')),
  status_label text,                                   -- 표시용 "처리중"
  priority     text,                                   -- "P2"
  age_text     text,                                   -- "2시간 전"
  assignee     text,                                   -- 담당자 표시명
  channel      text,                                   -- "채팅"
  updated_at   timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- 2) products
-- ──────────────────────────────────────────────────────────────
create table if not exists public.products (
  sku          text primary key,                       -- "SKU-9821"
  name         text not null,
  price_text   text,                                   -- "₩249,000"
  stock        integer not null default 0,
  stock_status text not null default 'in'
                 check (stock_status in ('in','low')),
  category     text,
  rating_text  text,                                   -- "4.6 (1,283)"
  updated_at   timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- 3) updated_at 트리거 (기존 set_updated_at() 재사용)
-- ──────────────────────────────────────────────────────────────
drop trigger if exists trg_crm_tickets_updated_at on public.crm_tickets;
create trigger trg_crm_tickets_updated_at
  before update on public.crm_tickets
  for each row execute function set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- 4) RLS — 읽기: 인증 사용자 전체. 쓰기: service_role 만.
-- ──────────────────────────────────────────────────────────────
alter table public.crm_tickets enable row level security;
alter table public.products    enable row level security;

drop policy if exists crm_tickets_read on public.crm_tickets;
drop policy if exists products_read    on public.products;
create policy crm_tickets_read on public.crm_tickets for select to authenticated using (true);
create policy products_read    on public.products    for select to authenticated using (true);

-- ──────────────────────────────────────────────────────────────
-- 5) GRANT (자동 노출 OFF — 0022/0030 패턴)
-- ──────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.crm_tickets to service_role;
grant select, insert, update, delete on public.products    to service_role;
grant select on public.crm_tickets to authenticated;
grant select on public.products    to authenticated;

-- ──────────────────────────────────────────────────────────────
-- 6) Seed — 기존 EMBED_DATA 3건. 멱등(on conflict do nothing).
-- ──────────────────────────────────────────────────────────────
insert into public.crm_tickets (id, title, customer, status, status_label, priority, age_text, assignee, channel) values
  ('T-2026-0089', '장바구니에 담긴 상품이 자꾸 사라져요', '홍*동', 'open',     '처리중', 'P2', '2시간 전', '김상담',  '채팅'),
  ('T-2026-0123', '환불 요청 — 5월 3일 결제 건',        '박*수', 'resolved', '해결됨', 'P3', '어제',     '박매니저', '전화')
on conflict (id) do nothing;

insert into public.products (sku, name, price_text, stock, stock_status, category, rating_text) values
  ('SKU-9821', '프리미엄 무선 이어폰 Pro X', '₩249,000', 142, 'in', '오디오 / 이어폰', '4.6 (1,283)')
on conflict (sku) do nothing;
