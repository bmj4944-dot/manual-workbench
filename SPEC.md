# Manual Workbench — 기능 명세서 및 운영 도입 로드맵

작성일: 2026-05-22
대상: 콜센터·CS팀 업무 매뉴얼 SaaS
배포: <https://manual-workbench.vercel.app>
저장소: <https://github.com/bmj4944-dot/manual-workbench>

---

## 목차

**Part 1. 기능 명세서**
1. 시스템 개요
2. 인증·사용자
3. 문서 트리·관리
4. 에디터
5. 첨부·파일·인라인 미디어
6. 댓글·협업
7. 워크플로우 (승인·검증·필독)
8. 검색
9. 통계·분석
10. AI 기능
11. UX 폴리시·기술 인프라
12. 데이터 모델·서버 API

**Part 2. 운영 도입을 위한 남은 작업**
A. 권한·조직 정교화
B. 관리자 콘솔
C. 워크플로우 보강
D. 컴플라이언스·감사
E. 알림 시스템
F. 데이터 import·export
G. 검색 보강
H. 실시간 협업
I. 모바일·반응형·접근성
J. 외부 시스템 통합
K. 운영 인프라
L. 보안
M. 사용자 온보딩

**부록**
- 마이그레이션 적용 체크리스트
- 환경 변수
- 운영 도입 우선순위 매트릭스

---

# Part 1. 기능 명세서

## 1. 시스템 개요

### 1.1 목적
콜센터·CS팀이 업무 매뉴얼(스크립트, 정책, FAQ, 응대 케이스)을 **저작–검토–승인–공개–검증–개선** 라이프사이클로 운영할 수 있게 하는 SaaS. 정적 위키와 달리 **권한 분리 / 검증 사이클 / AI Q&A**가 통합되어 있다.

### 1.2 기술 스택
| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind 3.4 + 자체 디자인 토큰 (OKLCH) |
| 백엔드 | Supabase (Postgres + Auth + Storage + Realtime 미사용) |
| 에디터 | contenteditable + execCommand 자체 구현 |
| PDF | pdfjs-dist 5.7 (CDN worker) |
| AI | @anthropic-ai/sdk · Claude Haiku 4.5 |
| 테마 | next-themes (light/dark, data-theme) |
| 아이콘 | lucide-react + 다수 inline SVG |
| 폰트 | Pretendard / Inter / JetBrains Mono (CDN) |

### 1.3 사용자 역할 (현행 4단계)
| Role | 권한 |
|---|---|
| **admin** | edit + review + approve + publish |
| **reviewer** | review + approve |
| **editor** | edit |
| **viewer** | 읽기만 |

권한은 `lib/actions/_helpers.ts`의 `ROLE_PERMS`에 정의. 상단바 역할 스위치는 시뮬레이션용이며 DB의 `profiles.role`이 source of truth.

### 1.4 아키텍처
- **렌더링**: SSR + 클라이언트 컴포넌트 혼합. `app/layout.tsx`는 셸만, 데이터 fetch는 `app/workbench-shell.tsx`(async server component)가 Suspense 하위에서 처리 → 첫 SSR에 로딩 스켈레톤 streaming.
- **데이터 fetch**: `lib/data/*.ts` 모두 server-only. `Promise.all`로 병렬.
- **상태**: 클라이언트 `lib/workbench-context.tsx`의 단일 Context. 낙관적 업데이트 + 실패 시 롤백 + 토스트 패턴.
- **Server Actions**: `lib/actions/*.ts` 모두 `"use server"`. RLS는 row-level 베이스라인, Server Action은 role-level + 비즈니스 룰 게이트.
- **Storage**: 큰 파일은 **direct-to-Storage signed URL** 패턴으로 업로드 (Vercel function payload cap 4.5MB 우회).

---

## 2. 인증·사용자

### 2.1 로그인
- **Magic Link** (이메일 한 번 클릭)
- **Google OAuth**
- 미인증 시 모든 경로 → `/login` 강제 리다이렉트 (`middleware.ts`)

### 2.2 신규 가입 자동 처리
- `auth.users` insert 트리거 `handle_new_user()` → `profiles` row 자동 생성
- 이름: `raw_user_meta_data.full_name` → `name` → 이메일 local part 순으로 우선
- 이니셜: 이름 첫 글자 대문자
- 색상: 랜덤 hue OKLCH
- role: 기본 **editor**

### 2.3 프로필
- 컬럼: `id`, `auth_user_id`, `name`, `initials`, `color`, `role`, `created_at`, `updated_at`
- 표시: 우측 패널 댓글 아바타, 멘션 팝오버, 작성자 라벨, 검증자 라벨 등 광범위
- 편집 UI: **없음** (현행은 DB 직접 수정 또는 OAuth 메타 의존)

### 2.4 세션·쿠키
- Supabase SSR 쿠키 기반. `lib/supabase/server.ts` (server) / `lib/supabase/client.ts` (browser) / `lib/supabase/middleware.ts` (edge) 3종 분리.

---

## 3. 문서 트리·관리

### 3.1 구조
**3-tier 트리**: 장(chapter) → 절(section) → 항목(item)
- ID는 텍스트(`ch1-2-1` 형태), `parent_id`로 자기 참조
- `sort_order`로 형제 정렬
- `badge`: `'PDF'` 등 시각 마크
- `is_open`: 트리 펼침 기본 상태

### 3.2 TOC 트리 (사이드바)
- 펼치기/접기 (chevron)
- `WHAT'S NEW` 카드 + 즐겨찾기 목록
- 사이드바 내부 검색 (인스턴트)
- **컨텍스트 메뉴** (우클릭): 이름 변경(인라인) / 자식 추가 / 형제 추가 / 복제 / 위로 / 아래로 / 삭제
- 추가 노드 자동으로 `setActiveId`로 활성화

### 3.3 다중 도큐먼트 탭
- 최대 N개 (기본 8, 사용자 설정 가능)
- **고정(pin)**: 닫기 안 됨 + 한계 초과 시 unpinned부터 제거
- **dirty 마크**: 자동 저장 진행 중 표시
- **status dot**: 상태별 색
- **탭 관리 popover**: 모두 닫기 / 고정만 남기기

### 3.4 빠른 이동 팔레트
- 단축키: `⌘K` / `Ctrl+K` / `/` (입력 요소 비포커스 시)
- 트리 + 즐겨찾기 + 최근 검색

### 3.5 즐겨찾기
- 사이드바 카드 + doc-head ★ 토글
- 사용자 단위 (`favorites.user_id + document_id` 복합 키)

---

## 4. 에디터

### 4.1 아키텍처
- **contenteditable + execCommand** 자체 구현 (Tiptap 의존성 제거됨)
- HTML이 그대로 `document_content.body`에 저장
- 본문 hydration: `body-hydration.ts`가 정적 HTML을 인터랙티브 위젯으로 살림

### 4.2 본문 편집 툴바 (7그룹)
1. **이력**: undo / redo
2. **블록**: 본문 ↔ 제목1/2/3
3. **인라인**: 굵게 / 기울임 / 밑줄 / 취소선
4. **색**: 글자색 / 형광펜 (6색 팔레트)
5. **목록**: 불릿 / 번호 / 체크리스트
6. **정렬**: 좌/가운데/우
7. **삽입**: 표 · 이미지 · 콜아웃 · 코드 · 스크립트카드 · 결정트리 · 임베드 · 구분선 · 링크
8. **도구**: 찾기/바꾸기 · PDF 첨부 · 인쇄

### 4.3 표
- **삽입 모달**: 행 1~12 × 열 1~8 라이브 미리보기, 머리글 자동
- **셀 플로팅 툴바** (`TableEditorOverlay`):
  - 행 위/아래 추가
  - 열 왼/오른쪽 추가
  - 셀 병합 / 분할
  - 셀 정렬 (좌/가운데/우)
  - 행/열/표 삭제

### 4.4 콜아웃 (6종)
- 정보(info) / 성공(success) / 주의(warn) / 위험(danger) / 팁(tip) / 예시(example)
- 각각 OKLCH 톤 + 다크모드 override

### 4.5 멘션 (@)
- `@` 입력 → 팝오버 등장
- 멤버 이름 prefix 매칭
- 키보드 nav (↑/↓/Enter/Esc)
- 선택 시 `@홍길동` 텍스트 + (mention 메타데이터)

### 4.6 찾기/바꾸기
- `⌘F` / `Ctrl+F` 토글
- 인라인 바: 검색어 / 결과 카운트 / 이전·다음 / 바꾸기 / 모두 바꾸기 / 닫기

### 4.7 인라인 이미지
- 본문에 drag-drop → 즉시 0.7 opacity 미리보기
- **direct-to-Storage signed URL** 업로드 (Vercel 4.5MB 우회)
  - 버킷: `documents-attachments` / prefix `_editor/<docId>/<uuid>.<ext>`
  - 제한: 8MB
  - mime 화이트리스트: png/jpeg/gif/webp/svg
- 완료 후 src를 영구 URL(`/api/editor-images/...`)로 swap + revokeObjectURL
- 실패 시 frame 원복 + 토스트
- 라우트: 인증된 사용자만 stream, 1시간 immutable 캐시

### 4.8 위젯
| 위젯 | 동작 |
|---|---|
| 스크립트 카드 | 변수 슬롯 `{고객명}` + 변수 입력 → 본문 실시간 치환 + 📋 복사 |
| 결정 트리 | 분기 질문 + 예/아니오 클릭 흐름 + 결과 + 다시 시작 |
| 체크리스트 | 인라인 체크박스 토글 (목록 li.done 마크) |
| 임베드 카드 | CRM 티켓 / 상품 카탈로그 (샘플 3개) + 외부 링크 |

### 4.9 위젯 hover 컨트롤
- 모든 위젯에 hover 시 우상단 floating toolbar (편집 모드만)
- **공통**: 삭제 · 복제
- **type별 편집** (prompt() 기반):
  - 스크립트 카드: `+ 변수` (이름 → 입력 + 본문 슬롯 자동 삽입)
  - 결정 트리: JSON 편집 (parse validate)
  - 임베드: 등록된 키 swap
- toolbar는 hydrate 시 inject, 저장 직전 `stripWidgetControls`로 strip → DB 영구화 안 됨

### 4.10 협업 커서 시뮬레이션
- 편집 모드일 때 본문 위에 다른 멤버 2명 화살표 + 이름 라벨 floating
- 4초마다 임의 위치로 부드러운 transition
- 백엔드 없음 (진짜 실시간은 Part 2.H 참조)

### 4.11 자동 저장
- 입력 후 800ms throttle → `saveBodyAction` UPSERT
- 상단바 상태: "저장됨" (회색) / "저장 중" (pulse)
- 실패 시 5초 throttle 토스트 ("자동 저장 실패")

### 4.12 버전 히스토리
- 우측 패널 히스토리 탭에 최대 30개
- 워크플로우 상태 변경 시 자동 스냅샷 (draft 제외)
- 클릭 시 본문 복원 (head 아닌 행만)
- 각 행: 시각 · 작성자 · 버전(v0.1 단위 증가) · 설명 · 상태 태그(approved/published)

---

## 5. 첨부·파일·인라인 미디어

### 5.1 일반 첨부 (우측 패널)
- **드롭존**: 점선 박스 + `+ 파일 추가` 버튼
- **6종 file-ico**: PDF / 이미지 / 문서 / 압축 / 코드 / 기본
- **진행률 바**: 업로드 % + 파일명 + 크기
- **다운로드 / 삭제**: 행마다
- **우측 패널 전체 드롭 영역**: 패널 어디든 drop OK (overlay 안내)
- **doc-head 첨부 pill**: 1개 이상 시 표시, 클릭하면 첨부 섹션으로 smooth scroll (`#attachments-section` anchor)

### 5.2 업로드 패턴 (signed URL)
1. 클라 → `createUploadSignedUrlAction({ kind, …meta })` 호출
2. 서버 → role/size/mime 검증 → `storage.createSignedUploadUrl(path)` → `{bucket, path, token}` 반환
3. 클라 → 브라우저 supabase-js로 `uploadToSignedUrl(path, token, file)` 직접 PUT
4. 클라 → `finalize*Action`으로 DB row 생성 (작은 JSON body)

**한계**: PDF 50MB / 첨부 25MB / 에디터 이미지 8MB

부수효과: multipart 안 거치니까 **한글 파일명 인코딩 깨짐 자체가 사라짐**.

### 5.3 다운로드
- `/api/attachments/<uuid>` — 인증된 사용자만 stream
- `?inline=1`로 inline 모드 (PDF 등)
- `Content-Disposition: attachment; filename*=UTF-8''<urlencoded>` — 한글 파일명 보존

### 5.4 PDF 인라인 뷰어
- PDF 첨부 시 자동 `documents.badge = 'PDF'` → 트리/탭 표시
- pdfjs-dist 5.7 + CDN worker
- 썸네일 사이드 (페이지 N장) + 페이지 네비 + 줌
- 드롭존 업로드 (50MB 한계)
- 라우트: `/api/pdf/<documentId>`

---

## 6. 댓글·협업

### 6.1 댓글
- 우측 패널 댓글 탭, 미해결 카운트 배지(상단 탭 옆)
- **작성자 아바타** (이니셜 + 색상) + 작성 시각 relative
- **본문**: 자유 텍스트 (멘션 인라인 가능)

### 6.2 답글 (2-level 스레드)
- 루트 댓글 + 자식 답글 들여쓰기 (24px + accent border-left)
- **답글 인라인 컴포저**: 루트 댓글의 "답글" 클릭 → 그 thread 아래 입력창
- **DB는 임의 depth 허용**하지만 UI/액션이 single-level로 flatten (답글의 답글은 root로 redirect)

### 6.3 해결 토글
- 루트 댓글에 ✓ 해결 마크 → opacity 50%
- 자식 답글에는 해결 버튼 없음 (의미 약함)

### 6.4 멘션 (에디터와 공유)
- 본문에서만 동작, 댓글은 plain text (현행)

### 6.5 협업 커서
- 본문 위 시뮬레이션 (Section 4.10)

---

## 7. 워크플로우

### 7.1 4단계 승인
- **초안(draft) → 검토중(review) → 승인(approved) → 공개(published)**
- 상단 **WorkflowStrip**: 4개 원 + 연결선
- 역할별 게이팅: editor=draft/review, reviewer=approved, admin=published
- 상태 변경 시 자동 **버전 스냅샷** + 토스트

### 7.2 검증 사이클 (verifications)
- 컬럼: `last_verified_at` / `interval_days` / `verified_by`
- **doc-head verify-pill** (3-state):
  | 상태 | 조건 | 라벨 | 색 |
  |---|---|---|---|
  | fresh | 주기의 70% 미만 | 검증 완료 | 초록 |
  | aging | 70%~100% | 만료 임박 (D-N) | 노랑 |
  | stale | 100% 초과 | 재검증 필요 (+N일) | 빨강 + pulse |
- **본문 하단 verify-bar** (stale일 때만): 안내 + "재검증 시작" 버튼
- **재검증 액션**: `last_verified_at + verified_by` 갱신 (interval 보존, 행 없으면 default 90일)
- 권한: reviewer/admin만, editor는 disabled
- **대시보드 정기 검증 탭**: 전 문서 진행률 바 + 대기열 + 재검증 버튼 + KPI

### 7.3 필독 확인 (must-read)
- `must_read_documents`에 등록된 문서는 본문 하단 **ack-bar** (만다린 배경)
- 사용자가 "확인했습니다" 클릭 → `compliance_records` insert
- 확인 후엔 초록 ack-bar + 버튼 disabled
- **대시보드 필독 확인 탭**: 멤버별 진행률 + 미확인 멤버 목록 + 항목별 ack 비율

---

## 8. 검색

### 8.1 전체 검색 뷰
- 경로: 상단바 → "검색" / 또는 빠른 이동 팔레트에서 Enter
- 입력마다 250ms debounce → 서버 RPC 호출
- 매칭 위치(제목/본문) 표시 + 검색어 하이라이트(`<mark>`)
- 본문 매칭 시 ~140자 snippet (HTML strip)
- 타입 필터: 전체 / 장 / 절 / 항
- 결과 클릭 → 문서 이동 + `page_stats.searches` +1

### 8.2 검색 백엔드
- **`search_documents(q)`** RPC (마이그레이션 0018):
  - pg_trgm GIN 인덱스 (documents.label, label_en, document_content.body)
  - `similarity()` 정렬, 제목 매칭 우선
  - SECURITY DEFINER + authenticated grant

### 8.3 빠른 이동 팔레트
- 단축키 `⌘K` / `Ctrl+K` / `/`
- 트리 + 즐겨찾기 prefix 매칭 (client-side)

### 8.4 본문 내 찾기/바꾸기
- 에디터 단위 (Section 4.6)

---

## 9. 통계·분석

### 9.1 자동 트래킹
| 종류 | 트리거 | Throttle |
|---|---|---|
| view | activeId 변경 시 (편집/읽기 무관) | 같은 doc 5분 |
| copy | 본문 내 텍스트 선택 + Ctrl+C | 같은 doc 5초 |
| search | 검색 결과 클릭 시 | 없음 |

- **RPC `record_page_stat(doc_id, kind)`**: SECURITY DEFINER + on conflict upsert (atomic +1)
- Throttle은 module-level Map (페이지 새로고침 시 reset)
- fire-and-forget, `revalidatePath` 안 함 (메트릭이라 다음 fetch 시 반영)

### 9.2 사용 분석 탭 (대시보드)
- **KPI 카드 4종**:
  - 총 조회수 (7일)
  - 복사 횟수
  - 평균 도움도 (`helpful` 평균 — 현재 트래킹 안 됨)
  - 활성 항목
- **24시간 조회 추이** 차트 (`pageStats.hourly[24]` — 현재 seed 정적)
- **TOP 5 카드**: 조회수 / 복사
- **검색 많은데 작성 미흡** (searches > 80 + helpful < 0.9)

### 9.3 미연결 메트릭
- `helpful` / `unhelpful` (FeedbackBar 👍/👎): UI는 있지만 DB 갱신 미연결
- `hourly[24]`: 시간대별 RPC 갱신 미구현 (현재 정적)

---

## 10. AI 기능

### 10.1 공용 server action
`askClaudeAction(input)` — `lib/actions/ai.ts`
- 모델: `claude-haiku-4-5-20251001`
- max_tokens: 800
- 환경 변수 `ANTHROPIC_API_KEY` 없으면 `{ok: false, reason: "..."}` 반환 (graceful degradation)

### 10.2 AI 요약 (우측 패널)
- 활성 문서 본문을 HTML strip 후 10k자 cap
- system: "콜센터·CS팀 매뉴얼을 빠르게 요약하는 도우미. 3~4문장."
- 결과를 카드에 표시. 3상태: idle / loading / done / error

### 10.3 챗봇 위젯
- 우하단 floating 보라 그라데이션 FAB
- 클릭 시 340×480 패널 펼침
- 활성 문서 본문을 시스템 프롬프트 컨텍스트로 묶음 ("본문에 답 없으면 솔직히 답")
- 메시지 히스토리 (세션 단위, 새로고침 시 wipe)
- 타이핑 dots 애니메이션 + 다크모드 + prefers-reduced-motion

---

## 11. UX 폴리시·기술 인프라

### 11.1 토스트
- `lib/toast.ts` — 모듈-싱글톤 store (react-hot-toast 스타일)
- `toast.success/error/info` API, React 외부에서도 호출 가능
- 우하단 stack, 자동 dismiss + × 닫기
- 3 variant + OKLCH 토큰 + 다크모드 + slide-in
- 모든 server action 실패가 사용자에게 노출됨 (`workbench-context.tsx` 모든 catch 블록)

### 11.2 에러 바운더리
- `app/error.tsx` — 페이지 렌더 에러 폴백 (디자인 토큰)
- `app/global-error.tsx` — layout 자체 실패 시 (self-contained inline 스타일)
- 둘 다 reset 버튼 + 새로고침 + digest 에러 ID

### 11.3 로딩 스켈레톤
- `app/loading.tsx` — manual2 셸 골격 (Topbar/Sidebar/DocTabs/Workflow/DocHead/Body/RightPanel)
- `.sk-bar` / `.sk-block` / `.sk-circle` + shimmer 1.5s
- **layout streaming**: `app/workbench-shell.tsx`로 데이터 fetch 분리 + Suspense → 첫 SSR에서도 즉시 streaming
- `prefers-reduced-motion` 시 shimmer 끄고 정적 배경

### 11.4 다크 모드
- next-themes + `data-theme="dark"` 속성
- OKLCH 토큰 기반 (모든 색이 var(--*)로 자동 follow)
- 토스트 / 에러바운더리 / 스켈레톤 / 검증바 / ack-bar / 알림팝 / 챗봇 모두 dark override

### 11.5 키보드 단축
| 키 | 동작 |
|---|---|
| ⌘K / Ctrl+K / / | 빠른 이동 팔레트 |
| ⌘F / Ctrl+F | 본문 찾기/바꾸기 |
| ⌘W / Ctrl+W | 활성 탭 닫기 (고정 제외) |
| Esc | 팔레트·찾기바·search 뷰 닫기 |

`/` 단축은 입력 요소 포커스 상태에서는 무시.

---

## 12. 데이터 모델·서버 API

### 12.1 테이블 (16개)
- **profiles** — auth.users 확장 (1:1)
- **documents** — 트리 노드
- **document_content** — 본문 HTML (1:1)
- **document_versions** — 버전 히스토리
- **comments** — 댓글 (`parent_comment_id` 자기참조)
- **page_stats** — views/copies/searches/helpful/unhelpful/hourly
- **verifications** — last_verified_at / interval_days / verified_by
- **whats_new** — 변경 피드
- **must_read_documents** — 필독 지정
- **compliance_records** — 사용자별 ack
- **attachments** — 일반 첨부 메타
- **favorites** — 사용자별 즐겨찾기
- **cases** + **case_transcript_lines** + **case_lessons** — 응대 사례
- **onboarding_tasks** + **onboarding_questions** + **onboarding_progress**

### 12.2 RLS 패턴
- `authenticated_read` 전체 SELECT 정책 (인증된 사용자면 누구나 read)
- 쓰기는 본인 행만 INSERT/UPDATE/DELETE 또는 admin/reviewer
- 일부는 정책 없이 RPC(SECURITY DEFINER)로만 우회 (예: `record_page_stat`)

### 12.3 Storage 버킷
- `documents-pdf` — PDF 한 파일/문서 (`<documentId>.pdf`)
- `documents-attachments` — 일반 첨부 (`<documentId>/<uuid>.<ext>`) + 인라인 이미지 (`_editor/<documentId>/<uuid>.<ext>`)
- 둘 다 private (`public = false`), authenticated만 RLS 통과

### 12.4 마이그레이션 (0001~0018)
| # | 내용 |
|---|---|
| 0001 | 초기 14개 테이블 + 트리거 |
| 0002 | profiles auth decouple |
| 0003 | temp_open_read 정책 (개발용) |
| 0004 | smart_updated_at 트리거 |
| 0005 | auth setup + handle_new_user |
| 0006 | user_writes + auth_profile_id |
| 0007 | fix definer → invoker |
| 0008 | inline_rls_lookup + debug_auth_info |
| 0009 | grant_permissions + backfill |
| 0010 | document_content / documents / document_versions 쓰기 정책 |
| 0011 | documents-pdf 버킷 + storage 정책 |
| 0012 | attachments 테이블 + documents-attachments 버킷 |
| 0013 | documents INSERT/DELETE 정책 (CRUD) |
| 0014 | `record_page_stat` RPC (페이지 통계) |
| 0015 | verifications INSERT/UPDATE 정책 (재검증) |
| 0016 | `comments.parent_comment_id` + index (답글) |
| 0017 | document_versions → whats_new 트리거 (자동 유도) |
| 0018 | pg_trgm + `search_documents` RPC (풀텍스트) |

### 12.5 Server Actions (lib/actions/)
| 모듈 | 액션 |
|---|---|
| `_helpers` | `requireProfile()`, `requirePermission()` |
| `comments` | `addCommentAction(parentId?)`, `toggleResolveCommentAction` |
| `favorites` | `addFavoriteAction`, `removeFavoriteAction` |
| `compliance` | `acknowledgeMustReadAction` |
| `content` | `saveBodyAction`, `pushVersionAction`, `addTagAction`, `removeTagAction` |
| `workflow` | `setNodeStatusAction` |
| `uploads` | `createUploadSignedUrlAction`, `finalizeAttachmentAction`, `finalizePdfAction`, `finalizeEditorImageAction` |
| `attachments` | `deleteAttachmentAction` |
| `documents-crud` | `createDocumentAction`, `addSiblingAction`, `duplicateDocumentAction`, `renameDocumentAction`, `deleteDocumentAction`, `moveDocumentAction` |
| `page-stats` | `recordPageStatAction` |
| `verifications` | `reverifyDocumentAction` |
| `search` | `searchDocumentsAction` |
| `ai` | `askClaudeAction` |

### 12.6 API 라우트
- `GET /api/pdf/<documentId>` — 인증 PDF stream
- `GET /api/attachments/<uuid>` — 인증 다운로드 (`?inline=1`)
- `GET /api/editor-images/<...path>` — 인증 인라인 이미지 (`_editor/` prefix 강제)

---

# Part 2. 운영 도입을 위한 남은 작업

> 본격적인 업무 매뉴얼 시스템으로 운영하기 위해선 현재 베이스 위에 **권한·관리자 콘솔·컴플라이언스·알림** 4개 축의 확장이 필요합니다. 아래는 영역별 상세 + 우선순위.

## A. 권한·조직 정교화 (우선순위: 최상)

### A.1 현재 한계
- 권한은 4단계 역할(admin/reviewer/editor/viewer)만
- **부서/팀 개념 없음** — A팀 매뉴얼을 B팀이 편집할 수 있음
- **문서별 ACL 없음** — 비공개 매뉴얼 운영 불가
- 역할 부여는 DB 직접 수정 (UI 부재)

### A.2 필요 사항

#### A.2.1 조직 구조
- `teams` 테이블: id / name / parent_team_id(트리) / created_at
- `profiles.team_id` 추가
- 사이드바 트리에 팀 필터, 또는 팀 단위 워크스페이스 분리
- 마이그레이션 + UI 작업

#### A.2.2 문서별 권한 (ACL)
- `document_permissions`: document_id / scope("team"/"user") / scope_id / level("read"/"edit"/"admin")
- 기본은 모두 read (현재 동작) + 명시적 edit/admin은 명단 기반
- 또는 단순화: `documents.visibility = "all" | "team" | "private"` + private 시 별도 ACL
- doc-head에 자물쇠 아이콘 + 권한 편집 모달

#### A.2.3 액션 감사 로그
- `audit_logs`: actor_id / action / target_type / target_id / metadata(JSON) / at
- 모든 server action에 일관된 logging hook (helper)
- admin 콘솔에서 검색·필터·CSV export

#### A.2.4 승인자 지정
- 현재는 role=reviewer면 누구나 승인 가능
- `document_approvers` 또는 `documents.approver_user_id` — 특정 사용자 지정
- 미지정 시 reviewer 전체에 알림

**추정 공수**: 3~4주 (스키마 설계 1주, server actions/RLS 1주, UI 1~2주)

---

## B. 관리자 콘솔 (우선순위: 최상)

### B.1 현재 한계
- 관리 대시보드는 **운영 정보 뷰어**일 뿐 (필독·분석·검증)
- **사용자/팀/권한 관리 UI 없음** — admin도 DB 직접 수정 필요

### B.2 필요 화면

#### B.2.1 사용자 관리
- 목록 (페이지네이션, 검색, 필터: role/팀/활성/마지막 로그인)
- 행 액션: 역할 변경 / 팀 이동 / 비활성화 / 영구 삭제 / 강제 로그아웃
- 신규 사용자 초대 (이메일 입력 → Magic Link 발송)
- bulk 액션 (CSV import)

#### B.2.2 팀 관리
- 팀 트리 (생성·이름변경·이동·삭제)
- 팀 멤버 목록
- 팀별 매뉴얼 통계

#### B.2.3 권한 매트릭스
- 역할별·팀별 가능한 액션 표
- 정책 변경 가능 (예: editor의 publish 권한 토글)

#### B.2.4 감사 로그 뷰어
- 시계열 / 사용자별 / 액션별 필터
- 상세 metadata JSON 펼치기
- CSV / JSON export

#### B.2.5 시스템 설정
- 검증 기본 주기 (default interval)
- 자동 저장 throttle (현재 800ms)
- 토스트 표시 시간
- 알림 채널 (이메일/Slack)
- 외부 통합 (API 키 관리)

#### B.2.6 백업·복원
- DB 백업 트리거 (Supabase 자체 백업 시점 표시)
- Storage 백업 (큰 파일)
- 매뉴얼 단위 JSON export (한 문서 + 모든 버전 + 첨부)
- import (JSON, ZIP)

**추정 공수**: 4~5주 (각 화면 1주씩)

---

## C. 워크플로우 보강 (우선순위: 상)

### C.1 현재 한계
- 승인은 역할 기반만, 특정 인물 지정 불가
- **거부 사유 / 재작업** 흐름 없음 (검토중 → 초안 강제 회귀)
- **SLA 추적 없음** — 검토중에 며칠 머무는지 알 수 없음
- 알림 없음 (검토자가 모름)

### C.2 필요 사항

#### C.2.1 승인자 지정 + 알림
- 문서 작성 시 reviewer 명시 지정 가능
- 검토중으로 전환 시 그 reviewer에게 알림 (인앱 + 이메일)
- 검토자가 비어있으면 모든 reviewer에게 전체 알림

#### C.2.2 거부 + 재작업
- "거부" 액션 + 사유 텍스트
- 상태가 draft로 되돌아가면서 거부 사유가 댓글로 자동 추가
- 작성자에게 알림

#### C.2.3 SLA·기한
- `documents.review_deadline` 옵션
- 마감 임박/초과 시 노란/빨간 배지 + 알림
- 대시보드 SLA 위반 카드

#### C.2.4 다단계 승인
- 매뉴얼 종류별 단계 정의 가능 (정책 매뉴얼은 reviewer + admin 2단계 등)
- 단계 정의 테이블 + 단계별 상태 추적

#### C.2.5 자동 promotion 룰
- 모든 reviewer가 승인 시 자동 published로 promote (옵션)
- 검증 주기 자동 갱신 (검증 완료 시 다음 주기 시작)

**추정 공수**: 3주

---

## D. 컴플라이언스·감사 (우선순위: 상)

### D.1 필요 사항

#### D.1.1 변경 로그
- A.2.3과 통합: 모든 write에 audit_logs 자동 기록
- 본문 변경은 diff까지 저장 (현재 document_versions가 full snapshot — 충분)

#### D.1.2 열람 로그
- 누가 언제 어떤 문서를 봤는지
- 민감 매뉴얼은 별도 로그 (`documents.is_sensitive = true` + `document_views` 테이블)

#### D.1.3 IP·디바이스 추적 (선택)
- 컴플라이언스 요구 시. 일반적으로는 PII 부담이 커서 신중

#### D.1.4 데이터 retention
- 비활성 사용자의 데이터 보관 기간
- 삭제된 문서의 영구 삭제 시점 (soft → hard delete)
- 백업 보관 정책

#### D.1.5 개인정보 마스킹
- 본문에 자동 마스킹 후보 (전화번호/주민번호/카드번호 패턴)
- 작성 단계에 경고
- 저장 단계에 자동 마스킹 옵션

**추정 공수**: 2~3주

---

## E. 알림 시스템 (우선순위: 상)

### E.1 현재 한계
- 인앱 알림은 **What's New** 카드만
- 이메일·Slack 등 외부 채널 없음

### E.2 필요 사항

#### E.2.1 인앱 알림 통합
- `notifications` 테이블: user_id / type / payload / read / at
- 종류:
  - 검토 요청
  - 댓글 멘션
  - 댓글에 답글
  - 필독 지정
  - 검증 만료 임박/초과
  - 본인 작성 문서가 승인/거부됨
- 상단바 벨 팝오버에 What's New 와 통합

#### E.2.2 이메일 알림
- Supabase Auth 메일러 또는 별도 SMTP (Resend, Postmark)
- 알림 종류별 템플릿
- 사용자별 환경 설정 (어떤 알림을 이메일로 받을지)
- digest 모드 (하루 1번 요약)

#### E.2.3 Slack/Teams Webhook
- 팀 단위 channel 매핑
- 검토 요청·승인·거부·검증 만료 자동 게시

#### E.2.4 알림 환경 설정 UI
- 사용자 프로필 페이지 (현재 없음 — F와 통합)

**추정 공수**: 2~3주

---

## F. 데이터 import·export (우선순위: 중)

### F.1 import
- **기존 매뉴얼 마이그레이션**: Word/PDF/Confluence/Notion에서 가져오기
  - Word: `mammoth` 또는 docx → HTML
  - PDF: pdf-parse + 사용자가 수동 정리
  - Confluence: REST API
  - Notion: 내보낸 HTML/CSV
- bulk import 어드민 화면 (CSV로 트리 구조 입력)

### F.2 export
- **JSON / ZIP 백업**: 문서 + 모든 버전 + 첨부 + 메타
- **인쇄 친화적 PDF**: 매뉴얼 전체 또는 선택 + 표지 + 목차
- **공유 링크**: 외부 게스트도 볼 수 있는 read-only URL (만료 가능)
- **CSV**: 페이지 통계, 감사 로그

**추정 공수**: 3주

---

## G. 검색 보강 (우선순위: 중)

### G.1 현재 한계
- 한국어 형태소 분석 없음 (pg_trgm trigram만)
- 동의어 처리 없음
- 필터: 타입만 (작성자/날짜/상태/태그 없음)

### G.2 필요 사항
- **한국어 토크나이저**: PostgreSQL 확장 (mecab, kkma 등) — Supabase에서 가능한지 확인 필요. 안 되면 외부 검색엔진 (Algolia, Typesense) 고려
- **동의어/유사어 사전**: `search_synonyms` 테이블 + 매핑
- **고급 필터**: 작성자 / 작성일 / 상태(승인/공개) / 태그 / 부서 / 검증 상태
- **검색 히스토리**: 사용자별 최근 검색어
- **인기 검색어**: 전체 통계 (admin 대시보드)
- **저장된 검색**: 자주 쓰는 쿼리 북마크

**추정 공수**: 3~4주 (한국어 토크나이저 결정에 따라 변동)

---

## H. 실시간 협업 (우선순위: 중-하)

### H.1 현재 한계
- 협업 커서는 시뮬레이션
- 동시 편집 시 last-write-wins (autosave 충돌)

### H.2 필요 사항
- **Yjs + Supabase Realtime** 통합 또는 Liveblocks 등
- 실시간 presence (지금 누가 보고 있는지)
- 진짜 협업 커서
- 동시 편집 CRDT 머지
- 동시 댓글 / 멘션 실시간 알림

### H.3 고려사항
- contenteditable 위에 CRDT는 까다로움. Slate/Lexical 등 정식 에디터 프레임워크로 전환 검토
- **결정 사항**: 협업이 필수면 에디터 재작성. 그 외엔 시뮬레이션 유지하고 다른 우선순위 먼저.

**추정 공수**: 4~6주 (에디터 재작성 포함 시 8주+)

---

## I. 모바일·반응형·접근성 (우선순위: 중-하)

### I.1 현재 한계
- 데스크탑 3-panel 레이아웃만 가정 (사이드바 280 + 메인 + 우측 300)
- 모바일에서는 깨짐

### I.2 필요 사항
- **반응형 레이아웃**: 모바일 < 768px에서 사이드바 drawer, 우측 패널 bottom-sheet
- **터치 인터랙션**: 길게 누르기 컨텍스트 메뉴, swipe 답글
- **PWA**: manifest + service worker → 홈 화면 추가
- **오프라인 모드**: 최근 본 문서 cache (Workbox)
- **접근성**:
  - 키보드 nav 누락 영역 점검
  - aria-label 보강
  - 컬러 콘트라스트 (WCAG AA 이상)
  - 스크린 리더 테스트

**추정 공수**: 3~4주

---

## J. 외부 시스템 통합 (우선순위: 하)

### J.1 가능한 통합
- **CRM (Salesforce, HubSpot, Zendesk)**: 임베드 카드를 실제 API로 (현재는 정적 샘플)
- **콜센터 (Genesys, NICE, Avaya)**: 응대 중 매뉴얼 실시간 표시
- **SSO**:
  - Microsoft Entra ID (Azure AD)
  - Okta
  - SAML 2.0
- **Zapier / Make**: 외부 자동화 (검증 만료 시 Trello 카드 생성 등)
- **Webhook API**: 외부에서 매뉴얼 변경 트리거

### J.2 우선순위
- SSO는 기업 도입에서 필수
- CRM 통합은 사용처에 따라

**추정 공수**: SSO 1~2주, CRM/콜센터는 통합 대상별

---

## K. 운영 인프라 (우선순위: 상)

### K.1 모니터링·로깅
- **Sentry**: 클라이언트 에러 자동 수집
- **Vercel Analytics**: 페이지 로드 / Web Vitals
- **Datadog 또는 Logflare**: 서버 로그 집약
- **Uptime 모니터**: BetterStack, Pingdom

### K.2 환경 분리
- 현재 production(Vercel)만. **staging** 환경 추가
- 각 환경 별도 Supabase project
- 마이그레이션 자동 적용 (현재 수동)

### K.3 CI/CD
- GitHub Actions:
  - PR 시 typecheck + lint + test
  - main merge 시 Vercel 자동 deploy (이미 됨)
  - 마이그레이션 자동 dry-run + diff comment
- 테스트:
  - 단위: Vitest
  - E2E: Playwright (로그인부터 본문 저장까지)

### K.4 백업·재해 복구
- Supabase 일별 자동 백업 (paid plan)
- Storage 별도 백업 (다른 region 또는 S3)
- 재해 복구 runbook (DB 손실 시 복원 시간 목표 등)

**추정 공수**: 2~3주

---

## L. 보안 (우선순위: 상)

### L.1 현재 상태
- Supabase Auth + RLS 기본
- HTTPS (Vercel 자동)
- Secret은 env

### L.2 필요 보강
- **Rate limiting**: AI 호출 / 검색 / 댓글 (Upstash Redis 또는 Vercel Edge Config)
- **CSRF**: Next.js Server Actions은 default protection 있지만 점검
- **CSP**: 헤더 명시 (XSS 추가 방어)
- **API key 로테이션**: ANTHROPIC_API_KEY 등 주기적
- **Secret scanning**: GitHub secret scanning 활성
- **Pen test**: 외부 보안 검토 (출시 전)
- **본문 sanitization**: 사용자 입력 HTML에 `<script>` 등 차단 (현재 contenteditable이 partially 차단하지만 검증 필요)
- **CSP nonce**: inline 스타일 다수 사용 중인데 nonce 처리

**추정 공수**: 2~3주

---

## M. 사용자 온보딩 (우선순위: 중)

### M.1 현재 한계
- 신입 온보딩 뷰는 있지만 콘텐츠는 정적 샘플
- 신규 사용자 가입 후 안내 흐름 없음

### M.2 필요 사항
- **초대 시스템**: admin이 이메일로 초대 → 가입 시 자동 팀 할당
- **첫 로그인 가이드**: 인터랙티브 투어 (Driver.js, Shepherd.js)
- **온보딩 콘텐츠 관리 UI**: admin이 신입 학습 경로 편집
- **진행 게이미피케이션**: 배지, 진행률 막대
- **수료 인증**: 퀴즈 통과 시 인증서 PDF

**추정 공수**: 2~3주

---

# 부록

## 부록 A. 마이그레이션 적용 체크리스트 (최신 세션 기준)

본격 도입 전 SQL Editor에서 다음을 순서대로 실행:

```sql
-- supabase/migrations/0014_page_stats_writes.sql
-- supabase/migrations/0015_verifications_writes.sql
-- supabase/migrations/0016_comment_threads.sql
-- supabase/migrations/0017_whats_new_auto.sql
-- supabase/migrations/0018_search.sql
```

각 적용 후 다음 확인:
```sql
-- 0014
select proname from pg_proc where proname = 'record_page_stat';
-- 0015
select count(*) from pg_policies where tablename = 'verifications';
-- 0016
select column_name from information_schema.columns
where table_name = 'comments' and column_name = 'parent_comment_id';
-- 0017
select tgname from pg_trigger where tgname = 'trg_versions_to_whats_new';
-- 0018
select proname from pg_proc where proname = 'search_documents';
```

## 부록 B. 환경 변수

| 변수 | 필수 | 용도 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | 클라이언트 Supabase 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | 서버 전용 admin 키 (절대 클라 노출 금지) |
| `ANTHROPIC_API_KEY` | (선택) | AI 요약 + 챗봇용. 없으면 두 기능이 graceful degradation |

## 부록 C. 운영 도입 우선순위 매트릭스

| 영역 | 우선순위 | 추정 공수 | 비즈니스 임팩트 |
|---|---|---|---|
| A. 권한·조직 정교화 | **최상** | 3~4주 | 다부서 운영의 전제 |
| B. 관리자 콘솔 | **최상** | 4~5주 | admin 일상 운영 도구 |
| C. 워크플로우 보강 | 상 | 3주 | 검토자 누락 방지·SLA |
| D. 컴플라이언스·감사 | 상 | 2~3주 | 규제 대응 |
| E. 알림 시스템 | 상 | 2~3주 | 사용자 engagement |
| K. 운영 인프라 | 상 | 2~3주 | 안정성·확장성 |
| L. 보안 | 상 | 2~3주 | 출시 전제 |
| F. import·export | 중 | 3주 | 기존 자산 이관 |
| G. 검색 보강 | 중 | 3~4주 | 콘텐츠 늘수록 중요 |
| M. 사용자 온보딩 | 중 | 2~3주 | 신입 효율 |
| I. 모바일·접근성 | 중-하 | 3~4주 | 사용 환경 다변화 |
| H. 실시간 협업 | 중-하 | 4~8주 | 동시 편집 필요 시 |
| J. 외부 통합 | 하 | 통합 대상별 | 통합 요건 발생 시 |

**MVP 운영 도입 (최소)** = A + B + C + E + K + L = 약 **16~22주 (4~5개월)**

**완전체** = 위 + D + F + G + M + I = 추가 **13~17주**

---

*문서 끝.*
