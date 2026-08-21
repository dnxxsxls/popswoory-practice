import type { ScheduleBlock } from "./store";

/**
 * 멤버들의 시간표를 겹쳐 "다 같이 비어 있는 시간"을 계산한다.
 *
 * 원칙: 시간표는 **불가(막힘)만** 만든다.
 * 여기서 나오는 건 "이론상 후보"일 뿐 확정 근거가 아니다 — 실제 가능 여부는 사람이 답해야 한다.
 */

export const SLOT_MIN = 30;

export type MemberSchedule = {
  memberId: string;
  displayName: string;
  /** 시간표를 등록하지 않은 멤버는 blocks 가 비어 있다 (제약 없음으로 취급하되 따로 표시) */
  blocks: ScheduleBlock[];
  hasSchedule: boolean;
};

export type FreeSlot = {
  weekday: number;
  startMin: number;
  endMin: number;
  busyIds: string[];
  freeIds: string[];
};

export type FreeTable = {
  dayCount: number;
  startHour: number;
  endHour: number;
  slots: FreeSlot[][]; // [weekday][slotIndex]
  totalKnown: number; // 시간표를 등록한 멤버 수
  missing: string[]; // 미등록 멤버 이름
};

function overlaps(block: ScheduleBlock, start: number, end: number) {
  return block.startMin < end && block.endMin > start;
}

export function buildFreeTable(members: MemberSchedule[]): FreeTable {
  const withSchedule = members.filter((m) => m.hasSchedule);
  const allBlocks = withSchedule.flatMap((m) => m.blocks);

  const maxWeekday = allBlocks.reduce((acc, b) => Math.max(acc, b.weekday), 4); // 최소 월~금
  const startHour = Math.min(9, ...allBlocks.map((b) => Math.floor(b.startMin / 60)));
  const endHour = Math.max(22, ...allBlocks.map((b) => Math.ceil(b.endMin / 60)));

  const dayCount = maxWeekday + 1;
  const perDay = ((endHour - startHour) * 60) / SLOT_MIN;

  const slots: FreeSlot[][] = [];

  for (let weekday = 0; weekday < dayCount; weekday++) {
    const daySlots: FreeSlot[] = [];

    for (let i = 0; i < perDay; i++) {
      const startMin = startHour * 60 + i * SLOT_MIN;
      const endMin = startMin + SLOT_MIN;

      const busyIds: string[] = [];
      const freeIds: string[] = [];

      for (const m of withSchedule) {
        const busy = m.blocks.some(
          (b) => b.weekday === weekday && overlaps(b, startMin, endMin),
        );
        (busy ? busyIds : freeIds).push(m.memberId);
      }

      daySlots.push({ weekday, startMin, endMin, busyIds, freeIds });
    }

    slots.push(daySlots);
  }

  return {
    dayCount,
    startHour,
    endHour,
    slots,
    totalKnown: withSchedule.length,
    missing: members.filter((m) => !m.hasSchedule).map((m) => m.displayName),
  };
}
