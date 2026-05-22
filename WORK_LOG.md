# Manual Workbench — 작업 로그

배포: https://manual-workbench.vercel.app
GitHub: https://github.com/bmj4944-dot/manual-workbench
디자인 소스: `/Users/mjbae/Project/Manual/design_handoff_manual_workbench/` (manual2.zip 기준)

---

## ✅ 완료된 작업

### 백엔드 / 인프라
- **Supabase 스키마**: 14개 테이블 (documents, document_content, comments, cases+transcript+lessons, onboarding+questions+progress, page_stats, verifications, whats_new, must_read_documents, compliance_records, document_versions, favorites, attachments, profiles)
- **마이그레이션 0001~0013** (수동 SQL Editor 적용)
  - 0001 init / 0002 profiles decouple / 0003 temp_open_read / 0004 smart_updated_at / 0005 auth + handle_new_user / 0006 user_writes + auth_profile_id / 0007 fix(definer→invoker) / 0008 inline_rls_lookup + debug_auth_info / 0009 grant_permissions + backfill / 0010 content_writes / 0011 storage_setup (documents-pdf) / 0012 attachments table + bucket / 0013 documents INSERT/DELETE
- **Auth**: Magic Link + Google OAuth, 미인증은 /login 강제 리다이렉트, profile 자동 생성 트리거
- **RLS**: authenticated_read 전체 + 본인/admin/reviewer 한정 write
- **Storage 버킷**: `documents-pdf`, `documents-attachments`

### 데이터 페치 (lib/data/)
documents · content · cases · onboarding · members · insights(page_stats/verifications/must_read/whats_new/compliance) · comments · history · attachments · user-state(favorites/acked) · current-user

### Server Actions (lib/actions/)
- comments: addComment, toggleResolveComment
- favorites: add/remove
- compliance: acknowledgeMustRead
- content: saveBody (autosave, UPSERT) / pushVersion
- workflow: setNodeStatus (역할 체크 + 자동 버전 스냅샷)
- pdf: uploadPdfAction (badge='PDF' 설정)
- attachments: upload/delete (한글 파일명 보존 — explicit "name" 필드 + UUID 경로)
- documents-crud: create / addSibling / duplicate / rename / delete / move

### UI 컴포넌트 — manual2와 1:1 매칭
- **Topbar** brand(로고 36×36 + 텍스트) / sep / 빵부스러기 / nav-btn 4개 / search / mode-switch / save-state / role-switch / avatars / icon-btn(테마) / NotificationsBell / 사용자 메뉴
- **Sidebar** sb-hd(+ 새 장 / 새로고침) / sb-search / WHAT'S NEW 카드 / 즐겨찾기 / toc / sb-add(+ 새 장 추가) / sb-footer
- **TocTree** 노드 구조 + 컨텍스트 메뉴(이름변경/자식추가/형제추가/복제/위로/아래로/삭제) + 인라인 rename
- **DocTabs** dt(status-dot, pin, dirty, x) / dt-add(+) / dt-stat(탭 관리 popover)
- **WorkflowStrip** 4단계 동그라미+선 + 이전/다음 액션
- **Main pane**: doc-head(tag-row + h1 + sub) + DocumentEditor + bottomSlot
- **DocumentEditor** ✨ contenteditable + execCommand (Tiptap 제거 완료)
  - 7그룹 툴바: undo·redo / 본문~제목3 / B·I·U·S / 글자색·형광펜(6색 팔레트) / 목록 / 정렬 / 삽입(표·이미지·콜아웃·코드·스크립트·분기·임베드·구분선·링크) / 도구(찾기·PDF·인쇄)
  - **콜아웃 6종 드롭다운**: 정보·성공·주의·위험·팁·예시
  - **표 삽입 모달** (행 1~12 / 열 1~8 + 라이브 미리보기)
  - **표 셀 플로팅 툴바** (TableEditorOverlay): 행/열 추가, 셀 병합/분할, 정렬, 삭제
  - **멘션 @ 팝오버**: 멤버 필터링 + 키보드 nav + 자동완성
  - 찾기·바꾸기 + Cmd+F
  - 위젯 hydration (스크립트 카드 변수·결정 트리 분기·체크리스트·임베드)
- **RightPanel** 3탭(아웃라인/댓글/히스토리)
  - **AI 요약 카드** (보라 그라데이션, 3상태: idle/loading/done)
  - **관련 응대 사례** 카드
  - **첨부 파일** (드롭존 + 6 file-ico 타입 + uploading 진행률 + 다운로드/삭제)
  - 태그 칩 + 라이브 아웃라인
  - 댓글 컴포저(+점선 박스), 히스토리 점선
- **PDF Viewer** 썸네일 + 페이지 네비 + 줌 + 업로드
- **MustReadBar** + **FeedbackBar** (👍/👎 + note)
- **5개 뷰**: 문서 / 대시보드(compliance/analytics/verify) / 케이스 / FAQ / 온보딩 + Search palette
- **임베드 카드 hydration**: CRM 티켓, 상품 카탈로그 (3개 샘플)
- **로그인 페이지** + Auth callback

### 2026-05-21 추가
- **브랜드 로고 시각 조정**: 36×36, 그라데이션 `oklch(0.62 0.14 50)→oklch(0.42 0.13 28)`, 텍스트 17px
- **브랜드 텍스트 왼쪽 정렬**: `.brand` 버튼 기본 `text-align:center` 오버라이드
- **우측 패널 전체로 첨부 드롭 영역 확장**: window-level drag 감지 + `.attach-overlay` 점선 박스 + panel.onDrop 어디든 업로드
- **업로드 진행률 상태 상승**: `uploading` state를 RightPanel로 끌어올려 패널 드롭과 attach-zone 드롭이 동일 진행 막대 공유
- **표 셀 플로팅 툴바 위치 버그 수정**: TableEditorOverlay를 `.doc-body` 안으로 이동 (positioned ancestor 일치)
- **Server Action 본문 1MB → 10MB**: `next.config.mjs`에 `serverActions.bodySizeLimit` 설정 — 1.8MB 파일 첨부 시 undefined 반환되던 문제 해결
- **WORK_LOG.md 작성** + 메모리 정착

### 2026-05-22 추가
- **C-1 태그 편집 완료**: 우측 패널 `+ 추가` 버튼이 실제 동작
  - `lib/actions/content.ts` — `addTagAction` / `removeTagAction` (UPSERT 기반, 케이스-무시 중복 방지, MAX_TAGS=12, MAX_TAG_LEN=24, 콤마 split)
  - `lib/workbench-context.tsx` — `addTag` / `removeTag` 낙관적 업데이트 (실패 시 prev 롤백)
  - `components/shell/right-panel.tsx` — `TagsSection` 컴포넌트: `+ 추가` 클릭 → 인라인 input (Enter/콤마/blur 커밋, Esc 취소). 각 태그 칩은 viewer는 read-only, editor는 × 버튼으로 제거
  - `app/globals.css` — `.tg-removable`, `.tg-x`, `.tg-add` (dashed), `.tg-input` (focused border-accent) 스타일 추가
- **B-3 4.5MB 한계 회피 완료**: signed URL + direct-to-Storage 패턴으로 PDF/첨부/에디터이미지 모두 전환
  - `lib/actions/uploads.ts` — 통합 모듈: `createUploadSignedUrlAction(req)` (role/size/mime 검증 → signed upload URL) + `finalizeAttachmentAction` / `finalizePdfAction` / `finalizeEditorImageAction` (작은 JSON body로 DB row 생성)
  - 3군데 클라이언트 전환:
    - `workbench-context.attachPdf` / `uploadAttachment`
    - `components/pdf/pdf-viewer.tsx` (드롭존 업로드)
    - `components/editor/document-editor.tsx onDropDoc` (인라인 이미지)
  - 패턴: ① server action으로 signed URL 발급 → ② 브라우저가 supabase-js로 직접 `uploadToSignedUrl` → ③ finalize action으로 DB row 생성
  - 한계: PDF 50MB / 첨부 25MB / 에디터이미지 8MB (각 서버 검증)
  - 부수효과: multipart 안 거치니까 **한글 파일명 깨짐 자체가 사라짐** — `name` 별도 필드 트릭 불필요
  - 옛 액션 제거: `lib/actions/pdf.ts`, `lib/actions/editor-images.ts` 삭제. `attachments.ts`는 deleteAttachmentAction만 유지
  - `/api/editor-images/[...path]` 라우트는 그대로 (URL 형식 호환)
- **C-5 검증 큐 워크플로우 완료**: 재검증 버튼이 실제 동작
  - **마이그레이션 0015_verifications_writes.sql**: authenticated UPDATE/INSERT 정책. role 게이팅은 Server Action에서 (다른 액션과 동일 패턴)
  - `lib/actions/verifications.ts` — `reverifyDocumentAction`: 기존 행 있으면 `last_verified_at + verified_by`만 갱신(interval_days 보존), 없으면 default 90일로 INSERT. requires `review` 권한 (reviewer/admin)
  - `lib/workbench-context.tsx` — `reverifyDocument` 메서드. 낙관적 update (lastVerified=0 + 본인 이름) + 실패 시 prev 롤백 + 성공 토스트
  - main-pane VerifyBar 재검증 버튼: 실제 호출 + busy 상태 + 권한 없으면 disabled
  - dashboard "검증 대기열" 탭 "검증 시작" 버튼: 같은 액션 wiring + per-row pending 상태
- **A-6 verify-pill / ack-bar 완료**: 검증 상태/필독 ack 디자인 정합
  - `lib/utils.ts` — `verifyState(v)` + `verifyLabel(state, v)` 공유 (이전엔 dashboard-view 안에 inline. fresh/aging/stale 분기 기준은 일관 유지)
  - `main-pane.tsx` — tag-row에 `.verify-pill` (fresh/aging/stale) + bottomSlot에 stale 상태에서만 `.verify-bar` (재검증 안내). 재검증 버튼은 C-5에서 본격 처리 예정 (현재는 토스트로 안내)
  - `must-read-bar.tsx` — Tailwind 유틸 → manual2의 `.ack-bar` 클래스 마이그레이션. 아이콘도 inline SVG로 교체 (lucide-react 의존 제거). done 상태 시 버튼은 disabled로 표시
  - 모든 스타일은 globals.css에 이미 있던 토큰 재사용 (다크모드/stale-pulse 애니메이션 포함)
  - dashboard-view에서 verifyState 함수 재사용 (DRY)
- **C-4 페이지 통계 실시간 완료**: view/copy/search 카운트 자동 갱신
  - **마이그레이션 0014_page_stats_writes.sql**: `record_page_stat(p_doc_id, p_kind)` RPC (SECURITY DEFINER, on conflict upsert, atomic +1). authenticated에 execute 권한
  - `lib/actions/page-stats.ts` — `recordPageStatAction(documentId, kind)` fire-and-forget. unauthenticated는 silent no-op. `revalidatePath` 안 함 (메트릭이라 다음 fetch 시 자동 반영)
  - `main-pane.tsx` — activeId 변경 시 view 트래킹. 같은 doc 5분 throttle (module-level Map)
  - `document-editor.tsx` — docRef에 copy 이벤트 리스너. 빈 선택은 skip, 같은 doc 5초 throttle
  - `search-view.tsx` — 결과 클릭 시 그 문서의 search 카운트 +1 (view는 activeId 변경 → MainPane이 자동 처리)
  - 트래킹 빈도 디자인: view 5분 / copy 5초 / search throttle 없음
- **D-2 로딩 스켈레톤 완료**: `app/loading.tsx`에 셸 골격 + shimmer
  - 280px sidebar / 1fr center / 300px right panel grid 그대로
  - `.sk-bar`, `.sk-block`, `.sk-circle` primitive + linear-gradient shimmer 애니메이션 (1.5s, OKLCH 토큰 사용)
  - 다크모드는 토큰 변수가 자동 따라옴. `prefers-reduced-motion`이면 shimmer 끄고 정적 배경만
  - Next.js Suspense에 자동 hook — client navigation, page-level async에서 활성화
  - **한계**: 현재 layout.tsx가 await blocking이라 SSR 첫 페이지에선 안 보임. layout 단위 streaming(Suspense boundary 분리)은 별도 작업
- **D-3 에러 바운더리 완료**: 예상 못 한 렌더 에러에 대한 폴백 UI
  - `app/error.tsx` — layout 안쪽 폴백: 경고 아이콘 + 메시지 + digest 배지(에러 ID) + "다시 시도"(reset) / "새로고침" 버튼. manual2 디자인 토큰(panel/line/accent) 사용
  - `app/global-error.tsx` — layout 자체가 깨질 때 폴백: 자체 `<html>/<body>` + inline 스타일 (globals.css 로드 보장 안 됨)
  - `app/globals.css` — `.err-boundary`, `.eb-card`, `.eb-icon`(빨강), `.eb-digest`(mono), `.eb-btn.primary` 스타일 + 다크모드 대응
  - 토스트와 분담: 토스트는 사용자 행동 피드백(server action 실패), 에러 바운더리는 렌더 도중 throw로 페이지 자체가 못 살아나는 경우
- **E-1 Tiptap 패키지 제거 완료**: `@tiptap/*` 19개 + `tippy.js` 데드 의존성 제거
  - 코드에서는 이미 contenteditable 이행 끝, package.json만 잔류였음 (grep으로 import 0건 확인)
  - `npm install` 결과 464 → 약 200개대 패키지로 감소 (설치 시간/번들 단축)
  - README 기술 스택 섹션 갱신 (Tiptap/tippy 언급 제거, contenteditable 명시)
- **B-1 이미지 Storage 업로드 완료**: 에디터 인라인 이미지가 새로고침 후에도 유지됨
  - `lib/actions/editor-images.ts` — `uploadEditorImageAction`: `documents-attachments` 버킷 재사용, `_editor/<docId>/<uuid>.<ext>` prefix로 분리. 8MB 제한, 5종 mime 화이트리스트(png/jpeg/gif/webp/svg)
  - `app/api/editor-images/[...path]/route.ts` — 인증된 사용자만 stream. `_editor/` prefix 강제로 일반 첨부 우회 fetch 차단. 1시간 immutable 캐시
  - `components/editor/document-editor.tsx` — `onDropDoc`: blob URL 즉시 미리보기 (opacity 0.7 + data-uploading) + 백그라운드 upload → 성공 시 src 교체 + revokeObjectURL + notifyChange. 실패 시 frame 원복 + 토스트
  - 마이그레이션 불필요 (기존 버킷·RLS 재사용)
  - 알려진 제약: 업로드 중 다른 문서로 전환하면 그 이미지는 누락됨 (현재 문서의 본문 저장은 idempotent하니 다른 문서에 영향 없음)
- **D-1 토스트 알림 인프라 완료**: 모든 server action 실패가 사용자에게 노출됨
  - `lib/toast.ts` — 모듈-싱글톤 store (react-hot-toast 패턴). `toast.success/error/info` API + `toastErrorMessage(err, fallback)` 헬퍼. React 외부(catch 블록)에서도 호출 가능
  - `components/shell/toast-viewport.tsx` — 구독자 컴포넌트, 우하단 stack, 자동 dismiss + × 버튼
  - `app/providers.tsx` — ToastViewport 마운트 (WorkbenchProvider 내부)
  - `app/globals.css` — `.toast-viewport`, 3 variant (success/error/info), 다크모드 색상, slide-in 애니메이션, `prefers-reduced-motion` 대응
  - `lib/workbench-context.tsx` — 모든 catch 블록(상태 변경/댓글/즐겨찾기/필독/첨부 업로드·삭제/태그/CRUD/순서변경)에 `toast.error` 호출 추가. 자동저장(`setBody`)은 5초 throttle. `alert()` 제거 → toast로 통합
  - `components/shell/main-pane.tsx`, `right-panel.tsx` — 호출자 catch에도 토스트 추가

---

## 📋 해야 할 작업

### A. UI 디자인 격차 마무리 (manual2와 1:1)
- [ ] **A-4 챗봇 위젯** (chatbot.jsx) — 우하단 플로팅, Claude API 기반 매뉴얼 Q&A
- [ ] **A-5 알림 벨 팝오버 디테일** (.notif-pop 디자인 정합 확인)
- [x] ~~**A-6 verify-pill / ack-bar** 디자인 정합 (doc-head에 검증됨/만료임박/재검증 pill, ack-bar 별도 디자인)~~ (2026-05-22)
- [x] ~~**A-7 doc-head 첨부 pill** (.attach-pill — 첨부 개수 빠른 보기)~~ (2026-05-22) — `nodeAttachments.length > 0`일 때만 표시, 클릭 시 우측 패널 첨부 섹션(`#attachments-section`)으로 smooth scroll. `.attach-pill` 스타일은 globals.css에 이미 정의되어 있어 재사용
- [ ] **A-8 collab cursors** (시뮬레이션 원격 사용자)

### B. 에디터 추가 기능
- [x] ~~**B-1 이미지 실제 Storage 업로드** (현재 drag-drop 시 blob URL만 — Storage에 업로드 + URL 영구)~~ (2026-05-22)
- [ ] **B-2 스크립트 카드 / 결정 트리 / 임베드 편집 UI** (현재 삽입만, 콘텐츠 수정 UI 부재)
- [x] ~~**B-3 4.5MB 한계 회피 — direct-to-Storage signed URL 패턴**~~ (2026-05-22)

### C. 데이터 / 백엔드
- [x] ~~**C-1 태그 편집** (`+ 추가` 실제 동작 — document_content.tags array UPDATE)~~ (2026-05-22)
- [ ] **C-2 댓글 답글** (스레드 구조; comments에 parent_comment_id)
- [ ] **C-3 AI 요약 Claude API 연동** (현재 placeholder 시뮬레이션)
- [x] ~~**C-4 페이지 통계 실시간 추적** (view/copy/search 카운트 자동 갱신)~~ (2026-05-22) — **마이그레이션 0014 적용 필요** (SQL Editor)
- [ ] **C-4-debug 트래킹 silent fail 원인 추적**: 마이그레이션은 적용되어 SQL Editor에서 `record_page_stat(...)` 직접 호출은 정상(카운트 +1)인데, 프로덕션 클라에서 자동 트래킹은 카운트가 안 올라감. 콘솔 에러도 없고 useEffect→server action 호출 사이 어딘가에서 silent. 진단 패치(`6dcc9a3`) 시 토스트도 안 떴음 → useEffect 자체가 발동 안 하거나 fire-and-forget이 막힘. 다음 시도: server action 진입 시 `console.log` + Vercel function logs 또는 main-pane mount 자체에 진단 토스트
- [x] ~~**C-5 검증 큐 워크플로우** (재검증 시작 → last_verified_at + verified_by 갱신)~~ (2026-05-22) — **마이그레이션 0015 적용 필요**
- [ ] **C-6 What's new 자동 유도** (document_versions에서 derive)
- [ ] **C-7 풀텍스트 검색** (tsvector + pg_trgm 인덱스)

### D. UX 폴리시
- [x] ~~**D-1 토스트 알림** (저장 실패, 권한 부족, 업로드 에러 등 사용자 피드백)~~ (2026-05-22)
- [x] ~~**D-2 로딩 스켈레톤** (초기 SSR 데이터 패치 동안)~~ (2026-05-22) — `app/loading.tsx`로 셸 골격 + shimmer. Topbar/Sidebar/DocTabs/Workflow/DocHead/Body/RightPanel 모두 매칭. 한계: 현재 layout.tsx가 await blocking이라 SSR 첫 페이지에선 안 보이고, **client nav나 page-level streaming 시점**에 활성화됨. layout 단위 streaming은 별도 작업
- [x] ~~**D-3 에러 바운더리** (예상 못 한 에러 fallback)~~ (2026-05-22)
- [ ] **D-4 다크 모드 디테일 정합** (지원은 되지만 미검증 영역)

### E. 정리 (Cleanup)
- [x] ~~**E-1 Tiptap 패키지 제거** (`@tiptap/*` 19개 + tippy.js)~~ (2026-05-22)
- [x] ~~**E-2 `/api/diag` 라우트 제거** (디버그용이었음, 본인 정보만 노출되지만 운영엔 불필요)~~ (2026-05-22) — 디렉터리/파일 삭제. 0008의 `debug_auth_info()` SQL 함수도 같이 제거하려면 별도 마이그레이션 필요
- [x] ~~**E-3 사용 안 하는 imports/components 정리**~~ (2026-05-22) — TS `noUnusedLocals` 패스 통과: `defaultBody(id, label)`의 unused `id` 인자 제거 (호출자도 같이 갱신). 그 외 TS/ESLint 모두 clean
- [ ] **E-4 README 갱신** (현재 phase-7 시점 내용)

---

## 🔑 작업 시 유의사항 (재확인 사항)

1. **에디터는 Tiptap이 아닌 contenteditable + execCommand** 아키텍처 — manual2와 동일. 새 기능은 이 방향으로.
2. **한글 파일명**: 업로드 시 FormData에 `name` 필드를 별도로 보낼 것 (multipart 인코딩 한글 깨짐 회피). 다운로드는 `Content-Disposition: filename*=UTF-8''`로.
3. **manual2 디자인 1:1 매칭이 최우선** — Tailwind 유틸리티 대신 원본 styles.css 클래스 사용.
4. **인라인 SVG 우선** — lucide-react보다 manual2 icons.jsx 패턴 (svg 직접 작성)이 더 정확.
5. **마이그레이션은 사용자가 SQL Editor에서 수동 적용**. CLI 사용 안 함.
6. **Supabase project ref**: `jlaidnbcbnwjoahgpcxu`
7. **Next.js Server Action 본문 크기 제한**: 기본 1MB. `next.config.mjs`에서 `experimental.serverActions.bodySizeLimit = "10mb"` 설정해 둠. Vercel 자체 함수 한계가 **4.5MB**이므로 그 이상 파일은 direct-to-Storage signed URL 패턴 필요. 초과 시 action이 throw 없이 **undefined 반환**하므로 디버깅 어려움.
8. **`position: absolute` 오버레이는 positioned ancestor 안에 렌더**할 것. 좌표 계산 기준과 실제 absolute 기준점이 다르면 화면 엉뚱한 곳에 뜸 (TableEditorOverlay 사례).
9. **DataTransfer.types**가 일부 브라우저에서 DOMStringList일 수 있음. `.includes`가 없을 수 있으니 `Array.from(types).includes("Files")`로 정규화.

## ⚡️ 성능 (체감 느린 이유 후보)

- **Vercel ↔ Supabase 리전 불일치** 가능성 (가장 큰 단일 요인) — 둘 다 `icn1` / `ap-northeast-2`로 통일하면 호출당 100-300ms 감소
- **Server Component 워터폴 fetch** — 페이지에서 `lib/data/*` 순차 await → `Promise.all`로 병렬화
- **캐싱 0** — 정적 데이터(tree/members/cases)는 `unstable_cache`로 묶기
- **Tiptap 11개 패키지 잔류** — 클라이언트 번들 크기 증가 (E-1)
- 처방 순서: 리전 → Promise.all → unstable_cache → Tiptap 제거

---

## 🚀 다음 세션 첫 액션 후보

1. **A-4 챗봇 위젯** (manual2 chatbot.jsx 포팅) — 우하단 플로팅 widget, 매뉴얼 본문 검색 + Claude API
2. **C-1 태그 편집** (가장 자주 보이는 인터랙션 누락)
3. **B-1 이미지 Storage 업로드** (저장된 블롭이 새로고침 시 사라지는 이슈)
4. **A-6 verify-pill / ack-bar 정합**

추천 시작: **A-4 (챗봇)** 또는 **C-1 (태그 편집)**.
