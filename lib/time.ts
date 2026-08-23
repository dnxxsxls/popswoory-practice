/** 자정 기준 분 → "HH:MM". 서버·클라이언트 양쪽에서 쓴다. */
export function formatMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * 정리 대상 시간대 — 오전 9시 ~ 오후 10시.
 *
 * 새벽 수업이나 늦은 야간 블록에 맞춰 격자를 늘리면, 정작 사람들이 볼 낮 시간이
 * 납작해지고 빈 줄만 길어진다. 어차피 연습 시간은 이 안에서 잡는다.
 */
export const DAY_START_HOUR = 9;
export const DAY_END_HOUR = 22;
export const DAY_START_MIN = DAY_START_HOUR * 60;
export const DAY_END_MIN = DAY_END_HOUR * 60;

/**
 * 블록을 09:00–22:00 안으로 잘라낸다.
 *
 * - 창을 걸친 블록(예: 08:00–09:30)은 겹치는 09:00–09:30 만 남긴다. 9시 반까지
 *   못 오는 건 사실이라 통째로 버리면 안 된다.
 * - 창 밖으로 완전히 벗어난 블록(예: 07:00–08:30)은 null. 후보가 될 수 없는 시간이다.
 * - `clipped` 는 실제로 잘려나갔는지. 부르는 쪽에서 사람에게 표시할 때 쓴다.
 */
export function clipToDay(
  startMin: number,
  endMin: number,
): { startMin: number; endMin: number; clipped: boolean } | null {
  const start = Math.max(startMin, DAY_START_MIN);
  const end = Math.min(endMin, DAY_END_MIN);
  if (start >= end) return null;
  return { startMin: start, endMin: end, clipped: start !== startMin || end !== endMin };
}
