# 기능 설계 — 시간표 이미지로 불가 시간 자동 채우기

> 에브리타임 등 대학 시간표 스크린샷을 올리면 수업 시간을 추출해 "불가 시간"으로 자동 반영한다.
> 관련: [PRD.md](PRD.md) §6.2, [ARCHITECTURE.md](ARCHITECTURE.md) §3

---

## 1. 왜 이 기능이 중요한가

현재 설계의 가장 큰 마찰은 **"격자를 처음부터 칠하는 것"** 이다. 대학생 대상이라면 불가 시간의 70~80%는 이미 시간표로 확정되어 있고, 그걸 매번 손으로 다시 칠하는 셈이다.

- 응답 소요시간 목표(60초) → 실질 20초로 단축
- 학기 중 **한 번만** 올리면 이후 모든 이벤트에 자동 적용
- 파생 효과: 이벤트 생성 시 "전원 수업 없는 시간대"를 후보 범위로 **선제안** 가능 (아무도 응답하기 전에 초안이 나온다)

## 2. 설계 결정 3가지 (가장 중요)

### 결정 1 — 이벤트 단위가 아니라 **멤버 단위 반복 일정**으로 모델링한다

시간표는 특정 약속에 대한 응답이 아니라 **학기 내내 유효한 주간 반복 제약**이다. `이벤트 → 이미지 업로드`로 붙이면 매 이벤트마다 다시 올려야 한다.
→ `member_schedules`(학기 단위 고정 일정)를 별도 개체로 두고, 모든 이벤트가 이를 참조한다.

### 결정 2 — 시간표는 **"불가 마스크"로만** 쓴다. 역방향(자동 가능 표시)은 금지

"수업이 없다 = 만날 수 있다"는 **거짓**이다. 통학, 알바, 과제, 식사, 그냥 쉬고 싶음이 전부 빠져 있다. 자동으로 가능 칠을 해버리면 본인 의사와 다른 시간에 약속이 잡히고, 그 순간 이 서비스의 신뢰가 무너진다.

```
✅ 시간표 → 해당 슬롯 "불가"로 잠금 (회색 빗금, 선택 불가)
❌ 시간표 → 나머지 슬롯 "가능"으로 자동 칠하기
```

사용자는 **잠기지 않은 나머지 시간 안에서** 가능 시간을 고른다. 잠금은 슬롯 탭으로 개별 해제 가능("수업 빠져도 됨").

### 결정 3 — 추출 결과는 **반드시 검토 화면**을 거친다. 자동 확정 없음

추출 → 격자 위 미리보기 오버레이 → 드래그로 수정/삭제/추가 → [적용].
이렇게 하면 **인식 정확도가 100%일 필요가 없어진다.** 90%만 맞아도 사용자가 2~3블록 고치는 게 처음부터 칠하는 것보다 훨씬 빠르다. 이 검토 단계를 생략하면 "잘못 인식된 불가 시간" 때문에 오히려 약속이 안 잡히는 최악의 실패 모드가 열린다.

## 3. 추출 방식 비교

| 방식 | 정확도 | 개발 | 외부 전송 | 유지보수 |
|---|---|---|---|---|
| **A. VLM (Claude vision + Structured Outputs)** | 높음 (레이아웃 변형·다크모드·해상도에 강함) | **0.5~1일** | 있음 (이미지가 Anthropic API로 나감) | 거의 없음 |
| B. 로컬 CV (격자·색블록 검출 + 축 OCR) | 중간 (에브리타임 UI 변경·크롭·회전에 취약) | 3~5일 | **없음** | 높음 (앱 업데이트마다 깨짐) |
| C. 에브리타임 계정/공유링크 파싱 | — | — | — | **채택 불가** |

**C를 배제하는 이유**: 공식 API가 없고, 계정 정보를 받는 건 "개인정보 미수집" 원칙과 정면 충돌하며, 비공식 크롤링은 ToS·차단 리스크가 있다. 이미지 업로드가 정공법이다.

**권장: A(VLM)로 시작.** B는 정확도가 A보다 낮으면서 개발·유지보수 비용이 5배다. 다만 A는 "이미지 외부 전송"이라는 대가가 있으므로 §6의 프라이버시 처리를 반드시 함께 구현한다.

> B가 유일하게 유리한 지점은 "외부 전송 0". 만약 이 원칙을 절대 양보할 수 없다면 B로 가되, **축 보정을 OCR로 풀지 말고 사용자에게 "첫 행 = 09시" 슬라이더로 확인받는 것**이 정확도·공수 모두에서 낫다.

## 4. 구현 (방식 A)

### 4.1 파이프라인

```
[클라이언트]
 파일 선택 → 미리보기 → (선택)상단 크롭 → canvas 리사이즈(장변 ≤2000px, jpeg q0.9)
      ↓ base64 (서버 액션 인자)
[서버 액션 — 이미지는 메모리에만 존재, Storage 저장 안 함]
 requireMember() → Anthropic API 호출(Structured Outputs) → 후처리 검증
      ↓ 블록 배열 반환 (이미지는 즉시 폐기)
[클라이언트]
 격자 위 미리보기 오버레이 → 수정 → [적용] → member_schedule_blocks 저장
```

### 4.2 서버 액션

```ts
// actions/schedule-import.ts
"use server";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { requireMember } from "@/lib/auth/guard";

const BlockSchema = z.object({
  weekday: z.number().int().min(0).max(6),     // 0=월 ... 6=일
  start: z.string(),                            // "HH:MM" 24시간
  end: z.string(),
  title: z.string(),                            // 과목명 (없으면 "")
  confidence: z.enum(["high", "low"]),          // 글자가 잘렸거나 경계가 모호하면 low
});
const ResultSchema = z.object({
  detected: z.boolean(),                        // 시간표로 보이지 않으면 false
  note: z.string(),                             // 판단 근거 / 문제점 한 줄
  blocks: z.array(BlockSchema),
});

const SYSTEM = `당신은 한국 대학교 시간표 스크린샷에서 수업 블록을 추출합니다.

규칙:
- 좌측 세로축의 시각 눈금과 상단 가로축의 요일을 먼저 읽고, 그 좌표계를 기준으로 각 색 블록의 시작/종료 시각을 계산합니다.
- 블록 안의 작은 글씨(강의실, 교수명)는 과목명이 아닙니다. 가장 위의 굵은 텍스트가 과목명입니다.
- 글자가 잘려 읽기 어려워도 블록의 위치와 크기로 시간은 판단할 수 있습니다. 시간을 우선하고 title은 비워도 됩니다.
- 경계가 애매하면 추측하지 말고 confidence를 "low"로 표시합니다.
- 시간표가 아닌 이미지면 detected를 false로 하고 blocks는 비웁니다.
- 시각은 15분 단위로 반올림합니다. 종료 시각은 블록의 아래 경계입니다(다음 블록 시작과 같을 수 있음).`;

export async function importTimetable(imageBase64: string, mediaType: "image/jpeg" | "image/png") {
  await requireMember();

  const client = new Anthropic();
  const res = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
        { type: "text", text: "이 시간표의 모든 수업 블록을 추출하세요." },
      ],
    }],
    output_config: {
      format: zodOutputFormat(ResultSchema),
      effort: "medium",
    },
  });

  if (res.stop_reason === "refusal") return { ok: false as const, reason: "refused" };
  const parsed = res.parsed_output;
  if (!parsed?.detected) return { ok: false as const, reason: "not_a_timetable", note: parsed?.note };

  return { ok: true as const, blocks: validate(parsed.blocks) };
}
```

**후처리 검증 `validate()`** — 모델 출력을 그대로 믿지 않는다:
- `start < end`, 각 값이 00:00~24:00 범위인지
- 하나의 블록이 6시간을 넘으면 파싱 오류로 보고 `confidence: low` 강등
- 같은 요일 내 블록 겹침 검사 → 겹치면 병합하고 low 표시 (중복 수강은 실제로 가능하므로 제거하지 않음)
- 블록이 0개인데 `detected: true` → 실패 처리
- `low`가 하나라도 있으면 검토 화면에서 해당 블록을 노란 테두리로 강조

### 4.3 비용·지연

| 항목 | 값 |
|---|---|
| 이미지 토큰 | Claude Opus 5는 장변 2576px까지 고해상도 입력, 이미지당 최대 ~4,784 토큰 |
| 요청당 비용 | 입력 ~5k 토큰 × $5/1M + 출력 ~1k × $25/1M ≈ **$0.05 (약 70원)** |
| 실사용 빈도 | 멤버당 학기 1회 → 30명 스페이스 기준 **학기당 2천원 수준** |
| 지연 | 2~5초 (업로드 중 스켈레톤 + "시간표 읽는 중" 표시) |

이미지는 **장변 2000px 정도로 리사이즈**해서 보낸다. 너무 줄이면 작은 글씨와 블록 경계가 뭉개져 정확도가 떨어지고, 원본 그대로면 토큰만 낭비된다.

### 4.4 rate limit

이미지 업로드는 비용이 발생하므로 **멤버당 1일 10회** 제한. 초과 시 "직접 입력" 유도.

## 5. 데이터 모델 추가

```sql
-- 멤버의 고정 일정 (학기 시간표, 알바 스케줄 등)
create table member_schedules (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references spaces(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  label       text not null default '내 시간표',   -- '2026-2학기'
  valid_from  date,                                 -- null이면 무기한
  valid_until date,
  source      text not null default 'manual' check (source in ('image','manual')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index on member_schedules (member_id, is_active);

create table member_schedule_blocks (
  id          uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references member_schedules(id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),  -- 0=월
  start_min   int not null check (start_min between 0 and 1440),  -- 자정 기준 분
  end_min     int not null check (end_min   between 0 and 1440),
  title       text,
  check (start_min < end_min)
);
create index on member_schedule_blocks (schedule_id, weekday);
```

**원본 이미지는 저장하지 않는다.** `source='image'`는 출처 표시일 뿐이며 파일 경로 컬럼을 두지 않는다.

## 6. 프라이버시 처리 (이 기능의 유일한 원칙 충돌 지점)

이 서비스는 "개인정보 미수집"이 원칙인데, 시간표 스크린샷에는 **학교명·이름·학번·소속**이 찍혀 있을 수 있고, 방식 A는 그 이미지를 **외부(Anthropic API)로 전송**한다. 이건 조용히 넘어갈 수 없는 지점이므로 아래를 함께 구현한다.

1. **업로드 화면에 명시**: "시간표 인식을 위해 이미지가 외부 AI 서비스로 전송됩니다. 이미지는 저장되지 않고 인식 후 즉시 폐기됩니다." + 명시적 동의 체크박스(최초 1회).
2. **상단 크롭 기본 제공**: 이름/학교가 표시되는 상단 영역을 잘라내도록 크롭 UI를 기본 단계로 넣는다(격자만 남기면 인식에는 지장 없음).
3. **저장 금지**: Supabase Storage에 올리지 않는다. 서버 액션 메모리에서만 다루고 응답 후 참조 해제. 로그에 base64를 남기지 않는다(에러 로깅 시 이미지 필드 마스킹).
4. **대안 제공**: 동의하지 않는 사용자를 위해 "직접 입력"(격자에 드래그로 수업 시간 표시) 경로를 항상 동등하게 노출한다. 이미지 업로드는 어디까지나 단축키다.
5. 배포 전 Anthropic API의 데이터 취급·보존 정책을 직접 확인하고, 필요하면 조직 설정에서 보존 옵션을 검토한다.

## 7. 이벤트 조율 화면과의 통합

| 지점 | 동작 |
|---|---|
| 격자 렌더 | 내 고정 일정과 겹치는 슬롯은 **회색 빗금 + 잠금**, 상단에 "내 시간표 반영됨 · 해제" 토글 |
| 슬롯 탭 | "월 10:00 «자료구조»" 표시, [이 시간은 가능해요] 로 개별 해제 |
| 겹침 판정 | **보수적**: 30분 슬롯에 수업이 1분이라도 걸치면 불가 |
| 이동 버퍼 | 설정에서 "수업 전후 30분도 불가" 옵션(통학·이동 고려), 기본 off |
| 히트맵 | 슬롯에 "3명 수업 중" 보조 표기 — 왜 이 시간이 비었는지 보인다 |
| **이벤트 생성 시** | 후보 날짜를 고르면 **"전원 수업 없는 시간대"를 하이라이트**해 시간 범위를 선제안 (응답 0명이어도 초안이 나온다 ← 킬러 기능) |
| 학기 종료 | `valid_until` 경과 시 자동 비활성 + "새 학기 시간표를 올려주세요" 배너 |

> 주의: 고정 일정은 `availabilities`에 복사 저장하지 않고 **렌더 시점에 파생**시킨다. 시간표를 수정하면 진행 중인 모든 이벤트에 즉시 반영되어야 하기 때문이다.

## 8. 엣지 케이스 체크리스트

- [ ] 다크모드 스크린샷 / 앱 상태바 포함 / 웹 캡처 / 사진으로 찍은 화면(기울어짐)
- [ ] 토·일 열이 있는 경우와 없는 경우 (요일 헤더를 반드시 읽어서 매핑)
- [ ] 시간축 시작이 08시/09시/10시로 가변 → 눈금 라벨 기준으로 계산
- [ ] 30분짜리 짧은 블록에서 글자 잘림 → title 비우고 시간만 채택
- [ ] 같은 시간대 블록 겹침(중복 수강) → 병합하지 말고 둘 다 유지, 불가 판정은 합집합
- [ ] 24시 종료 블록(야간 수업)
- [ ] 시간표가 아닌 이미지(셀카, 문서) → `detected: false` 처리 + 안내
- [ ] 여러 장 업로드(1·2학기 분리 캡처) → 순차 처리 후 블록 합집합

## 9. 작업 분해 (약 3~4일)

1. `member_schedules` 마이그레이션 + 직접 입력 UI (격자 재사용) — 1일
2. 서버 액션 + 프롬프트/스키마 + 후처리 검증 — 0.5일
3. 업로드·크롭·검토 오버레이 UI — 1일
4. 조율 격자 잠금 렌더 + 개별 해제 + 이동 버퍼 옵션 — 0.5일
5. 이벤트 생성 시 "전원 가능 시간대" 선제안 — 0.5일
6. 프라이버시 동의 문구·마스킹·rate limit — 0.5일

**로드맵 배치**: M4(아카이빙) 이후 **M5**. 단, 1번(직접 입력 고정 일정)은 이미지 인식 없이도 그 자체로 가치가 있으므로 M2 격자 구현 시 데이터 모델만 미리 반영해두면 재작업이 없다.
