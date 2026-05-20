-- Manual Workbench — demo seed data (re-runnable).
-- Apply AFTER 0001_init.sql and 0002_profiles_decouple.sql.
--
-- This file is idempotent for the static rows (profiles, documents, ...)
-- via on-conflict clauses. Re-running will refresh the rows.

begin;

-- =====================================================================
-- Profiles (5 individuals + 3 team labels)
-- =====================================================================
insert into profiles (code, name, initials, color, role) values
  ('u-kim',   '김상담',   '김', 'oklch(0.55 0.14 30)',  'editor'),
  ('u-park',  '박매니저', '박', 'oklch(0.55 0.14 240)', 'reviewer'),
  ('u-lee',   '이팀장',   '이', 'oklch(0.55 0.14 145)', 'admin'),
  ('u-choi',  '최리더',   '최', 'oklch(0.55 0.14 310)', 'reviewer'),
  ('u-jung',  '정인턴',   '정', 'oklch(0.55 0.14 75)',  'editor'),
  ('t-legal', '법무팀',   '법', 'oklch(0.6 0.12 270)',  'reviewer'),
  ('t-ops',   '운영팀',   '운', 'oklch(0.6 0.12 100)',  'reviewer'),
  ('t-vip',   'VIP팀',    'V',  'oklch(0.6 0.12 50)',   'reviewer')
on conflict (code) do update
  set name = excluded.name,
      initials = excluded.initials,
      color = excluded.color,
      role = excluded.role;

-- =====================================================================
-- Documents tree
-- =====================================================================
insert into documents (id, parent_id, label, label_en, type, status, sort_order, badge, is_open) values
  -- Chapter 1
  ('ch1',     null,  '01. 고객응대 기본 원칙',   '01. CS Fundamentals',    'chapter', 'published', 100, null, true),
  ('ch1-1',   'ch1', '1.1 응대 철학과 행동강령', '1.1 Philosophy & Code',  'section', null,        10,  null, false),
  ('ch1-1-1', 'ch1-1', '1.1.1 기본 매너 5원칙',  '1.1.1 Five basic manners', 'item', 'published', 10, null, false),
  ('ch1-1-2', 'ch1-1', '1.1.2 호칭 및 경어 가이드','1.1.2 Honorifics guide',  'item', 'published', 20, null, false),
  ('ch1-1-3', 'ch1-1', '1.1.3 금기어와 권장 표현','1.1.3 Forbidden vs preferred','item','review',  30, null, false),
  ('ch1-2',   'ch1', '1.2 채널별 응대 표준',     '1.2 Channel standards',  'section', null,        20,  null, true),
  ('ch1-2-1', 'ch1-2', '1.2.1 전화 응대 스크립트','1.2.1 Phone scripts',    'item',  'published',  10, null, false),
  ('ch1-2-2', 'ch1-2', '1.2.2 이메일 응대 템플릿','1.2.2 Email templates',  'item',  'published',  20, null, false),
  ('ch1-2-3', 'ch1-2', '1.2.3 채팅 응대 가이드',  '1.2.3 Live chat guide',  'item',  'draft',      30, null, false),
  ('ch1-3',   'ch1', '1.3 응대 품질 평가 기준',  '1.3 QA criteria',        'section', null,        30,  null, false),
  ('ch1-3-1', 'ch1-3', '1.3.1 모니터링 체크리스트','1.3.1 Monitoring checklist','item', 'approved', 10, null, false),
  -- Chapter 2
  ('ch2',     null,  '02. 상황별 응대 시나리오', '02. Scenarios',          'chapter', null,        200, null, true),
  ('ch2-1',   'ch2', '2.1 클레임 응대 프로세스', '2.1 Complaint handling', 'section', null,        10,  null, true),
  ('ch2-1-1', 'ch2-1', '2.1.1 1차 진정 단계',   '2.1.1 De-escalation',    'item',  'published',  10, null, false),
  ('ch2-1-2', 'ch2-1', '2.1.2 문제 파악 인터뷰', '2.1.2 Diagnostic interview','item','published', 20, null, false),
  ('ch2-1-3', 'ch2-1', '2.1.3 해결안 제시',     '2.1.3 Resolution offer', 'item',  'review',     30, null, false),
  ('ch2-1-4', 'ch2-1', '2.1.4 보상 가이드라인', '2.1.4 Compensation guide','item', 'approved',   40, 'PDF', false),
  ('ch2-2',   'ch2', '2.2 환불·교환 처리',     '2.2 Refund & exchange',  'section', null,        20,  null, false),
  ('ch2-2-1', 'ch2-2', '2.2.1 환불 정책 요약표', '2.2.1 Refund policy',    'item',  'published',  10, null, false),
  ('ch2-2-2', 'ch2-2', '2.2.2 교환 절차 플로우', '2.2.2 Exchange flow',    'item',  'draft',      20, null, false),
  ('ch2-3',   'ch2', '2.3 VIP 고객 응대',       '2.3 VIP customers',     'section', null,        30,  null, false),
  ('ch2-3-1', 'ch2-3', '2.3.1 VIP 등급 구분',   '2.3.1 VIP tiers',        'item',  'draft',      10, null, false),
  -- Chapter 3
  ('ch3',     null,  '03. 시스템 및 도구 사용법','03. Systems & Tools',     'chapter', null,       300, null, false),
  ('ch3-1',   'ch3', '3.1 CRM 시스템 가이드',   '3.1 CRM guide',          'section', null,        10,  null, false),
  ('ch3-1-1', 'ch3-1', '3.1.1 로그인 및 기본 설정','3.1.1 Login & setup',  'item',  'published',  10, null, false),
  ('ch3-1-2', 'ch3-1', '3.1.2 티켓 생성·이관',   '3.1.2 Ticket creation',  'item',  'review',     20, null, false),
  ('ch3-2',   'ch3', '3.2 응대 보조 도구',     '3.2 Helper tools',        'section', null,        20,  null, false),
  ('ch3-2-1', 'ch3-2', '3.2.1 사내 위키 활용',   '3.2.1 Internal wiki',    'item',  'draft',      10, null, false),
  ('ch3-2-2', 'ch3-2', '3.2.2 응대 매크로 관리', '3.2.2 Macro management', 'item',  'draft',      20, null, false),
  -- Chapter 4
  ('ch4',     null,  '04. 부록',                '04. Appendix',           'chapter', null,        400, null, false),
  ('ch4-1',   'ch4', '4.1 약관 및 법적 고지',    '4.1 Terms & legal notices','section',null,       10,  null, false),
  ('ch4-1-1', 'ch4-1', '4.1.1 개인정보처리방침', '4.1.1 Privacy policy',   'item',  'published',  10, 'PDF', false),
  ('ch4-1-2', 'ch4-1', '4.1.2 서비스 이용약관',  '4.1.2 Terms of service', 'item',  'published',  20, 'PDF', false),
  ('ch4-2',   'ch4', '4.2 용어 사전',           '4.2 Glossary',           'section', null,        20,  null, false),
  ('ch4-2-1', 'ch4-2', '4.2.1 CS 표준 용어',    '4.2.1 Standard CS terms', 'item',  'published',  10, null, false)
on conflict (id) do update
  set parent_id  = excluded.parent_id,
      label      = excluded.label,
      label_en   = excluded.label_en,
      type       = excluded.type,
      status     = excluded.status,
      sort_order = excluded.sort_order,
      badge      = excluded.badge,
      is_open    = excluded.is_open;

-- =====================================================================
-- Document content (full HTML bodies)
-- =====================================================================
insert into document_content (document_id, tags, version, author_id, body, pdf_title, pdf_pages, updated_at) values
  (
    'ch1-2-1',
    array['응대 스크립트','전화','필수'],
    'v3.2',
    (select id from profiles where code='u-kim'),
    $body$
<h2>전화 응대 스크립트</h2>
<p>전화 응대는 고객과의 <strong>첫 30초</strong>가 전체 인상을 결정합니다. 표준 인사부터 종료 멘트까지 일관된 톤을 유지하면서도, 고객의 감정 상태에 따라 적절히 어조를 조절해야 합니다.</p>

<div class="callout info">
  <div class="ico">i</div>
  <div class="body">
    <p>핵심 원칙</p>
    <p>"빠르고 정확한 응대"보다 "<strong>고객이 이해받고 있다는 느낌</strong>"이 우선입니다. 해결책이 즉시 없더라도 공감 표현으로 시작하세요.</p>
  </div>
</div>

<h3>1. 표준 오프닝 (수신)</h3>
<p>벨이 <strong>3회 이내</strong>에 받습니다. 다음 순서를 기억하세요.</p>
<ol>
  <li>인사 — "안녕하십니까, 고객행복센터 <em>OOO</em>입니다."</li>
  <li>고객 확인 — "<u>실례지만</u> 성함을 여쭤봐도 될까요?"</li>
  <li>용건 청취 — 끝까지 듣고, 핵심을 반복 확인합니다.</li>
</ol>

<h3>2. 톤 매트릭스</h3>
<table>
  <thead><tr><th>고객 상태</th><th>권장 어조</th><th>피해야 할 표현</th></tr></thead>
  <tbody>
    <tr><td>일반 문의</td><td>밝고 또렷한 어조</td><td>"음...", "잠시만요" 반복</td></tr>
    <tr><td>당황·불안</td><td>차분하고 안정적인 어조</td><td>"왜 그러셨어요?"</td></tr>
    <tr><td>화·분노</td><td>낮은 톤, 공감 표현 우선</td><td>"진정하세요", "규정상..."</td></tr>
    <tr><td>슬픔·실망</td><td>속도 늦춤, 침묵 허용</td><td>"별일 아니에요"</td></tr>
  </tbody>
</table>

<h3>3. 종료 체크리스트</h3>
<ul class="checklist">
  <li><input type="checkbox" checked />처리 결과 요약 (1문장)</li>
  <li><input type="checkbox" checked />다음 단계 안내 (있다면)</li>
  <li><input type="checkbox" />추가 문의 사항 확인</li>
  <li><input type="checkbox" />고객보다 먼저 끊지 않기</li>
</ul>

<div class="callout warn">
  <div class="ico">!</div>
  <div class="body">
    <p>주의 — 녹취 안내</p>
    <p>응대 품질 향상을 위한 녹취가 진행될 수 있음을 <strong>오프닝 직후 즉시</strong> 안내해야 합니다. (개인정보보호법 제15조)</p>
  </div>
</div>

<h3>4. 자주 쓰는 응대 스크립트</h3>
<div class="script-card">
  <div class="sc-hd">
    <span class="lbl">SCRIPT</span>
    <span>결제 오류 — 1차 안내</span>
    <span class="spacer"></span>
  </div>
  <div class="sc-body">안녕하십니까 <span class="var-slot">{고객명}</span>님, 고객행복센터 <span class="var-slot">{상담사명}</span>입니다.
확인이 가능한 정보로 결제 상태를 즉시 살펴보겠습니다.
거래 시각과 사용하신 카드사를 알려주시면 빠르게 확인 도와드리겠습니다.</div>
</div>
$body$,
    null,
    null,
    now() - interval '2 hours'
  ),
  (
    'ch1-1-1',
    array['기본 매너','신입 필독'],
    'v2.0',
    (select id from profiles where code='u-lee'),
    $body$
<h2>기본 매너 5원칙</h2>
<p>모든 응대의 출발점입니다. 채널·상황과 무관하게 항상 지켜야 합니다.</p>
<ol>
  <li><strong>경청</strong> — 고객이 말을 끝마치기 전에 끊지 않는다.</li>
  <li><strong>공감</strong> — "불편하셨겠어요" 같은 표현으로 감정을 먼저 받는다.</li>
  <li><strong>정확</strong> — 모르는 내용은 추측하지 않고 확인 후 회신.</li>
  <li><strong>책임</strong> — 다른 부서 이슈여도 "제가 확인해드리겠습니다"로 인계한다.</li>
  <li><strong>마무리</strong> — 처리 결과를 1문장으로 요약하고 추가 질문을 확인한다.</li>
</ol>
<div class="callout info">
  <div class="ico">i</div>
  <div class="body">
    <p>가장 흔한 실수</p>
    <p>고객보다 먼저 통화를 끊는 것 — 만족도 점수에 즉각적인 부정 영향을 줍니다.</p>
  </div>
</div>
$body$,
    null,
    null,
    now() - interval '7 days'
  ),
  (
    'ch2-1-1',
    array['클레임','HEAR'],
    'v1.4',
    (select id from profiles where code='u-park'),
    $body$
<h2>1차 진정 단계 — HEAR 프레임워크</h2>
<p>화가 난 고객을 처음 만나는 단계에서는 <strong>해결보다 진정</strong>이 우선입니다.</p>
<table>
  <thead><tr><th>단계</th><th>의미</th><th>예시 멘트</th></tr></thead>
  <tbody>
    <tr><td>H — Hear</td><td>경청</td><td>"끝까지 듣겠습니다."</td></tr>
    <tr><td>E — Empathize</td><td>공감</td><td>"많이 불편하셨겠어요."</td></tr>
    <tr><td>A — Apologize</td><td>사과</td><td>"불편을 드려 죄송합니다."</td></tr>
    <tr><td>R — Resolve</td><td>해결</td><td>"지금 즉시 확인해서 알려드리겠습니다."</td></tr>
  </tbody>
</table>
$body$,
    null,
    null,
    now() - interval '1 day'
  ),
  -- PDF entries (no body, just metadata)
  ('ch2-1-4', array['보상','법무 검토 완료']::text[], 'v1.4', (select id from profiles where code='t-legal'), '', '보상 가이드라인 v1.4',     8,  now() - interval '7 days'),
  ('ch4-1-1', array['법적 고지','필수']::text[],     'v5.0', (select id from profiles where code='t-legal'), '', '개인정보처리방침 v5.0',  14, '2026-02-01'::timestamptz),
  ('ch4-1-2', array['법적 고지']::text[],            'v2.3', (select id from profiles where code='t-legal'), '', '서비스 이용약관 v2.3',  12, now() - interval '60 days')
on conflict (document_id) do update
  set tags = excluded.tags,
      version = excluded.version,
      author_id = excluded.author_id,
      body = excluded.body,
      pdf_title = excluded.pdf_title,
      pdf_pages = excluded.pdf_pages,
      updated_at = excluded.updated_at;

-- =====================================================================
-- Comments
-- =====================================================================
delete from comments where document_id in ('ch1-2-1', 'ch2-1-1');

insert into comments (document_id, author_id, body, resolved, created_at) values
  ('ch1-2-1', (select id from profiles where code='u-park'),
    e'@김상담 톤 매트릭스 4번째 행 \'슬픔·실망\' 케이스 사례 더 추가 부탁드려요. 최근 응대 통화에서 비슷한 패턴이 자주 나오고 있어요.',
    false, now() - interval '3 hours'),
  ('ch1-2-1', (select id from profiles where code='u-lee'),
    '녹취 안내 부분은 법무팀 검토 끝났습니다. 그대로 진행해도 됩니다.',
    true, now() - interval '1 day'),
  ('ch1-2-1', (select id from profiles where code='u-kim'),
    '결제 오류 스크립트의 변수 슬롯이 너무 정형적이지 않을지? 자연스럽게 다듬어야 할 것 같습니다.',
    false, now() - interval '7 days'),
  ('ch2-1-1', (select id from profiles where code='u-park'),
    'HEAR 단계 예시 멘트가 외부 자료보다 짧은데, 신입에게는 디테일이 더 도움이 될 거예요.',
    false, now() - interval '2 days');

-- =====================================================================
-- Must-read & what's new
-- =====================================================================
insert into must_read_documents (document_id) values
  ('ch2-1-4'),
  ('ch4-1-1'),
  ('ch1-2-1')
on conflict (document_id) do nothing;

delete from whats_new;

insert into whats_new (document_id, what, author_id, occurred_at) values
  ('ch1-2-1', '톤 매트릭스 4행 추가',          (select id from profiles where code='u-kim'),   now() - interval '2 hours'),
  ('ch2-1-1', 'HEAR 프레임워크 도식 추가',     (select id from profiles where code='u-park'),  now() - interval '1 day'),
  ('ch2-1-4', '보상 등급표 v1.4 개정',         (select id from profiles where code='t-legal'), now() - interval '7 days'),
  ('ch4-1-1', '개인정보처리방침 v5.0 시행',    (select id from profiles where code='t-legal'), '2026-02-01'::timestamptz);

-- =====================================================================
-- Page stats
-- =====================================================================
insert into page_stats (document_id, views, copies, searches, helpful, unhelpful, hourly) values
  ('ch1-2-1', 1842, 387, 92, 0.940, 0.060,
    array[12,8,5,3,2,4,38,82,140,180,162,148,120,135,165,168,142,98,52,38,28,22,18,14]),
  ('ch1-1-1', 1320, 142, 64, 0.910, 0.090, null),
  ('ch2-1-1',  980,  76, 121, 0.880, 0.120, null),
  ('ch2-1-4',  712,  28,  38, 0.860, 0.140, null),
  ('ch2-2-1',  642,  84,  88, 0.930, 0.070, null),
  ('ch1-2-2',  588, 240,  32, 0.960, 0.040, null),
  ('ch3-1-2',  412,  14,  26, 0.840, 0.160, null),
  ('ch4-1-1',  380,   8,  14, 0.780, 0.220, null),
  ('ch2-3-1',   88,   6,  18, 0.620, 0.380, null)
on conflict (document_id) do update
  set views = excluded.views,
      copies = excluded.copies,
      searches = excluded.searches,
      helpful = excluded.helpful,
      unhelpful = excluded.unhelpful,
      hourly = excluded.hourly;

-- =====================================================================
-- Verifications
-- =====================================================================
insert into verifications (document_id, last_verified_at, interval_days, verified_by) values
  ('ch1-2-1', now() - interval '18 days',  90,  (select id from profiles where code='u-park')),
  ('ch1-1-1', now() - interval '45 days',  180, (select id from profiles where code='u-lee')),
  ('ch1-1-2', now() - interval '95 days',  90,  (select id from profiles where code='u-park')),
  ('ch2-1-1', now() - interval '72 days',  90,  (select id from profiles where code='u-park')),
  ('ch2-1-4', now() - interval '4 days',   180, (select id from profiles where code='t-legal')),
  ('ch3-1-2', now() - interval '220 days', 180, (select id from profiles where code='t-ops')),
  ('ch4-1-1', now() - interval '32 days',  365, (select id from profiles where code='t-legal')),
  ('ch4-1-2', now() - interval '60 days',  365, (select id from profiles where code='t-legal')),
  ('ch2-3-1', now() - interval '280 days', 180, (select id from profiles where code='t-vip')),
  ('ch2-2-1', now() - interval '14 days',  90,  (select id from profiles where code='u-park'))
on conflict (document_id) do update
  set last_verified_at = excluded.last_verified_at,
      interval_days    = excluded.interval_days,
      verified_by      = excluded.verified_by;

-- =====================================================================
-- Cases (case studies)
-- =====================================================================
insert into cases (id, title, summary, result, occurred_at, duration_text, channel, agent_id, linked_document_id) values
  ('C-2026-0142',
   '정기 결제 무단 인출 클레임 → 전액 환불 + 사과 화환',
   '고객이 해지했다고 주장하는 정기 결제가 추가 인출됨. 시스템 로그상 해지 처리는 익일 자정 적용이어서 1회 추가 인출. 1차 진정 → 사실 확인 → 전액 환불 + 추가 1개월 무료 + 매니저 사과 통화로 마무리.',
   'good', '2026-03-12', '32분', '전화',
   (select id from profiles where code='u-kim'), 'ch2-1-1'),
  ('C-2026-0119',
   '장기 통화 후 클레임 — 응대 만족도 0점',
   '단순 비밀번호 재설정 문의가 50분 통화로 이어짐. 시스템 점검 시간과 겹쳐 처리 지연, 상담사가 ''잠시만요''를 12회 반복. 통화 종료 후 만족도 1점/5점, NPS 응답에서 ''두번 다시 안 쓴다'' 기재.',
   'bad', '2026-02-28', '52분', '전화',
   (select id from profiles where code='u-jung'), 'ch1-2-1'),
  ('C-2026-0098',
   'VIP 고객 환불 거부 → 임원 개입 후 부분 환불 + 상품권',
   'VIP 등급 고객이 단순 변심으로 환불 요청. 규정상 불가하지만 거래 누적 8천만원의 핵심 고객. 1차 응대에서 거부 → 항의 → 팀장 → 임원 결재로 50% 환불 + 30만원 상품권으로 합의.',
   'mixed', '2026-02-05', '1시간 14분', '전화 → 메일',
   (select id from profiles where code='u-park'), 'ch2-3-1'),
  ('C-2026-0067',
   '제품 안전 사고 추정 → 즉시 회수 + 의료비 선보전',
   '고객 자녀가 제품 사용 중 손가락 부상. 결함 여부 불명확하나 안전 사고 우려로 D등급 적용. 24시간 내 의료비 선보전 100만원, 회수 후 전수 검사. 검사 결과 결함 없음으로 판명되었으나 회사 이미지 관점 적절 평가.',
   'good', '2026-01-22', '5일', '전화 → 방문',
   (select id from profiles where code='u-lee'), 'ch2-1-4')
on conflict (id) do update
  set title = excluded.title,
      summary = excluded.summary,
      result = excluded.result,
      occurred_at = excluded.occurred_at,
      duration_text = excluded.duration_text,
      channel = excluded.channel,
      agent_id = excluded.agent_id,
      linked_document_id = excluded.linked_document_id;

delete from case_transcript_lines where case_id in ('C-2026-0142','C-2026-0119','C-2026-0098','C-2026-0067');
delete from case_lessons          where case_id in ('C-2026-0142','C-2026-0119','C-2026-0098','C-2026-0067');

insert into case_transcript_lines (case_id, speaker, text, sort_order) values
  ('C-2026-0142', '고객',   '이미 해지했는데 왜 또 결제됐어요? 이거 사기 아닙니까?', 10),
  ('C-2026-0142', '상담사', '불편하셨을 것 같습니다. 결제 일자와 카드번호 끝 4자리 알려주시면 즉시 확인해 드리겠습니다.', 20),
  ('C-2026-0142', '고객',   '5월 3일에 해지했는데 5월 4일 인출됐어요.', 30),
  ('C-2026-0142', '상담사', '확인 결과, 5월 3일 23시 47분 해지 접수는 정상이나, 정기 결제 컷오프 시각인 22시를 지나 익일 1회 인출이 발생했습니다.', 40),
  ('C-2026-0142', '상담사', '전액 즉시 환불해드리고, 사과의 의미로 1개월 무료를 적용해드릴게요.', 50),
  ('C-2026-0142', '고객',   '...알겠습니다. 그렇게 해주세요.', 60),

  ('C-2026-0119', '고객',   '비밀번호 재설정 메일이 안 와요.', 10),
  ('C-2026-0119', '상담사', '확인해드릴게요. 잠시만요.', 20),
  ('C-2026-0119', '상담사', '...잠시만요. 시스템이 좀 느리네요.', 30),
  ('C-2026-0119', '고객',   '벌써 30분째인데요?', 40),
  ('C-2026-0119', '상담사', '정말 죄송합니다. 잠시만요.', 50),

  ('C-2026-0098', '고객',   'VIP인데 환불도 안 되나요?', 10),
  ('C-2026-0098', '상담사', '단순 변심은 등급 관계없이 환불이 어렵습니다.', 20),
  ('C-2026-0098', '고객',   '이런 식이면 다른 곳 쓰겠습니다.', 30),
  ('C-2026-0098', '상담사', '잠시만 양해 부탁드립니다. 팀장님께 사안 보고드리겠습니다.', 40),

  ('C-2026-0067', '고객',   '아이가 다쳤어요. 제품에 문제가 있는 것 같습니다.', 10),
  ('C-2026-0067', '상담사', '정말 놀라셨겠습니다. 아이 상태가 어떤지부터 알려주세요.', 20),
  ('C-2026-0067', '상담사', '즉시 의료비를 선보전해드리겠습니다. 영수증 보내주시면 24시간 안에 입금됩니다.', 30);

insert into case_lessons (case_id, lesson, sort_order) values
  ('C-2026-0142', '정기 결제 해지 시 컷오프 시각을 안내하지 않으면 분쟁 발생', 10),
  ('C-2026-0142', e'\'시스템 한계\' 표현은 책임 회피로 들릴 수 있음 — 1차 안내 후 사용 자제', 20),
  ('C-2026-0142', '추가 보상이 환불보다 사후 관계 회복에 효과적', 30),

  ('C-2026-0119', e'\'잠시만요\' 3회 이상 반복 시 반드시 콜백 옵션 안내', 10),
  ('C-2026-0119', '시스템 점검 중일 때는 응대 매크로로 상태 안내 + 콜백 제안', 20),
  ('C-2026-0119', '신규 상담사 멘토링 — 첫 30일 통화 모니터링 강화', 30),

  ('C-2026-0098', e'VIP 응대 시 \'규정상 불가\'는 1차 후 사용 자제 — 즉시 에스컬레이션', 10),
  ('C-2026-0098', '거래 누적 5천만원 이상은 팀장 결재로 예외 처리 권한 부여', 20),
  ('C-2026-0098', 'VIP 매뉴얼 2.3 보강 — 등급별 예외 한도 명시화', 30),

  ('C-2026-0067', '안전 사고는 책임 소재 불명확해도 D등급 적용, 선조치 후 보고', 10),
  ('C-2026-0067', '고객 자녀·노약자 부상 시 사과·공감이 사실 확인보다 우선', 20),
  ('C-2026-0067', '추후 검사 결과가 회사에 유리해도 보상 환수 요구 금지', 30);

-- =====================================================================
-- Onboarding tasks + questions
-- =====================================================================
insert into onboarding_tasks (id, type, title, description, section_id, estimate, sort_order) values
  ('ob-1', 'read',     '전화 응대 스크립트 정독',        '기본 톤·오프닝·종료 멘트와 톤 매트릭스를 학습합니다', 'ch1-2-1', '10분', 10),
  ('ob-2', 'quiz',     '응대 톤 매트릭스 퀴즈',          '고객 감정 상태별 올바른 어조와 피해야 할 표현',         null,      null,   20),
  ('ob-3', 'read',     '클레임 응대 — 1차 진정 단계',     'HEAR 프레임워크와 피해야 할 표현',                  'ch2-1-1', '8분',  30),
  ('ob-4', 'quiz',     'HEAR 프레임워크 퀴즈',           null,                                              null,      null,   40),
  ('ob-5', 'read',     '보상 가이드라인 (PDF) 확인',     '보상 등급 A~D와 결재 절차',                          'ch2-1-4', '12분', 50),
  ('ob-6', 'practice', '결정 트리 실습 — 환불 가능 여부', '전화 응대 스크립트 페이지의 인터랙티브 가이드를 끝까지 진행해보세요', 'ch1-2-1', '5분', 60),
  ('ob-7', 'read',     '개인정보처리방침 숙지',          '법무팀 작성 — 정기 갱신 필수',                       'ch4-1-1', '15분', 70)
on conflict (id) do update
  set type = excluded.type,
      title = excluded.title,
      description = excluded.description,
      section_id = excluded.section_id,
      estimate = excluded.estimate,
      sort_order = excluded.sort_order;

delete from onboarding_questions where task_id in ('ob-2','ob-4');

insert into onboarding_questions (task_id, question, options, correct_index, explanation, sort_order) values
  ('ob-2',
    '화·분노 상태의 고객에게 가장 피해야 할 표현은?',
    '["진정하세요","확인해드리겠습니다","죄송합니다","안내해드리겠습니다"]'::jsonb,
    0,
    e'\'진정하세요\'는 고객 감정을 무시한다는 신호로 받아들여집니다.',
    10),
  ('ob-2',
    '고객보다 먼저 끊지 말아야 하는 이유는?',
    '["회사 규정","법적 의무","NPS 컴플레인 사유 1위","녹취 시간 단축"]'::jsonb,
    2,
    e'최근 NPS 조사에서 \'먼저 끊김\' 컴플레인이 12%→18%로 증가했습니다.',
    20),
  ('ob-2',
    '오프닝 직후 반드시 안내해야 할 사항은?',
    '["요금제 안내","녹취 진행 안내","프로모션 안내","직원명"]'::jsonb,
    1,
    '개인정보보호법 제15조에 따라 오프닝 직후 즉시 녹취 안내가 필요합니다.',
    30),
  ('ob-4',
    'HEAR 프레임워크에서 H는 무엇을 의미하나요?',
    '["Hello (인사)","Hold back (반응 보류)","Help (도움)","Hear (듣기)"]'::jsonb,
    3,
    'Hear — 끝까지 듣는 것이 시작입니다.',
    10),
  ('ob-4',
    '클레임 응대 초반에 피해야 할 표현은?',
    e'["공감 표현","사실 인정","\'규정상...\' 변명","끝까지 청취"]'::jsonb,
    2,
    e'\'규정상...\'은 책임 회피로 받아들여지는 트리거 표현입니다.',
    20);

-- =====================================================================
-- Document versions (history for ch1-2-1)
-- =====================================================================
delete from document_versions where document_id = 'ch1-2-1';

insert into document_versions (document_id, version_label, author_id, description, body, tag, created_at) values
  ('ch1-2-1', 'v3.2', (select id from profiles where code='u-kim'),  '톤 매트릭스 4번째 행 추가', '', null,        now() - interval '2 hours'),
  ('ch1-2-1', 'v3.1', (select id from profiles where code='u-park'), '녹취 안내 콜아웃 추가',     '', 'approved',  now() - interval '1 day'),
  ('ch1-2-1', 'v3.0', (select id from profiles where code='u-lee'),  '스크립트 카드 포맷 정비',   '', 'published', now() - interval '7 days');

-- =====================================================================
-- Compliance records (per-user must-read acknowledgments)
-- =====================================================================
delete from compliance_records
  where user_id in (select id from profiles where code in ('u-kim','u-park','u-lee','u-choi','u-jung'));

insert into compliance_records (user_id, document_id, acknowledged_at)
select p.id, d.document_id, now() - interval '3 days'
from (values
  ('u-kim',  'ch2-1-4'),
  ('u-kim',  'ch1-2-1'),
  ('u-park', 'ch2-1-4'),
  ('u-park', 'ch4-1-1'),
  ('u-park', 'ch1-2-1'),
  ('u-lee',  'ch2-1-4'),
  ('u-lee',  'ch4-1-1'),
  ('u-lee',  'ch1-2-1'),
  ('u-choi', 'ch4-1-1')
) as d(code, document_id)
join profiles p on p.code = d.code;

commit;
