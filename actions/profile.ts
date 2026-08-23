"use server";

import { z } from "zod";
import { requireMember } from "@/lib/guard";
import { hashPin, verifyPin } from "@/lib/pin";
import { clearFails, isLocked, recordFail } from "@/lib/rate-limit";
import { destroySession } from "@/lib/session";
import {
  changeMemberPin,
  findMemberByName,
  getMember,
  renameMember,
  setMemberGroups,
} from "@/lib/store";

// 가입 화면과 같은 규칙 — 표시명이 곧 로그인 아이디다
const NAME_RULE = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 ]+$/;

const nameSchema = z
  .string()
  .trim()
  .min(1, "이름을 입력해 주세요.")
  .max(9, "이름은 9자까지 입력할 수 있어요.")
  .regex(NAME_RULE, "한글·영문·숫자와 띄어쓰기만 쓸 수 있어요.");

const schema = z
  .object({
    displayName: nameSchema,
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

  // 중복 확인과 저장이 renameMember 안에서 함께 일어난다.
  if (!(await renameMember(me.memberId, displayName))) {
    return { ok: false, error: "이미 등록된 이름이에요." };
  }
  await setMemberGroups(me.memberId, groupRole, groupNos);

  // 세션 쿠키에도 표시명이 들어 있지만 requireMember() 가 매번 저장소에서 다시 읽으므로
  // 쿠키를 새로 발급하지 않아도 화면에는 바뀐 이름이 나온다.
  return { ok: true };
}

const pinSchema = z.string().regex(/^\d{4}$/, "PIN은 숫자 4자리예요.");

/**
 * PIN 변경. 지금 PIN 을 확인한 뒤 바꾸고, 세션을 끊는다.
 * 성공하면 화면에서 로그인으로 보낸다.
 */
export async function changePin(input: {
  current?: string;
  next?: string;
  confirm?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireMember();

  const current = pinSchema.safeParse(input.current);
  const next = pinSchema.safeParse(input.next);
  if (!current.success) return { ok: false, error: "지금 PIN을 숫자 4자리로 입력해 주세요." };
  if (!next.success) return { ok: false, error: "새 PIN은 숫자 4자리예요." };
  if (next.data !== input.confirm) return { ok: false, error: "새 PIN이 서로 달라요." };
  if (next.data === current.data) return { ok: false, error: "지금과 다른 PIN으로 바꿔주세요." };

  // 로그인과 같은 잠금 정책을 쓴다 — 세션이 있어도 지금 PIN 을 넘겨짚지 못하게.
  const lockedFor = isLocked(me.displayName);
  if (lockedFor > 0) {
    return {
      ok: false,
      error: `시도가 너무 많아요. ${Math.ceil(lockedFor / 60)}분 뒤에 다시 시도해 주세요.`,
    };
  }

  const member = await getMember(me.memberId);
  if (!member || !(await verifyPin(current.data, member.pinHash))) {
    recordFail(me.displayName);
    return { ok: false, error: "지금 PIN이 맞지 않아요." };
  }
  clearFails(me.displayName);

  await changeMemberPin(me.memberId, await hashPin(next.data));
  await destroySession();
  return { ok: true };
}

/**
 * 닉네임 중복 확인 버튼용. 지금 이 순간 기준일 뿐이라, 실제 저장은
 * updateProfile / signUp 안에서 다시 확인한다 — 사이에 남이 채갈 수 있다.
 */
export async function checkNameAvailable(
  rawName: string,
): Promise<{ ok: true; available: boolean } | { ok: false; error: string }> {
  const me = await requireMember();

  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const taken = await findMemberByName(parsed.data);
  return { ok: true, available: !taken || taken.id === me.memberId };
}
