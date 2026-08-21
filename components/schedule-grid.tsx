import type { ReactNode } from "react";

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

export function formatMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

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

/** 블록에 맞춰 표시할 요일 수와 시간 범위를 정한다. */
export function gridBounds(blocks: { weekday: number; startMin: number; endMin: number }[]) {
  const maxWeekday = blocks.reduce((acc, b) => Math.max(acc, b.weekday), 4); // 최소 월~금
  const startHour = Math.min(9, ...blocks.map((b) => Math.floor(b.startMin / 60)));
  const endHour = Math.max(22, ...blocks.map((b) => Math.ceil(b.endMin / 60)));
  return { dayCount: maxWeekday + 1, startHour, endHour };
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

/** 읽기 전용 시간표. */
export function ScheduleGrid({ blocks }: { blocks: GridBlock[] }) {
  const { dayCount, startHour, endHour } = gridBounds(blocks);
  const spanMin = (endHour - startHour) * 60;

  return (
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
  );
}
