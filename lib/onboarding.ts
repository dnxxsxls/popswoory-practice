import type { Member, Schedule } from "./store";

/** 온보딩 전체 과정. 화면이 여러 라우트에 흩어져 있어 순서를 여기서 한 번에 센다. */
export const ONBOARDING_STEPS = [
  "role", // 역할
  "group", // 조
  "upload", // 시간표 사진 올리기 · 크롭
  "analyze", // 분석
  "classes", // 수업 시간 확인
  "personal", // 그 밖에 안 되는 시간
  "final", // 최종 확인
  "roster", // 조원 확인
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length;

/** 1부터 세는 단계 번호. 진행바가 이 값까지 채워진다. */
export function stepNumber(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step) + 1;
}

/** 저장 상태를 기준으로 사용자가 이어서 진행할 온보딩 경로를 정한다. */
export function onboardingPath(member: Member, schedule: Schedule | null): string {
  if (member.groupRole === null) return "/onboarding";
  if (!schedule) return "/onboarding/timetable";
  if (schedule.status !== "parsed") return "/onboarding/review";
  return "/onboarding/group";
}
