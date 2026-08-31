"use server";

import { z } from "zod";
import { createSession, destroySession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  createMember,
  findMemberByLoginId,
  findMemberByName,
  touchLogin,
} from "@/lib/store";
import { clearFails, reserveAttempt } from "@/lib/rate-limit";

const NAME_RULE = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 ]+$/;
const LOGIN_ID_RULE = /^[a-z0-9]+$/;

const loginLookupSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "아이디를 입력해 주세요.")
  .max(20, "아이디는 20자까지 입력할 수 있어요.")
  .regex(NAME_RULE, "아이디가 올바르지 않아요.");

const loginIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(4, "아이디는 4자 이상 입력해 주세요.")
  .max(20, "아이디는 20자까지 입력할 수 있어요.")
  .regex(LOGIN_ID_RULE, "아이디는 영문 소문자와 숫자만 쓸 수 있어요.");

const nameSchema = z
  .string()
  .trim()
  .min(1, "이름을 입력해 주세요.")
  .max(9, "이름은 9자까지 입력할 수 있어요.")
  .regex(NAME_RULE, "한글·영문·숫자와 띄어쓰기만 쓸 수 있어요.");

const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상 입력해 주세요.")
  .max(64, "비밀번호는 64자까지 입력할 수 있어요.");

const loginPasswordSchema = z
  .string()
  .min(4, "비밀번호를 입력해 주세요.")
  .max(64, "비밀번호는 64자까지 입력할 수 있어요.");

export type AuthResult =
  | { ok: true; next: string }
  | { ok: false; error: string; field?: "loginId" | "nickname" };

/** 아이디가 이미 등록돼 있는지 확인 — 로그인 화면의 1단계 */
export async function checkLoginId(rawLoginId: string): Promise<
  { ok: true; exists: boolean; loginId: string } | { ok: false; error: string }
> {
  const lookup = loginLookupSchema.safeParse(rawLoginId);
  if (!lookup.success) return { ok: false, error: lookup.error.issues[0].message };

  const member = await findMemberByLoginId(lookup.data);
  if (member) return { ok: true, exists: true, loginId: lookup.data };

  const newLoginId = loginIdSchema.safeParse(rawLoginId);
  if (!newLoginId.success) {
    return { ok: false, error: newLoginId.error.issues[0].message };
  }
  return { ok: true, exists: false, loginId: newLoginId.data };
}

/** 기존 멤버 로그인 */
export async function signIn(rawLoginId: string, rawPassword: string): Promise<AuthResult> {
  const loginId = loginLookupSchema.safeParse(rawLoginId);
  const password = loginPasswordSchema.safeParse(rawPassword);
  if (!loginId.success) return { ok: false, error: loginId.error.issues[0].message };
  if (!password.success) return { ok: false, error: password.error.issues[0].message };

  const lockedFor = reserveAttempt(loginId.data);
  if (lockedFor > 0) {
    return { ok: false, error: `시도가 너무 많아요. ${Math.ceil(lockedFor / 60)}분 뒤에 다시 시도해 주세요.` };
  }

  const member = await findMemberByLoginId(loginId.data);
  if (!member || !(await verifyPassword(password.data, member.passwordHash))) {
    return { ok: false, error: "아이디 또는 비밀번호가 맞지 않아요." };
  }

  clearFails(loginId.data);
  await touchLogin(member.id);
  await createSession({
    memberId: member.id,
    displayName: member.displayName,
    role: member.role,
    ver: member.sessionVersion,
  });
  return { ok: true, next: "/" };
}

/** 신규 가입 — 끝나면 홈으로. 시간표 등록은 홈의 필수 튜토리얼이 받는다. */
export async function signUp(
  rawLoginId: string,
  rawPassword: string,
  rawPasswordConfirm: string,
  rawName: string,
): Promise<AuthResult> {
  const loginId = loginIdSchema.safeParse(rawLoginId);
  const password = passwordSchema.safeParse(rawPassword);
  const name = nameSchema.safeParse(rawName);
  if (!loginId.success) return { ok: false, error: loginId.error.issues[0].message };
  if (!password.success) return { ok: false, error: password.error.issues[0].message };
  if (password.data !== rawPasswordConfirm) {
    return { ok: false, error: "비밀번호가 서로 달라요." };
  }
  if (!name.success) return { ok: false, error: name.error.issues[0].message };

  const created = await createMember(
    loginId.data,
    name.data,
    await hashPassword(password.data),
  );
  if (!created.ok) {
    return {
      ok: false,
      error:
        created.field === "loginId"
          ? "이미 등록된 아이디예요. 아이디 입력부터 다시 진행해 주세요."
          : "이미 등록된 닉네임이에요. 다른 닉네임을 골라주세요.",
      field: created.field === "loginId" ? "loginId" : "nickname",
    };
  }
  const { member } = created;

  await createSession({
    memberId: member.id,
    displayName: member.displayName,
    role: member.role,
    ver: member.sessionVersion,
  });
  return { ok: true, next: "/" };
}

/** 가입 마지막 단계에서 닉네임 중복을 미리 확인한다. */
export async function checkNickname(rawName: string): Promise<
  { ok: true; available: boolean; name: string } | { ok: false; error: string }
> {
  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const member = await findMemberByName(parsed.data);
  return { ok: true, available: !member, name: parsed.data };
}

export async function signOut() {
  await destroySession();
}
