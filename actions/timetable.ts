"use server";

import { z } from "zod";
import { requireMember } from "@/lib/guard";
import {
  createManualSchedule,
  getActiveSchedule,
  saveScheduleBlocks,
  scheduleImagePath,
} from "@/lib/store";
import { clipToDay } from "@/lib/time";
import { analyzeTimetableImage, type VisionBlock } from "@/lib/vision";

export type AnalyzeResult =
  | { ok: true; blocks: VisionBlock[]; note: string }
  | { ok: false; message: string; canRetry: boolean };

const memberIdSchema = z.string().uuid();
const SESSION_CHANGED =
  "다른 탭에서 로그인 계정이 바뀌었어요. 이 탭을 새로고침한 뒤 다시 시도해 주세요.";

function matchesPageMember(memberId: string, expectedMemberId: unknown): boolean {
  const parsed = memberIdSchema.safeParse(expectedMemberId);
  return parsed.success && parsed.data === memberId;
}

/** 등록된 최신 시간표 이미지를 분석한다. 저장하지 않고 검토용 결과만 돌려준다. */
export async function analyzeMyTimetable(expectedMemberId: unknown): Promise<AnalyzeResult> {
  const me = await requireMember();
  if (!matchesPageMember(me.memberId, expectedMemberId)) {
    return { ok: false, message: SESSION_CHANGED, canRetry: false };
  }

  const schedule = await getActiveSchedule(me.memberId);
  if (!schedule) return { ok: false, message: "등록된 시간표 이미지가 없어요.", canRetry: false };

  const imagePath = scheduleImagePath(schedule);
  if (!imagePath) return { ok: false, message: "이미지를 읽지 못했어요. 다시 올려주세요.", canRetry: false };

  const result = await analyzeTimetableImage(imagePath);
  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      canRetry: result.reason !== "not_a_timetable",
    };
  }

  return { ok: true, blocks: result.blocks, note: result.note };
}

const blockSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMin: z.number().int().min(0).max(1440),
    endMin: z.number().int().min(0).max(1440),
    title: z.string().max(30),
    confidence: z.enum(["high", "low"]),
    kind: z.enum(["class", "personal"]),
  })
  .refine((b) => b.startMin < b.endMin, { message: "시작 시각이 종료 시각보다 늦어요." });

/** 사람이 검토·수정한 결과를 확정 저장한다. */
export async function saveMyTimetableBlocks(
  expectedMemberId: unknown,
  blocks: unknown,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const me = await requireMember();
  if (!matchesPageMember(me.memberId, expectedMemberId)) {
    return { ok: false, message: SESSION_CHANGED };
  }

  const parsed = z.array(blockSchema).max(80).safeParse(blocks);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력이 올바르지 않아요." };
  }

  // 저장되는 건 언제나 09–22 안이다. 격자가 그 범위만 그리니 화면에서 넘어올 일은
  // 없지만, 여기서 한 번 더 잘라야 저장소와 화면이 어긋나지 않는다.
  const blocksInDay = parsed.data.flatMap((b) => {
    const clipped = clipToDay(b.startMin, b.endMin);
    return clipped ? [{ ...b, startMin: clipped.startMin, endMin: clipped.endMin }] : [];
  });

  const saved = await saveScheduleBlocks(me.memberId, blocksInDay);
  if (!saved) return { ok: false, message: "시간표를 찾지 못했어요." };

  return { ok: true };
}

/** 이미지 없이 직접 입력으로 시작한다. */
export async function startManualTimetable(
  expectedMemberId: unknown,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const me = await requireMember();
  if (!matchesPageMember(me.memberId, expectedMemberId)) {
    return { ok: false, message: SESSION_CHANGED };
  }
  await createManualSchedule(me.memberId);
  return { ok: true };
}
