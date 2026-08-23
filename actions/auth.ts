"use server";

import { z } from "zod";
import { createSession, destroySession } from "@/lib/session";
import { hashPin, verifyPin } from "@/lib/pin";
import { createMember, findMemberByName, touchLogin } from "@/lib/store";
import { isLocked, recordFail, clearFails } from "@/lib/rate-limit";

const NAME_RULE = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 ]+$/;

const nameSchema = z
  .string()
  .trim()
  .min(1, "이름을 입력해 주세요.")
  .max(9, "이름은 9자까지 입력할 수 있어요.")
  .regex(NAME_RULE, "한글·영문·숫자와 띄어쓰기만 쓸 수 있어요.");

const pinSchema = z.string().regex(/^\d{4}$/, "PIN은 숫자 4자리예요.");

export type AuthResult = { ok: true; next: string } | { ok: false; error: string };

/** 이름이 이미 등록돼 있는지 확인 — 로그인 화면의 1단계 */
export async function checkName(rawName: string): Promise<
  { ok: true; exists: boolean; name: string } | { ok: false; error: string }
> {
  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const member = await findMemberByName(parsed.data);
  return { ok: true, exists: Boolean(member), name: parsed.data };
}

/** 기존 멤버 로그인 */
export async function signIn(rawName: string, rawPin: string): Promise<AuthResult> {
  const name = nameSchema.safeParse(rawName);
  const pin = pinSchema.safeParse(rawPin);
  if (!name.success) return { ok: false, error: name.error.issues[0].message };
  if (!pin.success) return { ok: false, error: pin.error.issues[0].message };

  const lockedFor = isLocked(name.data);
  if (lockedFor > 0) {
    return { ok: false, error: `시도가 너무 많아요. ${Math.ceil(lockedFor / 60)}분 뒤에 다시 시도해 주세요.` };
  }

  const member = await findMemberByName(name.data);
  if (!member || !(await verifyPin(pin.data, member.pinHash))) {
    recordFail(name.data);
    return { ok: false, error: "이름 또는 PIN이 맞지 않아요." };
  }

  clearFails(name.data);
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
export async function signUp(rawName: string, rawPin: string): Promise<AuthResult> {
  const name = nameSchema.safeParse(rawName);
  const pin = pinSchema.safeParse(rawPin);
  if (!name.success) return { ok: false, error: name.error.issues[0].message };
  if (!pin.success) return { ok: false, error: pin.error.issues[0].message };

  // 중복 확인은 createMember 안에서 저장과 함께 이뤄진다 — 같은 이름으로
  // 동시에 가입을 눌러도 한 명만 통과한다.
  const member = await createMember(name.data, await hashPin(pin.data));
  if (!member) {
    return { ok: false, error: "이미 등록된 이름이에요. 로그인해 주세요." };
  }

  await createSession({
    memberId: member.id,
    displayName: member.displayName,
    role: member.role,
    ver: member.sessionVersion,
  });
  return { ok: true, next: "/" };
}

export async function signOut() {
  await destroySession();
}
