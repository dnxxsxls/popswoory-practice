import "server-only";
import { redirect } from "next/navigation";
import { readSession, type Session } from "./session";
import { getMember, isInTutorial, type Member, type Schedule } from "./store";

/**
 * 보호된 페이지 / 서버 액션의 첫 줄에서 호출한다.
 * 세션 서명 + 멤버 생존 + session_version 일치까지 확인한다.
 */
export async function requireMember(): Promise<Session> {
  const session = await readSession();
  if (!session) redirect("/join");

  const member = await getMember(session.memberId);
  if (!member || !member.isActive || member.sessionVersion !== session.ver) {
    // 쿠키는 여기서 지우지 않는다 — 서버 컴포넌트에서는 쿠키를 수정할 수 없다.
    // 어차피 매 요청마다 멤버 존재 여부를 다시 확인하므로 남은 쿠키는 무해하고,
    // 다시 로그인하면 새 쿠키로 덮어쓴다.
    redirect("/join");
  }

  return {
    memberId: member.id,
    displayName: member.displayName,
    role: member.role,
    ver: member.sessionVersion,
  };
}

/** 로그인 상태면 세션, 아니면 null. 리다이렉트하지 않는다. */
export async function optionalMember(): Promise<Session | null> {
  const session = await readSession();
  if (!session) return null;
  const member = await getMember(session.memberId);
  if (!member || !member.isActive || member.sessionVersion !== session.ver) return null;
  return session;
}

/**
 * 온보딩을 마친 사람만 볼 수 있는 화면. 아직이면 온보딩으로 돌려보낸다.
 * 기능 페이지의 첫 줄에서 requireMember() 대신 쓴다 — 주소를 직접 쳐도 막힌다.
 */
export async function requireOnboarded(): Promise<Session> {
  const session = await requireMember();
  const member = await getMember(session.memberId);
  if (isInTutorial(member)) redirect("/onboarding");
  return session;
}

/** 온보딩 화면. 이미 끝낸 사람은 홈으로 보낸다. */
export async function requireOnboarding(): Promise<{ session: Session; member: Member }> {
  const session = await requireMember();
  const member = await getMember(session.memberId);
  if (!member) redirect("/join");
  if (!isInTutorial(member)) redirect("/");
  return { session, member };
}

/**
 * 지금 있어야 할 온보딩 단계의 경로. 각 단계 페이지가 이 값과 다르면 옮겨 보내
 * 주소를 직접 쳐서 순서를 건너뛰지 못하게 한다.
 */
export function onboardingPath(member: Member, schedule: Schedule | null): string {
  if (member.groupRole === null) return "/onboarding";
  if (!schedule) return "/onboarding/timetable";
  if (schedule.blocks.length === 0) return "/onboarding/review";
  return "/onboarding/group";
}
