"use server";

import { z } from "zod";
import { requireMember } from "@/lib/guard";
import { completeTutorial, setMemberGroup } from "@/lib/store";

const groupSchema = z.number().int().min(1).max(8);

export async function chooseGroup(
  groupNo: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireMember();

  const parsed = groupSchema.safeParse(groupNo);
  if (!parsed.success) return { ok: false, error: "조를 다시 골라주세요." };

  await setMemberGroup(me.memberId, parsed.data);
  return { ok: true };
}

export async function finishTutorial(): Promise<{ ok: true }> {
  const me = await requireMember();
  await completeTutorial(me.memberId);
  return { ok: true };
}
