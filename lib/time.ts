/** 자정 기준 분 → "HH:MM". 서버·클라이언트 양쪽에서 쓴다. */
export function formatMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
