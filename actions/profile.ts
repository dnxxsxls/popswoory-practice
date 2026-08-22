"use server";

import { z } from "zod";
import { requireMember } from "@/lib/guard";
import { findMemberByName, renameMember, setMemberGroups } from "@/lib/store";

const schema = z
  .object({
    // 가입 화면과 같은 규칙 — 표시명이 곧 로그인 아이디다
    displayName: z
      .string()
      .trim()
      .min(1, "이름을 입력해 주세요.")
      .max(12, "이름은 12자까지 입력할 수 있어요."),
    groupRole: z.enum(["mentor", "member"]),
    groupNos: z.array(z.number().int().min(1).max(8)).min(1, "조를 골라주세요.").max(8),
  })
  .refine((v) => v.groupRole === "mentor" || v.groupNos.length === 1, {
    message: "조원은 조를 하나만 고를 수 있어요.",
  });

/** 내 정보 수정 — 표시명과 역할·조를 한 번에 저장한다. */
export async function updateProfile(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireMember();

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "다시 확인해 주세요." };
  }
  const { displayName, groupRole, groupNos } = parsed.data;

  const taken = await findMemberByName(displayName);
  if (taken && taken.id !== me.memberId) {
    return { ok: false, error: "이미 등록된 이름이에요." };
  }

  await renameMember(me.memberId, displayName);
  await setMemberGroups(me.memberId, groupRole, groupNos);

  // 세션 쿠키에도 표시명이 들어 있지만 requireMember() 가 매번 저장소에서 다시 읽으므로
  // 쿠키를 새로 발급하지 않아도 화면에는 바뀐 이름이 나온다.
  return { ok: true };
}
