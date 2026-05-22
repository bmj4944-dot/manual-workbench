# Manual Workbench

콜센터·CS팀을 위한 SaaS 형태의 업무 매뉴얼 저작·열람 시스템. `design_handoff_manual_workbench/` 디자인 프로토타입을 Next.js 14 + Supabase 위에 재구현한 결과물입니다.

배포: <https://manual-workbench.vercel.app>

## 시작하기

```bash
npm install
cp .env.local.example .env.local   # Supabase 키 채우기
npm run dev
```

브라우저에서 <http://localhost:3100> 을 엽니다.

> 같은 머신에서 `presenter-saas`(3000번)와 함께 띄울 수 있도록 로컬 포트는 3100에 고정되어 있습니다. 변경하려면 `package.json`의 `dev` 스크립트의 `-p` 옵션을 수정하세요.

### 환경 변수

`.env.local` 필수 항목 (Supabase Project Settings > API에서 복사):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...      # 서버 전용, 클라이언트 노출 금지
```

### Supabase 마이그레이션

`supabase/migrations/0001~0015_*.sql`을 순서대로 **SQL Editor에서 수동 실행**합니다. (Supabase CLI는 사용하지 않습니다.)

요약:

- 0001: 14개 테이블 + 트리거
- 0002~0009: 인증 / RLS / 프로필 자동 생성
- 0010: 본문·워크플로우 쓰기 정책
- 0011~0012: Storage 버킷 (`documents-pdf`, `documents-attachments`) + 첨부 테이블
- 0013: 문서 트리 CRUD 권한
- 0014: 페이지 통계 RPC (`record_page_stat`)
- 0015: 검증(verifications) 쓰기 정책

## 기술 스택

- **Next.js 14** (App Router) · **TypeScript** · **Tailwind 3.4**
- **Supabase** (Postgres + Auth + Storage) — 14개 테이블 + RLS, Magic Link / Google OAuth
- **에디터**: `contenteditable` + `execCommand` 자체 구현 (manual2 디자인과 1:1 매칭). 표 편집, 멘션 팝오버, 찾기/바꾸기, 콜아웃, 스크립트 카드, 결정 트리, 임베드 카드 모두 자체 컴포넌트
- **pdfjs-dist 5.7** (PDF 인라인 렌더, CDN worker)
- **next-themes** (light/dark, `data-theme`)
- **lucide-react** (아이콘)
- **Pretendard / Inter / JetBrains Mono** (CDN)

## 구현된 범위

### 셸 / 뷰

- 3패널 레이아웃 (사이드바 280 / 메인 / 우측 패널 300)
- 5개 뷰: 문서 · 전체 검색 · 관리 대시보드(필독/사용 분석/정기 검증) · 응대 사례 · 신입 온보딩
- TOC 트리 + 컨텍스트 메뉴(이름변경/자식추가/형제추가/복제/이동/삭제) + 인라인 rename
- 다중 도큐먼트 탭(고정·dirty·status-dot) + ⌘K 빠른 이동 팔레트
- 빵부스러기 / 모드 스위치(편집/읽기) / 역할 스위치(admin/reviewer/editor/viewer)
- 즐겨찾기 / What's New 카드 / 알림 벨

### 에디터

- 7그룹 툴바: undo·redo / 본문~제목3 / B·I·U·S / 글자색·형광펜 / 목록 / 정렬 / 삽입(표·이미지·콜아웃·코드·스크립트카드·결정트리·임베드·구분선·링크) / 도구(찾기·PDF·인쇄)
- 표 삽입 모달 + 표 셀 플로팅 툴바(행/열 추가, 셀 병합/분할, 정렬, 삭제)
- 콜아웃 6종(정보·성공·주의·위험·팁·예시) 드롭다운
- @멘션 팝오버 (멤버 필터링 + 키보드 nav)
- 찾기/바꾸기 (⌘F)
- 위젯 hydration (스크립트 카드 변수·결정 트리 분기·체크리스트·임베드 카드)

### 문서 본문 / 우측 패널

- **doc-head**: status pill, 검증 상태 pill(검증 완료/만료 임박/재검증 필요), 태그, 첨부 개수 pill, 즐겨찾기, PDF 첨부 버튼
- **본문 하단**: 재검증 안내 바(stale 시) + 필독 확인 바 + 피드백 바(👍/👎)
- **우측 패널 3탭**: 아웃라인(AI 요약 카드·관련 사례·첨부·태그 편집·라이브 아웃라인) / 댓글 / 히스토리
- **첨부**: 우측 패널 어디든 드롭 가능 + 진행률 + 6 file-ico 타입 + 다운로드/삭제. 한글 파일명 보존
- **인라인 이미지**: 본문 이미지 drag-drop → Supabase Storage에 영구 업로드(blob URL이 새로고침 시 사라지던 버그 해결)

### 워크플로우 / 데이터

- 4단계 승인 워크플로우 (초안 → 검토중 → 승인 → 공개) + 역할 권한 게이팅 + 자동 버전 스냅샷
- 자동 저장 + 버전 히스토리 (restore 가능)
- 검증 큐 워크플로우: 재검증 클릭 시 `last_verified_at + verified_by` 갱신 (reviewer/admin)
- 페이지 통계 실시간 트래킹: view / copy / search 카운트 (RPC)
- 필독 ack / 즐겨찾기 / What's New

### UX 폴리시

- **토스트** (`lib/toast.ts`): 모듈-싱글톤 store, 모든 server action 실패가 사용자에게 노출됨
- **에러 바운더리** (`app/error.tsx`, `app/global-error.tsx`): 렌더 에러 폴백
- **로딩 스켈레톤** (`app/loading.tsx`): manual2 셸 골격 + shimmer
- **다크 모드**: OKLCH 토큰 기반, `prefers-reduced-motion` 대응

## 업로드 패턴

큰 파일(PDF/이미지) 업로드는 Vercel function payload cap(4.5MB) 우회를 위해 **direct-to-Storage signed URL** 패턴을 씁니다.

1. 클라이언트가 `createUploadSignedUrlAction(kind, …)` 호출 → 서버가 role/size/mime 검증 후 signed URL 발급
2. 브라우저가 supabase-js의 `uploadToSignedUrl`로 Storage에 직접 PUT
3. `finalize*Action`이 DB row 생성

한계: PDF 50MB / 첨부 25MB / 에디터 이미지 8MB.

## 주요 키보드 단축

| 키 | 동작 |
|---|---|
| `⌘K` / `Ctrl+K` / `/` | 빠른 이동 팔레트 |
| `⌘F` / `Ctrl+F` | 본문 내 찾기/바꾸기 |
| `⌘W` / `Ctrl+W` | 활성 탭 닫기 (고정 탭 제외) |
| `Esc` | 팔레트·찾기 바·search 뷰 닫기 |

`/` 단축은 입력 요소가 포커스된 상태에서는 무시됩니다.

## 디렉토리

```
app/
├── app/                  # Next.js App Router
│   ├── api/              # editor-images, attachments, pdf 다운로드 라우트
│   ├── error.tsx, global-error.tsx, loading.tsx
│   ├── layout.tsx        # 초기 데이터 fetch
│   ├── providers.tsx     # Workbench + Toast Provider
│   └── login/            # Magic Link / OAuth
├── components/
│   ├── editor/           # contenteditable 에디터, 표 오버레이, 위젯 hydration
│   ├── pdf/              # pdfjs-dist 인라인 뷰어
│   ├── shell/            # Topbar, Sidebar, DocTabs, MainPane, RightPanel, 팔레트, 토스트, ack-bar 등
│   ├── toc/              # TOC 트리
│   └── views/            # 대시보드, 사례, FAQ, 온보딩
├── lib/
│   ├── actions/          # server actions (uploads, comments, favorites, content, workflow, ...)
│   ├── data/             # SSR 데이터 fetch (documents, content, cases, insights, ...)
│   ├── supabase/         # 브라우저/서버 클라이언트
│   ├── toast.ts          # 모듈-싱글톤 토스트 스토어
│   ├── utils.ts          # cn, verifyState, verifyLabel
│   └── workbench-context.tsx  # 모든 상태 + 낙관적 업데이트
└── supabase/
    └── migrations/       # 0001~0015 SQL (SQL Editor에서 수동 적용)
```

## 빌드·린트

```bash
npm run build
npm run lint
```

## 참고 자료

- `../design_handoff_manual_workbench/README.md` — 디자인 핸드오프 원본
- `../design_handoff_manual_workbench/index.html` — 정적 프로토타입
- `WORK_LOG.md` — 작업 이력 / 남은 todo / 알려진 제약
