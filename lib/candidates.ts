import { SLOT_MIN, type FreeTable } from "./free-time";

/**
 * 고른 날짜 × 공강표 교집합 → 소요시간 이상 이어지는 후보 구간.
 *
 * 원칙: 여기서 나오는 건 "시간표상 비어 있다"는 뜻일 뿐 확정 근거가 아니다.
 * 실제 가능 여부는 멤버가 O/X 로 답해야 한다.
 */

export type Candidate = {
  /** "YYYY-MM-DD" */
  date: string;
  weekday: number;
  startMin: number;
  endMin: number;
  /** 이 시간에 수업·개인일정이 있는 멤버 */
  busyIds: string[];
};

export const slotKeyOf = (c: Pick<Candidate, "date" | "startMin">) =>
  `${c.date}T${c.startMin}`;

/** "YYYY-MM-DD" → 0=월 … 6=일. 서버 시간대에 흔들리지 않게 UTC 로 계산한다. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=일
  return (jsDay + 6) % 7;
}

/**
 * 오늘 날짜 "YYYY-MM-DD" (KST). 이벤트 날짜가 KST 기준이라 맞춰서 비교한다.
 * 서버 시간대 설정에 흔들리지 않게 시간대를 못박는다.
 */
export function todayKst(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

export function formatDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  const labels = ["월", "화", "수", "목", "금", "토", "일"];
  return `${m}월 ${d}일(${labels[weekdayOf(date)]})`;
}

/**
 * @param maxMissing 이 인원까지는 빠져도 후보로 본다
 */
function collect(
  table: FreeTable,
  dates: string[],
  durationMin: number,
  maxMissing: number,
): Candidate[] {
  const need = Math.ceil(durationMin / SLOT_MIN);
  const out: Candidate[] = [];

  for (const date of dates) {
    const weekday = weekdayOf(date);
    const daySlots = table.slots[weekday];
    if (!daySlots) continue;

    // 연속으로 조건을 만족하는 구간을 훑고, 그 안에서 need 길이 창을 잘라낸다
    let runStart: number | null = null;

    const flush = (endIndex: number) => {
      if (runStart === null) return;
      const length = endIndex - runStart;
      if (length >= need) {
        for (let i = runStart; i + need <= endIndex; i += need) {
          const window = daySlots.slice(i, i + need);
          const busy = new Set<string>();
          window.forEach((s) => s.busyIds.forEach((id) => busy.add(id)));
          out.push({
            date,
            weekday,
            startMin: window[0].startMin,
            endMin: window[window.length - 1].endMin,
            busyIds: [...busy],
          });
        }
      }
      runStart = null;
    };

    daySlots.forEach((slot, i) => {
      const ok = slot.busyIds.length <= maxMissing;
      if (ok && runStart === null) runStart = i;
      if (!ok) flush(i);
    });
    flush(daySlots.length);
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
}

/**
 * 전원 공강 후보를 먼저 찾고, 하나도 없으면 1명까지 빠지는 시간으로 넓힌다.
 * 넓혔는지 여부를 함께 돌려주어 화면에서 안내할 수 있게 한다.
 */
export function buildCandidates(
  table: FreeTable,
  dates: string[],
  durationMin: number,
): { candidates: Candidate[]; relaxed: boolean } {
  const strict = collect(table, dates, durationMin, 0);
  if (strict.length > 0) return { candidates: strict, relaxed: false };

  const relaxed = collect(table, dates, durationMin, 1);
  return { candidates: relaxed, relaxed: relaxed.length > 0 };
}
