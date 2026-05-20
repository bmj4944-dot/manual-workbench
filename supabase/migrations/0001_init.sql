-- Manual Workbench — initial schema
-- Tables only. RLS policies are added later when Auth is wired up.

-- =====================================================================
-- Enums
-- =====================================================================
create type node_type     as enum ('chapter', 'section', 'item');
create type node_status   as enum ('draft', 'review', 'approved', 'published');
create type member_role   as enum ('admin', 'reviewer', 'editor', 'viewer');
create type case_result   as enum ('good', 'bad', 'mixed');
create type version_tag   as enum ('approved', 'published');
create type onboarding_kind as enum ('read', 'quiz', 'practice');

-- =====================================================================
-- Profiles (extends auth.users)
-- =====================================================================
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text        not null,
  initials    text        not null,
  color       text        not null,
  role        member_role not null default 'editor',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- =====================================================================
-- Documents (chapter / section / item tree)
-- =====================================================================
create table documents (
  id          text        primary key,                       -- "ch1-2-1"
  parent_id   text        references documents (id) on delete cascade,
  label       text        not null,
  label_en    text,
  type        node_type   not null,
  status      node_status,
  sort_order  integer     not null default 0,
  badge       text,                                          -- 'PDF' | null
  is_open     boolean     not null default false,            -- 트리 기본 펼침 상태
  created_at  timestamptz not null default now(),
  created_by  uuid        references profiles (id),
  updated_at  timestamptz not null default now(),
  updated_by  uuid        references profiles (id)
);
create index documents_parent_id_idx on documents (parent_id);
create index documents_sort_idx      on documents (parent_id, sort_order);

-- =====================================================================
-- Document content (1:1 with documents)
-- =====================================================================
create table document_content (
  document_id      text         primary key references documents (id) on delete cascade,
  tags             text[]       not null default '{}',
  version          text         not null default 'v0.1',
  author_id        uuid         references profiles (id),
  body             text         not null default '',         -- Tiptap HTML
  pdf_storage_path text,                                     -- Supabase Storage object path
  pdf_title        text,
  pdf_pages        integer,
  updated_at       timestamptz  not null default now()
);

-- =====================================================================
-- Version history
-- =====================================================================
create table document_versions (
  id            uuid         primary key default gen_random_uuid(),
  document_id   text         not null references documents (id) on delete cascade,
  version_label text         not null,
  author_id     uuid         references profiles (id),
  description   text         not null default '',
  body          text         not null default '',
  tag           version_tag,
  created_at    timestamptz  not null default now()
);
create index document_versions_doc_idx on document_versions (document_id, created_at desc);

-- =====================================================================
-- Comments
-- =====================================================================
create table comments (
  id           uuid         primary key default gen_random_uuid(),
  document_id  text         not null references documents (id) on delete cascade,
  author_id    uuid         references profiles (id),
  body         text         not null,
  resolved     boolean      not null default false,
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now()
);
create index comments_doc_idx on comments (document_id, created_at desc);

-- =====================================================================
-- Page stats (analytics rollup)
-- =====================================================================
create table page_stats (
  document_id text         primary key references documents (id) on delete cascade,
  views       integer      not null default 0,
  copies      integer      not null default 0,
  searches    integer      not null default 0,
  helpful     numeric(4,3) not null default 0,   -- 0..1
  unhelpful   numeric(4,3) not null default 0,
  hourly      integer[],                          -- length 24
  updated_at  timestamptz  not null default now()
);

-- =====================================================================
-- Verification (freshness check)
-- =====================================================================
create table verifications (
  document_id      text        primary key references documents (id) on delete cascade,
  last_verified_at timestamptz not null default now(),
  interval_days    integer     not null,
  verified_by      uuid        references profiles (id)
);

-- =====================================================================
-- What's new (change feed)
-- =====================================================================
create table whats_new (
  id          uuid         primary key default gen_random_uuid(),
  document_id text         not null references documents (id) on delete cascade,
  what        text         not null,
  author_id   uuid         references profiles (id),
  occurred_at timestamptz  not null default now()
);
create index whats_new_recent_idx on whats_new (occurred_at desc);

-- =====================================================================
-- Must-read & compliance
-- =====================================================================
create table must_read_documents (
  document_id text primary key references documents (id) on delete cascade,
  added_at    timestamptz not null default now()
);

create table compliance_records (
  user_id        uuid        not null references profiles (id) on delete cascade,
  document_id    text        not null references documents (id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  primary key (user_id, document_id)
);

-- =====================================================================
-- Cases (case studies)
-- =====================================================================
create table cases (
  id                 text        primary key,                -- "C-2026-0142"
  title              text        not null,
  summary            text        not null,
  result             case_result not null,
  occurred_at        date        not null,
  duration_text      text,                                   -- "32분", "5일" 등 사람이 읽는 표기
  channel            text,
  agent_id           uuid        references profiles (id),
  linked_document_id text        references documents (id) on delete set null,
  created_at         timestamptz not null default now()
);

create table case_transcript_lines (
  id        uuid    primary key default gen_random_uuid(),
  case_id   text    not null references cases (id) on delete cascade,
  speaker   text    not null,                                -- '고객', '상담사' 등 자유서술
  text      text    not null,
  sort_order integer not null default 0
);
create index case_transcript_case_idx on case_transcript_lines (case_id, sort_order);

create table case_lessons (
  id        uuid    primary key default gen_random_uuid(),
  case_id   text    not null references cases (id) on delete cascade,
  lesson    text    not null,
  sort_order integer not null default 0
);
create index case_lessons_case_idx on case_lessons (case_id, sort_order);

-- =====================================================================
-- Onboarding
-- =====================================================================
create table onboarding_tasks (
  id           text             primary key,                 -- "ob-1"
  type         onboarding_kind  not null,
  title        text             not null,
  description  text,
  section_id   text             references documents (id) on delete set null,
  estimate     text,                                         -- "10분"
  sort_order   integer          not null default 0
);

create table onboarding_questions (
  id            uuid     primary key default gen_random_uuid(),
  task_id       text     not null references onboarding_tasks (id) on delete cascade,
  question      text     not null,
  options       jsonb    not null,                           -- string[]
  correct_index integer  not null,
  explanation   text,
  sort_order    integer  not null default 0
);
create index onboarding_questions_task_idx on onboarding_questions (task_id, sort_order);

create table onboarding_progress (
  user_id       uuid        not null references profiles (id) on delete cascade,
  task_id       text        not null references onboarding_tasks (id) on delete cascade,
  completed_at  timestamptz not null default now(),
  score         numeric(4,3),                                -- 0..1, quiz 한정
  primary key (user_id, task_id)
);

-- =====================================================================
-- updated_at triggers
-- =====================================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger trg_documents_updated_at
  before update on documents
  for each row execute function set_updated_at();

create trigger trg_document_content_updated_at
  before update on document_content
  for each row execute function set_updated_at();

create trigger trg_comments_updated_at
  before update on comments
  for each row execute function set_updated_at();

create trigger trg_page_stats_updated_at
  before update on page_stats
  for each row execute function set_updated_at();
