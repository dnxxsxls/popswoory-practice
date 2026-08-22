# Timetable

약속시간 조율 + 모임 아카이빙 웹앱 (내부 전용, 모바일 웹 중심).

**언제 만날지 정하고, 만난 걸 남긴다.**
시간표를 가입할 때 한 번 등록해두면, 이후 모든 약속에 자동 반영된다.

## 실행

```bash
npm run dev
```

데이터는 `.data/` 폴더에 저장된다 (JSON + 업로드 이미지, git 제외).
`.data/` 를 지우면 완전히 초기화된다.

**시간표 자동 분석을 쓰려면** 이 머신에 클로드 계정 로그인이 필요하다 (API 키 아님):

```bash
npm run claude:login
```

```bash
npm run claude:status
```

로그인이 없어도 앱은 정상 동작하며, 검토 화면에서 "직접 입력"으로 넘어간다.

## 지금까지 만든 것 (v1 - 1단계)

| 화면 | 경로 | 상태 |
|---|---|---|
| 가입 / 로그인 | `/join` | ✅ 이름 + PIN 4자리 |
| 시간표 등록 (온보딩) | `/onboarding/timetable` | ✅ 업로드 → 크롭 → 저장 |
| 시간표 확인·수정 | `/timetable/review` | ✅ 자동 분석 → 격자 미리보기 → 수정 → 확정 |
| 홈 | `/` | ✅ 내 등록 상태 + 모임 등록 현황 |
| 내 시간표 | `/timetable` | ✅ 주간 격자 / 수정 / 새로 올리기 |
| 우리 공강표 | `/free` | ✅ 전원 겹치는 공강 계산 + 히트맵 |
| 멤버 | `/members` | ✅ 목록 + 등록 여부 |
| 약속 잡기 | — | ⬜ 다음 단계 |

### 시간표 자동 분석

업로드한 이미지에서 수업 블록(`요일 / 시작 / 종료 / 과목명`)을 추출한다 (`lib/vision.ts`).

**Claude Agent SDK** 를 쓴다. 별도의 API 키 결제 없이 이 머신에 로그인된 클로드 계정(구독)을
그대로 사용한다. 에이전트가 Read 툴로 이미지 파일을 직접 열어 보고 JSON 을 돌려준다.

> ⚠️ **이 방식은 앱이 그 로그인이 있는 머신에서 돌아야 한다.** Vercel 같은 호스팅에서는
> 동작하지 않는다 — 자동 분석을 쓰려면 맥미니 등에서 상시 구동해야 한다.

**결과는 반드시 사람이 검토한 뒤 저장된다.** 모델은 확률적이라 경계를 틀리는 경우가 있어,
`/timetable/review` 에서 원본과 나란히 비교하고 수정한 다음 확정한다. 불확실한 블록은
`confidence: low` 로 표시되어 노란 테두리가 붙는다. 서버에서도 범위·순서·길이를 재검증한다.

이미지는 분석에 쓰인 뒤 `.data/uploads/` 에 남는다 — 재분석과 검토 시 대조용.

에브리타임 시간표는 거의 항상 30분 단위이므로, 추출 결과를 30분 경계로 스냅한다.
과목명·분 단위 정밀도보다 **"언제 막혀 있는가"** 가 맞는 것이 중요하다.

## 외부에서 접속하기 (자체 호스팅)

유료 서비스 없이 이 머신에서 돌리고 공개 https 주소를 받는다.
**Vercel 같은 서버리스에는 올릴 수 없다** — 자동 분석이 이 머신의 클로드 로그인을 쓰고,
데이터도 로컬 파일에 저장하기 때문이다.

주소는 **Tailscale Funnel** 로 고정한다.

```
https://popswoory.drum-aldebaran.ts.net
```

앞부분 `popswoory` 는 기기 이름, 뒷부분은 타넷 이름이다. 둘 다 계정에 묶여 있어
맥미니를 재부팅해도 주소가 바뀌지 않는다. Cloudflare 로 고정 주소를 만들려면
도메인을 사야 해서 이쪽을 택했다 — Funnel 은 무료다.

### 처음 한 번만

```bash
brew install tailscale
sudo brew services start tailscale
sudo tailscale up --hostname=popswoory --operator=$USER
npm run build && npm run tunnel
```

`npm run tunnel` 은 3100 포트를 여는 설정을 tailscaled 에 저장한다. 상시 떠 있는
명령이 아니라 한 번만 돌리면 되고, 재부팅해도 유지된다. 중간에 관리 콘솔에서
Funnel 과 HTTPS 인증서를 켜라는 링크가 뜨면 눌러줘야 한다.

앱 서버는 로그인할 때 자동으로 뜬다.

```bash
cp deploy/com.popswoory.serve.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.popswoory.serve.plist
```

### 알아둘 것

- 이 맥이 켜져 있어야 하고, **절전에 들어가면 끊긴다** (시스템 설정에서 잠자기 해제)
- LaunchAgent 는 로그인할 때 뜬다. 재부팅 후 저절로 복구되게 하려면 자동 로그인을 켜둘 것
- 코드를 고쳤으면 `npm run build` 후
  `launchctl kickstart -k gui/$(id -u)/com.popswoory.serve`
- Funnel 이 공개할 수 있는 포트는 443 / 8443 / 10000 뿐이다. 3100 은 그 뒤로 프록시된다
- 로그는 `~/Library/Logs/popswoory-serve.log`
- 주소를 아는 사람은 가입 화면까지 들어올 수 있으니 링크는 모임 내부에만 공유할 것
- 공개를 끄려면 `npm run tunnel:off`

세션 쿠키의 `Secure` 는 요청이 https 일 때만 켜진다(`lib/session.ts`).
평문 http 로 자체 호스팅할 때 로그인이 조용히 실패하는 것을 막기 위해서다.

## 문서

- **[확정 스코프 v1](docs/SCOPE-v1.md)** — 8명 / 2개월 기준으로 실제 만들 것. 로드맵은 이 문서가 우선.
- [기획서 (PRD)](docs/PRD.md) — 문제 정의, 플로우, 기능 명세
- [기술 설계](docs/ARCHITECTURE.md) — 인증 모델, 데이터 모델, 구현 순서
- [시간표 이미지 임포트](docs/FEATURE-timetable-import.md) — VLM 분석 설계 (미구현)

## 원칙

1. 하나의 `Event`가 `polling → confirmed → done` 상태만 바꾸며 끝까지 산다.
2. 개인정보를 수집하지 않는다 — 식별은 `표시명 + PIN`뿐.
3. 시간표는 가입할 때 한 번만 등록하고, 이후 모든 약속에 자동 반영된다.
4. 전원 공강 시간대를 자동으로 계산해 후보로 제시한다.
5. 단, 시간표는 "불가"만 만든다. "가능"은 사람만 만들 수 있다.

## 구조

```
app/            화면 + API 라우트
  join/         가입·로그인
  onboarding/   시간표 등록 (가입 3단계)
  timetable/    내 시간표
  members/      멤버
  api/timetable 업로드 / 이미지 서빙(본인만)
actions/        서버 액션 (인증)
components/     UI
lib/
  store.ts      ★ 로컬 파일 저장소 — 나중에 Supabase 로 바꿀 때 이 파일만 교체
  vision.ts     Claude Agent SDK 로 이미지 분석 (JSON 추출 + 서버 검증)
  free-time.ts  전원 공강 계산 (30분 슬롯 교집합)
  session.ts    JWT 세션 쿠키
  guard.ts      requireMember() — 보호 페이지/액션의 첫 줄
docs/db/        Supabase 전환용 스키마 SQL (아직 미사용)
```

## 스택

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · 로컬 파일 저장소 · Claude Agent SDK

## 규모

이용자 7~8명, 운영 1~2개월, 확장 계획 없음 → [SCOPE-v1.md §1](docs/SCOPE-v1.md)
