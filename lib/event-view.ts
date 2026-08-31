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
  respondedIds: string[];
};

/** 연습 일정 화면에 필요한 것을 한 번에 모아 계산한다. */
export async function buildEventView(event: MeetEvent): Promise<EventView> {
  const [allMembers, schedules, allResponses] = await Promise.all([
    listMembers(),
    listActiveSchedules(),
    listResponses(event.id),
  ]);
  const members = allMembers.filter(
    (member) => event.groupNo !== null && member.groupNos.includes(event.groupNo),
  );
  const memberIds = new Set(members.map((member) => member.id));
  const responses = allResponses.filter((response) => memberIds.has(response.memberId));

  const byMember = new Map(schedules.map((s) => [s.memberId, s]));
  const memberSchedules: MemberSchedule[] = members.map((m) => {
    const schedule = byMember.get(m.id);
    return {
      memberId: m.id,
      displayName: m.displayName,
      blocks: schedule?.blocks ?? [],
      hasSchedule: schedule?.status === "parsed",
    };
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

  const respondedIds = [...new Set(responses.map((r) => r.memberId))];

  return {
    event,
    members,
    names: Object.fromEntries(members.map((m) => [m.id, m.displayName])),
    candidates: withAnswers,
    relaxed,
    respondedIds,
  };
}
