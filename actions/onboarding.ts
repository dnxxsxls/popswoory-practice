"use server";

import { z } from "zod";
import { requireMember } from "@/lib/guard";
import { completeTutorial, setMemberGroups } from "@/lib/store";

const schema = z
  .object({
    groupRole: z.enum(["mentor", "member"]),
    groupNos: z.array(z.number().int().min(1).max(8)).min(1).max(8),
  })
  // 조원은 한 조에만 속한다. 멘토만 겸직이 있다.
  .refine((v) => v.groupRole === "mentor" || v.groupNos.length === 1, {
    message: "조원은 조를 하나만 고를 수 있어요.",
  });

export async function chooseGroups(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireMember();

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "다시 골라주세요." };
  }

  await setMemberGroups(me.memberId, parsed.data.groupRole, parsed.data.groupNos);
  return { ok: true };
}

export async function finishTutorial(): Promise<{ ok: true }> {
  const me = await requireMember();
  await completeTutorial(me.memberId);
  return { ok: true };
}
