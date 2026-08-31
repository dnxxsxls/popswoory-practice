"use server";

import { z } from "zod";
import { requireMember } from "@/lib/guard";
import { hashPassword, verifyPassword } from "@/lib/password";
import { clearFails, reserveAttempt } from "@/lib/rate-limit";
import { destroySession } from "@/lib/session";
import {
  changeMemberPassword,
  findMemberByName,
  getMember,
  renameMember,
  setMemberGroups,
} from "@/lib/store";

// 가입 화면과 같은 닉네임 규칙
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

const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상 입력해 주세요.")
  .max(64, "비밀번호는 64자까지 입력할 수 있어요.");

const currentPasswordSchema = z.string().min(4).max(64);

/**
 * 비밀번호 변경. 지금 비밀번호를 확인한 뒤 바꾸고, 세션을 끊는다.
 * 성공하면 화면에서 로그인으로 보낸다.
 */
export async function changePassword(input: {
  current?: string;
  next?: string;
  confirm?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireMember();

  const current = currentPasswordSchema.safeParse(input.current);
  const next = passwordSchema.safeParse(input.next);
  if (!current.success) return { ok: false, error: "지금 비밀번호를 확인해 주세요." };
  if (!next.success) return { ok: false, error: next.error.issues[0].message };
  if (next.data !== input.confirm) return { ok: false, error: "새 비밀번호가 서로 달라요." };
  if (next.data === current.data) {
    return { ok: false, error: "지금과 다른 비밀번호로 바꿔주세요." };
  }

  const member = await getMember(me.memberId);
  if (!member) return { ok: false, error: "회원 정보를 찾을 수 없어요." };

  // 로그인과 같은 잠금 정책을 쓴다 — 세션이 있어도 지금 비밀번호를 넘겨짚지 못하게.
  const lockedFor = reserveAttempt(member.loginId);
  if (lockedFor > 0) {
    return {
      ok: false,
      error: `시도가 너무 많아요. ${Math.ceil(lockedFor / 60)}분 뒤에 다시 시도해 주세요.`,
    };
  }

  if (!(await verifyPassword(current.data, member.passwordHash))) {
    return { ok: false, error: "지금 비밀번호가 맞지 않아요." };
  }
  clearFails(member.loginId);

  const changed = await changeMemberPassword(
    me.memberId,
    member.passwordHash,
    await hashPassword(next.data),
  );
  if (!changed) {
    await destroySession();
    return { ok: false, error: "비밀번호가 이미 변경됐어요. 다시 로그인해 주세요." };
  }
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
