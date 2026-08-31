"use server";

import { z } from "zod";
import { requireMember } from "@/lib/guard";
import { buildEventView } from "@/lib/event-view";
import {
  canAccessEvent,
  cancelEvent,
  confirmEvent,
  createEvent,
  getEvent,
  getMember,
  saveResponses,
} from "@/lib/store";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않아요.");

const createSchema = z.object({
  title: z.string().trim().min(1, "연습 이름을 입력해 주세요.").max(30),
  // 연습 하나는 하루짜리다. 저장은 예전처럼 배열로 두되(공강 계산이 날짜 목록을
  // 받는다) 들어올 수 있는 건 하루뿐이다.
  dates: z.array(dateSchema).length(1, "날짜를 하루 골라주세요."),
  durationMin: z.number().int().min(30).max(600),
  groupNo: z.number().int().min(1).max(8),
});

export type CreateResult = { ok: true; id: string } | { ok: false; error: string };

export async function createMeetEvent(input: unknown): Promise<CreateResult> {
  const me = await requireMember();

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력이 올바르지 않아요." };
  }

  const member = await getMember(me.memberId);
  if (!member || member.groupNos.length === 0) {
    return { ok: false, error: "먼저 내 조를 설정해 주세요." };
  }

  // 일반 조원은 클라이언트가 보낸 값과 무관하게 자신의 유일한 조로 고정한다.
  const groupNo = member.groupRole === "member" ? member.groupNos[0] : parsed.data.groupNo;
  if (!member.groupNos.includes(groupNo)) {
    return { ok: false, error: "담당하고 있는 조의 일정만 만들 수 있어요." };
  }

  const event = await createEvent({ createdBy: me.memberId, ...parsed.data, groupNo });
  return { ok: true, id: event.id };
}

async function getAccessibleEvent(eventId: string, memberId: string) {
  const [event, member] = await Promise.all([getEvent(eventId), getMember(memberId)]);
  return event && member && canAccessEvent(member, event) ? event : null;
}

const answersSchema = z.array(
  z.object({
    slotKey: z.string().max(40),
    answer: z.enum(["yes", "no"]),
  }),
).max(200);

export async function saveMyAnswers(
  eventId: string,
  answers: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireMember();

  const event = await getAccessibleEvent(eventId, me.memberId);
  if (!event) return { ok: false, error: "연습 일정을 찾지 못했어요." };
  if (event.status !== "polling") return { ok: false, error: "이미 확정된 일정이에요." };

  const parsed = answersSchema.safeParse(answers);
  if (!parsed.success) return { ok: false, error: "응답이 올바르지 않아요." };

  const view = await buildEventView(event);
  const expected = new Set(view.candidates.map((candidate) => candidate.slotKey));
  const submitted = new Set(parsed.data.map((answer) => answer.slotKey));
  const complete =
    expected.size > 0 &&
    submitted.size === parsed.data.length &&
    submitted.size === expected.size &&
    [...submitted].every((slotKey) => expected.has(slotKey));
  if (!complete) {
    return {
      ok: false,
      error: "후보 시간이 바뀌었거나 빠진 응답이 있어요. 새로고침한 뒤 모든 시간에 답해 주세요.",
    };
  }

  await saveResponses(eventId, me.memberId, parsed.data);
  return { ok: true };
}

export async function confirmMeetEvent(
  eventId: string,
  date: string,
  startMin: number,
  place: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireMember();

  const event = await getAccessibleEvent(eventId, me.memberId);
  if (!event) return { ok: false, error: "연습 일정을 찾지 못했어요." };
  if (event.createdBy !== me.memberId && me.role !== "admin") {
    return { ok: false, error: "일정을 만든 사람만 확정할 수 있어요." };
  }
  if (!dateSchema.safeParse(date).success) return { ok: false, error: "날짜가 올바르지 않아요." };

  await confirmEvent(eventId, date, startMin, place);
  return { ok: true };
}

export async function cancelMeetEvent(
  eventId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireMember();

  const event = await getAccessibleEvent(eventId, me.memberId);
  if (!event) return { ok: false, error: "연습 일정을 찾지 못했어요." };
  if (event.createdBy !== me.memberId && me.role !== "admin") {
    return { ok: false, error: "일정을 만든 사람만 취소할 수 있어요." };
  }

  await cancelEvent(eventId);
  return { ok: true };
}
