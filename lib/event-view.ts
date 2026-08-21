import "server-only";
import { buildFreeTable, type MemberSchedule } from "./free-time";
import { buildCandidates, slotKeyOf, type Candidate } from "./candidates";
import {
  listActiveSchedules,
  listMembers,
  listResponses,
  type MeetEvent,
  type Member,
} from "./store";

export type CandidateView = Candidate & {
  slotKey: string;
  /** 이 후보에 '가능' 이라고 답한 멤버 */
  yesIds: string[];
  /** '안 돼요' 라고 답한 멤버 */
  noIds: string[];
};

export type EventView = {
  event: MeetEvent;
  members: Member[];
  names: Record<string, string>;
  candidates: CandidateView[];
  relaxed: boolean;
  /** 시간표를 등록하지 않아 계산에서 빠진 멤버 이름 */
  missingSchedule: string[];
  /** 한 명이라도 답한 멤버 수 */
  respondedCount: number;
};

/** 연습 일정 화면에 필요한 것을 한 번에 모아 계산한다. */
export async function buildEventView(event: MeetEvent): Promise<EventView> {
  const [members, schedules, responses] = await Promise.all([
    listMembers(),
    listActiveSchedules(),
    listResponses(event.id),
  ]);

  const byMember = new Map(schedules.map((s) => [s.memberId, s]));
  const memberSchedules: MemberSchedule[] = members.map((m) => {
    const blocks = byMember.get(m.id)?.blocks ?? [];
    return { memberId: m.id, displayName: m.displayName, blocks, hasSchedule: blocks.length > 0 };
  });

  const table = buildFreeTable(memberSchedules);
  const { candidates, relaxed } = buildCandidates(table, event.dates, event.durationMin);

  const withAnswers: CandidateView[] = candidates.map((c) => {
    const slotKey = slotKeyOf(c);
    const forSlot = responses.filter((r) => r.slotKey === slotKey);
    return {
      ...c,
      slotKey,
      yesIds: forSlot.filter((r) => r.answer === "yes").map((r) => r.memberId),
      noIds: forSlot.filter((r) => r.answer === "no").map((r) => r.memberId),
    };
  });

  return {
    event,
    members,
    names: Object.fromEntries(members.map((m) => [m.id, m.displayName])),
    candidates: withAnswers,
    relaxed,
    missingSchedule: memberSchedules.filter((m) => !m.hasSchedule).map((m) => m.displayName),
    respondedCount: new Set(responses.map((r) => r.memberId)).size,
  };
}
