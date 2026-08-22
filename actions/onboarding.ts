"use server";

import { z } from "zod";
import { requireMember } from "@/lib/guard";
import {
  clearMemberGroups,
  clearScheduleBlocks,
  completeTutorial,
  deactivateSchedule,
  setMemberGroups,
} from "@/lib/store";

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

/**
 * 온보딩에서 뒤로 갈 때 방금 저장한 것을 비운다.
 * 비우지 않으면 가드가 "이미 끝난 단계" 로 보고 곧바로 앞으로 되돌려 보낸다.
 */
export async function undoGroups(): Promise<{ ok: true }> {
  const me = await requireMember();
  await clearMemberGroups(me.memberId);
  return { ok: true };
}

export async function undoTimetable(): Promise<{ ok: true }> {
  const me = await requireMember();
  await deactivateSchedule(me.memberId);
  return { ok: true };
}

export async function undoBlocks(): Promise<{ ok: true }> {
  const me = await requireMember();
  await clearScheduleBlocks(me.memberId);
  return { ok: true };
}
