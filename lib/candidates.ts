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

/** 화면에 먼저 펼쳐 보여줄 후보 수. 나머지는 '더 보기' 뒤에 둔다. */
export const TOP_CANDIDATES = 6;

/**
 * 가능한 창을 30분 간격으로 전부 만든다.
 *
 * 예전에는 공강 구간이 시작되는 지점부터 소요시간만큼 뚝뚝 잘라냈다. 그러면 10:30 에
 * 수업이 끝나는 날은 12:30·14:30 같은 어정쩡한 시각만 후보가 되고 13:00 이나 15:00 은
 * 아예 나오지 않았다. 구간 끝의 자투리도 버려졌다. 다 만들어 두고 아래에서 고른다.
 *
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

    for (let i = 0; i + need <= daySlots.length; i++) {
      const window = daySlots.slice(i, i + need);
      if (!window.every((s) => s.busyIds.length <= maxMissing)) continue;

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

  return out;
}

/**
 * 시작 시각이 얼마나 무난한지. 작을수록 앞에 온다.
 *
 * 시간표상 비어 있다고 다 같은 시간은 아니다. 아침 9시는 비어 있어도 모이기 어렵고
 * 밤늦은 시간은 끝나고 돌아갈 일이 남는다. 오후와 이른 저녁을 앞에 둔다.
 */
function timeOfDayRank(startMin: number): number {
  if (startMin >= 13 * 60 && startMin < 19 * 60) return 0; // 오후·이른 저녁
  if (startMin >= 11 * 60) return 1; // 늦은 오전, 밤
  return 2; // 이른 아침
}

/** 앞에서부터 차례로 비교하는 정렬 기준. 앞선 항목이 언제나 우선한다. */
function rankKey(c: Candidate): (number | string)[] {
  return [
    c.busyIds.length, // 빠지는 사람이 적은 쪽이 먼저다
    timeOfDayRank(c.startMin),
    c.startMin % 60 === 0 ? 0 : 1, // 15:00 이 14:30 보다 기억하기 쉽다
    c.date,
    c.startMin,
  ];
}

function compare(a: Candidate, b: Candidate): number {
  const ka = rankKey(a);
  const kb = rankKey(b);
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] < kb[i]) return -1;
    if (ka[i] > kb[i]) return 1;
  }
  return 0;
}

/**
 * 좋은 순으로 고르되 이미 고른 후보와 겹치는 창은 버린다.
 *
 * 30분 간격으로 다 만들어 두면 14:00–16:00 과 14:30–16:30 처럼 사실상 같은 시간이
 * 줄줄이 나온다. 그대로 두면 목록 앞쪽이 한 시간대로만 채워진다.
 */
function pickSpread(all: Candidate[]): Candidate[] {
  const picked: Candidate[] = [];

  for (const c of [...all].sort(compare)) {
    const clashes = picked.some(
      (p) => p.date === c.date && p.startMin < c.endMin && p.endMin > c.startMin,
    );
    if (!clashes) picked.push(c);
  }

  return picked;
}

/**
 * 전원 공강 후보를 먼저 찾고, 하나도 없으면 1명까지 빠지는 시간으로 넓힌다.
 * 넓혔는지 여부를 함께 돌려주어 화면에서 안내할 수 있게 한다.
 *
 * 돌려주는 목록은 좋은 순이다 — 앞에서부터 잘라 쓰면 된다.
 */
export function buildCandidates(
  table: FreeTable,
  dates: string[],
  durationMin: number,
): { candidates: Candidate[]; relaxed: boolean } {
  const strict = collect(table, dates, durationMin, 0);
  if (strict.length > 0) return { candidates: pickSpread(strict), relaxed: false };

  const relaxed = collect(table, dates, durationMin, 1);
  return { candidates: pickSpread(relaxed), relaxed: relaxed.length > 0 };
}
