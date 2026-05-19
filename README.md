# Manual Workbench

콜센터·CS팀을 위한 SaaS 형태의 업무 매뉴얼 저작·열람 시스템.
`design_handoff_manual_workbench/` 디자인 프로토타입을 Next.js 14 + TypeScript + Tailwind 위에 재구현한 결과물입니다.

## 시작하기

개발 서버를 실행합니다.

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3017](http://localhost:3017) 을 엽니다.

> 같은 머신에서 `presenter-saas`(3000번)와 함께 띄울 수 있도록 로컬 포트는 3017에 고정되어 있습니다. 변경하려면 `package.json`의 `dev` 스크립트의 `-p` 옵션을 수정하세요.

## 기술 스택

- Next.js 14 (App Router) · TypeScript · Tailwind 3.4
- next-themes (light/dark, `data-theme` 속성)
- Tiptap 3.23 (StarterKit + Underline + Link + Image + Table + TextStyle + Color + Highlight + TextAlign + Placeholder + TaskList + Mention + 자체 SearchReplace)
- tippy.js (Mention suggestion 팝오버)
- pdfjs-dist 5.7 (PDF 인라인 렌더, CDN worker)
- lucide-react (아이콘)
- Pretendard / Inter / JetBrains Mono (CDN)

## 구현된 Phase

| Phase | 범위 |
|---|---|
| 1 | 디자인 토큰, 3패널 셸, TOC 트리, Tiptap 최소 통합 |
| 2 | 편집기 툴바, 표 편집, 본문 내 찾기/바꾸기(⌘F) |
| 3 | 다중 도큐먼트 탭, ⌘K 빠른 점프, 전체 검색 결과 페이지 |
| 4 | 승인 워크플로우(역할 권한), 댓글·@멘션, 자동 저장, 버전 히스토리 |
| 5 | PDF 인라인 뷰어(업로드/줌), 필독 확인 바, 즐겨찾기, What's new 알림 |
| 6 | 관리 대시보드(필독/분석/검증), 응대 사례 라이브러리+상세 모달, 신입 온보딩(읽기/퀴즈/실습) |

남은 Phase 7~8(AI 자동 요약·FAQ 매핑·챗봇 / CRM·상품 임베드·실시간 협업 커서)은 미구현.

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
├── app/                # Next.js App Router (layout, providers, page, globals)
├── components/
│   ├── editor/         # Tiptap 통합 + 툴바 + 찾기/바꾸기 + 멘션
│   ├── pdf/            # pdfjs-dist 기반 인라인 뷰어
│   ├── shell/          # Topbar / Sidebar / DocTabs / MainPane / RightPanel / 팔레트 등
│   ├── toc/            # TOC 트리
│   └── views/          # 대시보드 / 사례 / 온보딩
└── lib/                # 타입, i18n, 샘플 데이터, 워크벤치 컨텍스트, utils
```

## 빌드·린트

```bash
npm run build
npm run lint
```

## 참고 자료

- `../design_handoff_manual_workbench/README.md` — 디자인 핸드오프 원본(인계 문서, 디자인 토큰 상세, 인터랙션 명세)
- `../design_handoff_manual_workbench/index.html` — 정적 서버로 직접 열어 프로토타입 동작을 확인 가능
