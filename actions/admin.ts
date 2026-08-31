"use server";

import { z } from "zod";
import { requireMember } from "@/lib/guard";
import { hashPassword } from "@/lib/password";
import { clearFails } from "@/lib/rate-limit";
import { getMember, resetMemberPassword } from "@/lib/store";

const TEMPORARY_PASSWORD = "0000";
const memberIdSchema = z.string().uuid();

export async function resetPasswordToDefault(
  rawMemberId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireMember();
  if (me.role !== "admin") {
    return { ok: false, error: "관리자만 비밀번호를 초기화할 수 있어요." };
  }

  const memberId = memberIdSchema.safeParse(rawMemberId);
  if (!memberId.success) return { ok: false, error: "회원 정보가 올바르지 않아요." };
  if (memberId.data === me.memberId) {
    return { ok: false, error: "내 비밀번호는 내 정보에서 변경해 주세요." };
  }

  const member = await getMember(memberId.data);
  if (!member?.isActive) return { ok: false, error: "회원을 찾을 수 없어요." };

  const reset = await resetMemberPassword(
    member.id,
    await hashPassword(TEMPORARY_PASSWORD),
  );
  if (!reset) return { ok: false, error: "비밀번호를 초기화하지 못했어요." };

  clearFails(member.loginId);
  return { ok: true };
}
