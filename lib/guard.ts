import "server-only";
import { redirect } from "next/navigation";
import { readSession, type Session } from "./session";
import { getMember } from "./store";

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
