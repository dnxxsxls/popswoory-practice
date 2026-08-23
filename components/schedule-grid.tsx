"use client";

import { useState, type ReactNode } from "react";
import { DAY_END_HOUR, DAY_START_HOUR, formatMin } from "@/lib/time";

export const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

/** 1시간 높이(px). 세 격자가 같은 눈금을 쓰도록 여기서만 정한다. */
export const HOUR_PX = 44;
export const SLOT_PX = HOUR_PX / 2;

/** 과목명은 표시하지 않는다. 수업과 개인일정만 색으로 구분한다. */
export const CLASS_COLOR = "bg-accent";
export const PERSONAL_COLOR = "bg-[#8b95a1]";

export type GridBlock = {
  weekday: number;
  startMin: number;
  endMin: number;
  title: string;
  confidence: "high" | "low";
  kind?: "class" | "personal";
};

/** 종류가 다른 블록이 맞닿을 때 벌리는 간격(px) */
const KIND_GAP_PX = 1;

/**
 * 세로로 맞닿은 블록의 경계 처리.
 * - 같은 종류끼리 맞닿으면 → 모서리를 각지게 해서 이음매 없이 붙인다
 * - 종류가 다르면(수업 ↔ 개인일정) → 모서리를 살리고 살짝 띄운다
 */
export function blockEdges<T extends { startMin: number; endMin: number; kind?: string }>(
  block: T,
  sameDay: T[],
) {
  const kindOf = (x: T) => x.kind ?? "class";
  const others = sameDay.filter((s) => s !== block);
  const above = others.find((s) => s.endMin === block.startMin);
  const below = others.find((s) => s.startMin === block.endMin);

  const joinedTop = above !== undefined && kindOf(above) === kindOf(block);
  const joinedBottom = below !== undefined && kindOf(below) === kindOf(block);

  return {
    rounding: `${joinedTop ? "" : "rounded-t-sm"} ${joinedBottom ? "" : "rounded-b-sm"}`,
    // 아래쪽 블록만 내려서 간격을 만든다 (양쪽에서 각각 빼면 간격이 두 배가 된다)
    gapTop: above !== undefined && !joinedTop ? KIND_GAP_PX : 0,
  };
}

/**
 * 표시할 요일 수와 시간 범위를 정한다.
 *
 * 시간 범위는 09–22 로 고정이다. 예전에는 블록에 맞춰 늘렸는데, 8시 수업 하나가
 * 있으면 격자 전체가 한 시간씩 밀려 낮 시간이 좁아졌다. 창을 벗어나는 블록은
 * 저장 전에 잘라내므로(lib/time.ts clipToDay) 여기서 가려질 블록은 없다.
 */
export function gridBounds(blocks: { weekday: number }[]) {
  const maxWeekday = blocks.reduce((acc, b) => Math.max(acc, b.weekday), 4); // 최소 월~금
  return { dayCount: maxWeekday + 1, startHour: DAY_START_HOUR, endHour: DAY_END_HOUR };
}

/**
 * 격자 뼈대 — 요일 헤더, 시간축, 세로/가로 선을 그린다.
 * 시각 라벨은 해당 시각의 가로선 위에 중앙 정렬된다.
 */
export function GridFrame({
  dayCount,
  startHour,
  endHour,
  renderColumn,
}: {
  dayCount: number;
  startHour: number;
  endHour: number;
  renderColumn: (weekday: number) => ReactNode;
}) {
  const hourCount = endHour - startHour;
  const hours = Array.from({ length: hourCount + 1 }, (_, i) => startHour + i);
  const bodyHeight = hourCount * HOUR_PX;
  const days = DAY_LABELS.slice(0, dayCount);

  return (
    <div className="overflow-hidden rounded-2xl bg-surface p-1">
      <div className="flex">
        <div className="w-9 shrink-0" />
        {days.map((d) => (
          <div key={d} className="flex-1 py-2.5 text-center text-[13px] font-bold text-fg-2">
            {d}
          </div>
        ))}
      </div>

      <div className="flex py-2">
        {/* 시간축 — 라벨을 가로선 높이에 맞춘다 */}
        <div className="relative w-9 shrink-0" style={{ height: bodyHeight }}>
          {hours.map((h, i) => (
            <span
              key={h}
              style={{ top: i * HOUR_PX }}
              className="absolute right-1.5 -translate-y-1/2 text-[10px] leading-none text-muted tabular-nums"
            >
              {h}
            </span>
          ))}
        </div>

        {days.map((_, weekday) => (
          <div
            key={weekday}
            className="relative flex-1 border-l border-line"
            style={{ height: bodyHeight }}
          >
            {/* 정시 가로선 (맨 위/맨 아래 제외) */}
            {hours.slice(1, -1).map((h, i) => (
              <div
                key={h}
                style={{ top: (i + 1) * HOUR_PX }}
                className="pointer-events-none absolute inset-x-0 border-t border-line"
              />
            ))}
            {renderColumn(weekday)}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 수업은 대개 이 시각이면 끝난다. 뒤가 비어 있으면 접어둔다. */
const COLLAPSED_END_HOUR = 18;

/**
 * 접었을 때의 끝 시각. 블록은 하나도 가리지 않고 비어 있는 꼬리만 잘라낸다.
 * 읽기 전용 격자와 편집 격자가 같은 규칙을 쓰도록 여기서만 정한다.
 */
export function collapsedEndHour(
  blocks: { endMin: number }[],
  fullEnd: number,
): number {
  const last = blocks.reduce(
    (acc, b) => Math.max(acc, Math.ceil(b.endMin / 60)),
    COLLAPSED_END_HOUR,
  );
  return Math.min(fullEnd, last);
}

/** 늦은 시간대를 펼치고 접는 버튼. 접을 게 없으면 아무것도 그리지 않는다. */
export function ExpandHours({
  expanded,
  onToggle,
  shownEnd,
  canExpand,
}: {
  expanded: boolean;
  onToggle: () => void;
  shownEnd: number;
  canExpand: boolean;
}) {
  if (!canExpand) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="flex h-10 w-full items-center justify-center gap-1.5 text-[13px] font-bold text-muted"
    >
      {expanded ? "접기" : `${shownEnd}시 이후 보기`}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={expanded ? "rotate-180" : ""}
      >
        <path d="M6 9.5 12 15.5 18 9.5" />
      </svg>
    </button>
  );
}

/** 읽기 전용 시간표. 늦은 시간대는 접어두고 필요한 사람만 펼친다. */
export function ScheduleGrid({ blocks }: { blocks: GridBlock[] }) {
  const [expanded, setExpanded] = useState(false);
  const { dayCount, startHour, endHour: fullEnd } = gridBounds(blocks);

  const collapsedEnd = collapsedEndHour(blocks, fullEnd);
  const canExpand = collapsedEnd < fullEnd;
  const endHour = expanded || !canExpand ? fullEnd : collapsedEnd;
  const spanMin = (endHour - startHour) * 60;

  return (
    <div>
      <GridFrame
        dayCount={dayCount}
        startHour={startHour}
        endHour={endHour}
        renderColumn={(weekday) => {
          const dayBlocks = blocks.filter((b) => b.weekday === weekday);
          return dayBlocks.map((b, i) => {
            const { rounding, gapTop } = blockEdges(b, dayBlocks);
            return (
              <div
                key={`${b.startMin}-${i}`}
                style={{
                  top: `calc(${((b.startMin - startHour * 60) / spanMin) * 100}% + ${gapTop}px)`,
                  height: `calc(${((b.endMin - b.startMin) / spanMin) * 100}% - ${gapTop}px)`,
                }}
                aria-label={`${b.kind === "personal" ? "개인일정" : "수업"} ${formatMin(
                  b.startMin,
                )}-${formatMin(b.endMin)}`}
                className={`absolute inset-x-0 ${rounding} ${
                  b.kind === "personal" ? PERSONAL_COLOR : CLASS_COLOR
                }`}
              />
            );
          });
        }}
      />

      <ExpandHours
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
        shownEnd={endHour}
        canExpand={canExpand}
      />
    </div>
  );
}
