import "server-only";

/** 비밀번호 무차별 대입 방지 (개발/소규모용 인메모리). 서버 재시작 시 초기화된다. */
const attempts = new Map<string, { count: number; lockedUntil: number }>();

const MAX_FAILS = 5;
const WINDOW_MS = 10 * 60 * 1000;

export function isLocked(key: string): number {
  const entry = attempts.get(key.toLowerCase());
  if (!entry) return 0;
  const remaining = entry.lockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

export function recordFail(key: string) {
  const k = key.toLowerCase();
  const entry = attempts.get(k) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_FAILS) {
    entry.lockedUntil = Date.now() + WINDOW_MS;
    entry.count = 0;
  }
  attempts.set(k, entry);
}

/** 비밀번호 검증을 시작하기 전에 시도 한 건을 동기적으로 예약한다. */
export function reserveAttempt(key: string): number {
  const lockedFor = isLocked(key);
  if (lockedFor > 0) return lockedFor;
  recordFail(key);
  return 0;
}

export function clearFails(key: string) {
  attempts.delete(key.toLowerCase());
}
