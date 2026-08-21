"use server";

import { z } from "zod";
import { requireMember } from "@/lib/guard";
import {
  cancelEvent,
  confirmEvent,
  createEvent,
  getEvent,
  saveResponses,
} from "@/lib/store";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않아요.");

const createSchema = z.object({
  title: z.string().trim().min(1, "연습 이름을 입력해 주세요.").max(30),
  dates: z.array(dateSchema).min(1, "날짜를 하나 이상 골라주세요.").max(21),
  durationMin: z.number().int().min(30).max(600),
});

export type CreateResult = { ok: true; id: string } | { ok: false; error: string };

export async function createMeetEvent(input: unknown): Promise<CreateResult> {
  const me = await requireMember();

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력이 올바르지 않아요." };
  }

  const event = await createEvent({ createdBy: me.memberId, ...parsed.data });
  return { ok: true, id: event.id };
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

  const event = await getEvent(eventId);
  if (!event) return { ok: false, error: "연습 일정을 찾지 못했어요." };
  if (event.status !== "polling") return { ok: false, error: "이미 확정된 일정이에요." };

  const parsed = answersSchema.safeParse(answers);
  if (!parsed.success) return { ok: false, error: "응답이 올바르지 않아요." };

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

  const event = await getEvent(eventId);
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

  const event = await getEvent(eventId);
  if (!event) return { ok: false, error: "연습 일정을 찾지 못했어요." };
  if (event.createdBy !== me.memberId && me.role !== "admin") {
    return { ok: false, error: "일정을 만든 사람만 취소할 수 있어요." };
  }

  await cancelEvent(eventId);
  return { ok: true };
}
