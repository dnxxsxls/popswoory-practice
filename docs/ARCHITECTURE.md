# Timetable — 기술 설계

> 전제: Next.js(App Router) + TypeScript + Supabase(Postgres/Storage/Realtime) + Vercel 배포, 내부 전용, 개인정보 미수집.

---

## 1. 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Next.js 15 App Router + TypeScript | 서버 액션으로 백엔드 별도 구축 불필요, Vercel 최적 |
| DB | Supabase Postgres | 관계형 모델에 적합, 배열/JSONB/전문검색 지원 |
| 파일 | Supabase Storage (private bucket) | 서명 URL로 비공개 배포 |
| 실시간 | Supabase Realtime | 조율 화면 히트맵 동시 갱신 |
| 인증 | **자체 아이디·비밀번호 세션** — 아래 2장 | Supabase Auth는 이메일/전화 전제라 "개인정보 미수집" 요건과 충돌 |
| 스타일 | Tailwind CSS + shadcn/ui | 속도, 다크모드 |
| 상태/데이터 | 서버 컴포넌트 + 서버 액션 중심, 클라이언트는 TanStack Query 최소 사용 | 격자 편집만 클라이언트 상태 |
| 검증 | Zod (모든 서버 액션 입력) | |
| 배포 | Vercel (프로덕션 + 프리뷰) | |

**시간대는 `Asia/Seoul` 고정.** DB는 전부 `timestamptz`(UTC) 저장, 표시 시점에만 KST 변환. 슬롯 계산도 UTC 기준으로 하되 사용자 입력은 KST 로컬 날짜/시각을 변환해 받는다.

## 2. 인증 설계 (핵심 결정)

### 2.1 요구사항

개인정보(이메일·전화) 없이, 그러나 "누가 썼는지"는 구분되어야 함 → **스페이스 접근코드 + 아이디 + 비밀번호**, 공개 이름은 별도 닉네임.

### 2.2 흐름

```
/join/[slug]
  └ 접근코드 입력 ── 검증(bcrypt) ──▶ join_token 쿠키(10분, 서명)
        └ 아이디 입력
             ├ 기존 아이디 → 비밀번호 입력 → 검증
             └ 신규 아이디 → 비밀번호 2회 입력 → 닉네임 설정 → members insert
              └ 세션 발급: HttpOnly, Secure, SameSite=Lax, 30일
                 JWT(jose, HS256) payload: { mid, sid, role, ver }
```

- `ver`: 멤버 레코드의 `session_version`. 비밀번호 변경·강제 로그아웃 시 +1 하면 기존 세션 전부 무효화.
- 비밀번호 시도 제한: `login_attempts` 테이블에 (space_id, login_id) 단위 카운트, 10분 내 5회 초과 시 15분 잠금.
- 관리자는 회원 비밀번호를 임시값 `0000`으로 초기화할 수 있다. 이때도 `session_version`을 올리고, 사용자는 로그인 후 8자 이상의 비밀번호로 직접 변경한다.
- 관리자 승격은 DB에서 직접 또는 최초 생성자 자동 admin.

### 2.3 데이터 접근 경계

**모든 DB 접근은 서버(서버 컴포넌트 / 서버 액션 / route handler)에서 service role 키로 수행한다. 브라우저는 Supabase에 직접 접근하지 않는다.**

- 모든 테이블 `enable row level security` + **정책 없음**(= anon/authenticated 전면 차단). service role만 통과.
- 대신 애플리케이션 레벨 가드를 강제:
  ```ts
  // lib/auth/guard.ts
  export async function requireMember()            // 세션 검증 → { memberId, spaceId, role }
  export async function requireSpace(spaceId)      // 소속 스페이스 일치 확인
  export async function requireEventAccess(eventId)// 이벤트의 space_id == 세션 space_id
  export async function requireAdmin()
  ```
  서버 액션 첫 줄은 예외 없이 위 가드 호출. (리뷰 체크리스트 항목)
- **Realtime만 예외**: 브라우저가 구독해야 하므로 `availabilities` 테이블에 한해 anon 키 + 읽기 전용 RLS 정책을 두거나, 안전하게 가려면 서버가 폴링(3~5초) + 낙관적 UI로 대체 가능. → **MVP는 폴링, M5에서 Realtime 전환** 권장(권한 모델을 단순하게 유지).

> 대안(향후): Supabase JWT 서명키로 커스텀 토큰을 발급해 RLS를 그대로 쓰는 방식. 보안 심화가 필요해지면 이전 경로로 열어둔다.

## 3. 데이터 모델

```sql
create extension if not exists pgcrypto;

-- 스페이스(모임 그룹)
create table spaces (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  name              text not null,
  access_code_hash  text not null,
  webhook_url       text,
  created_at        timestamptz not null default now()
);

-- 멤버 (개인정보 없음: 로그인 아이디 + 비밀번호 해시 + 닉네임)
create table members (
  id               uuid primary key default gen_random_uuid(),
  space_id         uuid not null references spaces(id) on delete cascade,
  login_id         text not null,
  display_name     text not null,
  password_hash    text not null,
  role             text not null default 'member' check (role in ('admin','member')),
  color            text not null default 'slate',
  session_version  int  not null default 1,
  is_active        boolean not null default true,
  last_login_at    timestamptz,
  created_at       timestamptz not null default now()
);
create unique index members_active_login_id_idx
  on members (space_id, login_id) where is_active;
create unique index members_active_display_name_idx
  on members (space_id, display_name) where is_active;

-- 이벤트(약속 → 모임 → 기록, 하나의 개체가 상태만 바꾼다)
create table events (
  id                uuid primary key default gen_random_uuid(),
  space_id          uuid not null references spaces(id) on delete cascade,
  created_by        uuid not null references members(id),
  title             text not null,
  description       text,
  status            text not null default 'polling'
                    check (status in ('polling','confirmed','done','cancelled')),
  -- 조율 설정
  slot_minutes      int  not null default 30 check (slot_minutes in (15,30,60)),
  duration_minutes  int  not null default 120,
  candidate_dates   date[] not null default '{}',      -- KST 기준 날짜
  day_start         time not null default '09:00',
  day_end           time not null default '24:00',
  deadline          timestamptz,
  -- 확정 결과
  confirmed_start   timestamptz,
  confirmed_end     timestamptz,
  place_name        text,
  place_url         text,
  cancel_reason     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on events (space_id, status, confirmed_start desc);

-- 가능시간 (행이 없으면 = 불가/미표시)
create table availabilities (
  event_id   uuid not null references events(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  slot_start timestamptz not null,
  level      smallint not null default 1 check (level in (1,2)),  -- 1=가능, 2=선호
  primary key (event_id, member_id, slot_start)
);
create index on availabilities (event_id, slot_start);

-- 응답/참석
create table participations (
  event_id     uuid not null references events(id) on delete cascade,
  member_id    uuid not null references members(id) on delete cascade,
  is_required  boolean not null default false,
  responded_at timestamptz,          -- 가능시간 제출 시각(미응답 판별용)
  rsvp         text check (rsvp in ('going','not_going','maybe')),
  rsvp_note    text,
  attended     boolean,              -- 모임 후 실제 참석
  primary key (event_id, member_id)
);

-- 기록(후기)
create table records (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  author_id  uuid not null references members(id),
  body       text not null,
  created_at timestamptz not null default now()
);

-- 사진
create table photos (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  uploader_id  uuid not null references members(id),
  storage_path text not null,        -- private bucket 경로
  width        int, height int, bytes int,
  caption      text,
  sort_order   int not null default 0,
  is_cover     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index on photos (event_id, sort_order);

-- 정산
create table expenses (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  payer_id   uuid not null references members(id),
  title      text not null,
  amount     int not null check (amount >= 0),   -- 원 단위 정수
  created_at timestamptz not null default now()
);
create table expense_shares (
  expense_id uuid not null references expenses(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  weight     numeric not null default 1,          -- 가중 분배(기본 1/N)
  primary key (expense_id, member_id)
);

-- 태그
create table tags (
  id       uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  name     text not null,
  unique (space_id, name)
);
create table event_tags (
  event_id uuid not null references events(id) on delete cascade,
  tag_id   uuid not null references tags(id) on delete cascade,
  primary key (event_id, tag_id)
);

-- 로그인 시도 제한
create table login_attempts (
  space_id     uuid not null references spaces(id) on delete cascade,
  login_id     text not null,
  fail_count   int not null default 0,
  locked_until timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (space_id, login_id)
);

-- 활동 로그(감사/피드)
create table activities (
  id         bigserial primary key,
  space_id   uuid not null references spaces(id) on delete cascade,
  event_id   uuid references events(id) on delete cascade,
  actor_id   uuid references members(id),
  kind       text not null,   -- event.created / availability.saved / event.confirmed / photo.added ...
  payload    jsonb,
  created_at timestamptz not null default now()
);

-- 전문검색(P1): 제목 + 후기
alter table events add column search_tsv tsvector
  generated always as (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))) stored;
create index on events using gin (search_tsv);
```

**모든 테이블에 `alter table X enable row level security;` 적용, 정책은 만들지 않는다(서버 전용 접근).**

## 4. 슬롯/추천 계산

```ts
// 슬롯 생성: candidate_dates × [day_start, day_end) 를 slot_minutes 로 분할 (KST → UTC)
// 응답 집계
type SlotScore = { start: Date; score: number; availableIds: string[]; missingIds: string[] };

const W = { 1: 1.0, 2: 1.4 };            // 가능 / 선호
const R = (required: boolean) => required ? 2.0 : 1.0;

// 윈도우 합산: duration_minutes / slot_minutes 개의 연속 슬롯
// 단, 윈도우는 같은 날짜(KST) 안에서만 구성
// 정렬: score desc → missing.length asc → start asc, 상위 3개
```

- 응답자 0명이면 추천 숨김.
- 필수 참석자가 한 명이라도 빠지는 윈도우는 "⚠️ 필수 참석자 불참" 배지를 달아 하위로 내린다(제외하지는 않음).
- 계산은 서버 컴포넌트에서 수행(응답 규모가 작아 인메모리로 충분: 30명 × 14일 × 30개 슬롯 ≈ 12,600행 상한).

## 5. 사진 업로드 파이프라인

```
클라이언트: 파일 선택 → canvas 리사이즈(장변 1600px, webp q0.82) → 서버 액션에 요청
서버: requireEventAccess → storage 서명 업로드 URL 발급 (path: {space_id}/{event_id}/{uuid}.webp)
클라이언트: 서명 URL로 직접 PUT
서버: photos insert (width/height/bytes)
조회: 서버에서 createSignedUrl(600초) 발급 후 <Image>에 전달. 공개 URL 미사용.
```
- 원본 미보관(용량), EXIF는 리사이즈 과정에서 제거(위치정보 유출 방지).
- 업로드 상한: 1회 20장, 장당 5MB(리사이즈 후).

## 6. 폴더 구조

```
app/
  (auth)/join/[slug]/page.tsx
  (app)/page.tsx                     # 홈
  (app)/events/new/page.tsx
  (app)/events/[id]/page.tsx         # 상태에 따라 조율/확정 뷰 분기
  (app)/events/[id]/record/page.tsx
  (app)/archive/page.tsx
  (app)/archive/[id]/page.tsx
  (app)/members/page.tsx
  (app)/settings/page.tsx
  api/photos/sign/route.ts
components/
  availability-grid/                 # 격자 입력 + 히트맵 (핵심 컴포넌트)
  event/  archive/  ui/
lib/
  auth/{session.ts,guard.ts,pin.ts}
  db/{client.ts,queries/*.ts}
  slots/{generate.ts,score.ts}
  time.ts                            # KST 변환 유틸 (모든 날짜 처리는 여기 경유)
actions/                             # 서버 액션 (Zod 스키마 + 가드 필수)
supabase/migrations/
docs/{PRD.md,ARCHITECTURE.md}
```

## 7. 환경 변수

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=      # 서버 전용, 절대 NEXT_PUBLIC_ 금지
SESSION_SECRET=                 # jose HS256 서명키 (32바이트+)
NEXT_PUBLIC_SITE_URL=
```
프리뷰/프로덕션 Supabase 프로젝트를 분리(프리뷰에서 실데이터 접근 차단).

## 8. 개발 순서 (구현 체크리스트)

1. `create-next-app` + Tailwind + shadcn/ui, Vercel 연결, Supabase 프로젝트 2개(dev/prod)
2. 마이그레이션 1: spaces/members/login_attempts → 아이디·비밀번호 로그인 + 세션 + 가드 헬퍼
3. **AvailabilityGrid 프로토타입 단독 페이지**(더미 데이터, 실기기 터치 검증) ← 리스크 선제거
4. 마이그레이션 2: events/availabilities/participations → 생성 위저드, 응답 저장, 히트맵
5. 추천 계산 + 확정 플로우 + .ics
6. 홈 대시보드(응답 필요 / 다가오는 / 기록 대기)
7. 마이그레이션 3: records/photos → 참석 체크, 업로드, 타임라인
8. 마이그레이션 4: expenses/tags → 정산, 검색
9. 알림(웹훅 → 웹푸시), 통계, robots/noindex, 백업 정책
