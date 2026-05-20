# Supabase 연동 셋업

## 1. Supabase 프로젝트 생성

1. https://supabase.com/dashboard 접속 (이미 로그인되어 있다고 가정)
2. **New project** 클릭
3. 다음 항목 입력:
   - **Name**: `manual-workbench` (자유)
   - **Database Password**: 강력한 비밀번호 (1Password 등에 저장)
   - **Region**: 한국 사용자가 주 타겟이면 `Northeast Asia (Seoul)`
   - **Plan**: 구독 중인 플랜
4. 생성 완료까지 1~2분 대기

## 2. 키 복사

프로젝트 대시보드 → **Project Settings → API** 에서 다음을 복사:

| 표시 이름 | 환경변수 이름 |
| --- | --- |
| `Project URL` | `NEXT_PUBLIC_SUPABASE_URL` |
| `Project API keys > anon public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `Project API keys > service_role` ⚠ secret | `SUPABASE_SERVICE_ROLE_KEY` |

`.env.local.example` 을 `.env.local` 로 복사하고 값을 채워 넣습니다:

```bash
cp .env.local.example .env.local
# 에디터로 값 채우기
```

`.env.local` 은 git에서 자동 제외되어 있습니다.

## 3. 패키지 설치

```bash
npm install @supabase/supabase-js @supabase/ssr
```

## 4. 스키마 적용

두 가지 방법 중 편한 쪽:

### A. Supabase Studio SQL Editor (간단)

다음 3개를 **순서대로** 각각 새 query에 붙여넣고 **Run**:

1. `supabase/migrations/0001_init.sql` — 핵심 테이블/enum/트리거
2. `supabase/migrations/0002_profiles_decouple.sql` — profiles를 auth.users와 분리
3. `supabase/migrations/0003_temp_read_policies.sql` — anon이 읽기 가능하도록 임시 정책 (Auth 단계에서 교체)
4. `supabase/migrations/0004_smart_updated_at.sql` — explicit updated_at 보존되도록 트리거 보정
5. `supabase/seed.sql` — 데모 데이터 (8 profiles, 35 documents, ...). updated_at 보정을 위해 한 번 더 실행 필요
6. `supabase/migrations/0005_auth_setup.sql` — 신규 사용자 가입 시 profile 자동 생성 + authenticated 전용 read 정책

각 단계마다 `Success. No rows returned` 메시지를 확인하세요.

선택: `supabase/verify.sql` 실행 → row count 검증.

### B. Supabase CLI (권장 — 마이그레이션 버전 관리)

```bash
# 1) CLI 설치 (한 번만)
brew install supabase/tap/supabase

# 2) 프로젝트 링크 (한 번만)
cd /Users/mjbae/Project/Manual/app
supabase login
supabase link --project-ref YOUR-PROJECT-REF  # URL에서 추출

# 3) 마이그레이션 적용
supabase db push

# 4) 데모 데이터 시드 (한 번만)
supabase db reset --linked --no-seed=false   # 또는 SQL Editor에서 seed.sql 직접 실행
```

## 5. 동작 확인

```bash
npm run dev
```

http://localhost:3100 접속. 미들웨어가 떠도 기존 UI는 mock 데이터를 그대로 사용하므로 화면 변화는 없습니다.

브라우저 콘솔에서 에러가 없는지, 환경변수가 누락되지 않았는지 확인:

```js
// 개발자도구 콘솔에서
fetch('/').then(r => console.log('OK', r.status))
```

## 6. Auth 셋업 (Magic Link + Google OAuth)

### A. Auth Redirect URLs 등록

Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3100` (배포 후엔 운영 도메인으로 교체)
- **Redirect URLs** (Allow list)에 추가:
  - `http://localhost:3100/auth/callback`
  - 운영 배포 후 `https://<your-domain>/auth/callback`

저장.

### B. Email (Magic Link) 활성화

Supabase Dashboard → **Authentication → Providers → Email**:

- **Enable Email provider** ON
- **Confirm email** 토글은 기호대로 (체크하면 가입 시 확인 메일 추가로 발송)
- **Save**

기본적으로 Supabase가 자체 SMTP로 보냅니다. 운영에선 **Authentication → Email Templates** 에서 발신자/링크 디자인을 커스터마이즈하거나, **Authentication → SMTP Settings** 로 자체 SMTP 사용.

### C. Google OAuth 설정

#### C-1. Google Cloud Console에서 OAuth 클라이언트 발급

1. https://console.cloud.google.com/ 접속, 프로젝트 생성/선택
2. **APIs & Services → OAuth consent screen** → External, 앱 정보 입력 (테스트 단계면 Testing 모드 + 본인 이메일 Test users 추가)
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins**: `http://localhost:3100`, (배포 도메인)
   - **Authorized redirect URIs**: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
     (Supabase 콜백 — 자체 도메인 아님에 주의)
4. **Create** → Client ID / Client Secret 복사

#### C-2. Supabase에 등록

Supabase Dashboard → **Authentication → Providers → Google**:

- **Enable Sign in with Google** ON
- **Client ID (for OAuth)**: 위에서 복사한 값
- **Client Secret (for OAuth)**: 위에서 복사한 값
- **Save**

### D. 동작 확인

1. `npm run dev`
2. http://localhost:3100 → 자동으로 `/login` 리다이렉트
3. 이메일 입력 → 매직 링크 메일 수신 → 클릭 → 로그인 완료
4. 또는 Google로 로그인 → 동의 화면 → 콜백 → 로그인 완료
5. 가입 직후 DB의 `profiles` 테이블에 자동 생성된 row 확인:
   ```sql
   select id, auth_user_id, name, role from profiles where auth_user_id is not null;
   ```

## 다음 단계 (이 단계 완료 후)

- **쓰기 경로** — Server Actions로 댓글/필독 확인/즐겨찾기 등을 DB에 반영
- **Storage** — Supabase Storage에 PDF 업로드/조회
- **검색 인덱싱** — Postgres `tsvector` + 트라이그램으로 본문 전문 검색

## 비용/한도 참고

- **Database**: Pro 플랜 기본 8GB 디스크. 매뉴얼 본문 텍스트 + 메타데이터는 매우 작음. 여유.
- **Storage**: PDF 파일 사이즈에 따라. 14페이지 정도면 1MB 내외, 100개 매뉴얼 PDF여도 100MB 수준.
- **Auth**: MAU 기반 — 사내 사용자 수만큼.
