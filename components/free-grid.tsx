"use client";

import { useState } from "react";
import { DAY_LABELS, GridFrame, SLOT_PX, formatMin } from "./schedule-grid";
import type { FreeTable } from "@/lib/free-time";

type Props = {
  table: FreeTable;
  names: Record<string, string>;
};

/** 일부만 비는 칸의 옅은 배경. 전원 공강은 아래 runs 오버레이가 그린다. */
function partialTone(freeCount: number, total: number) {
  if (total === 0 || freeCount === total) return "";
  const ratio = freeCount / total;
  if (ratio >= 0.75) return "bg-accent/25";
  if (ratio >= 0.5) return "bg-accent/14";
  if (freeCount === 0) return "bg-surface-2";
  return "bg-accent/7";
}

/** 전원 공강인 연속 구간을 하나의 블록으로 묶는다 — 칸마다 각지게 보이지 않도록. */
function allFreeRuns(table: FreeTable, weekday: number) {
  const runs: { from: number; to: number }[] = [];
  const daySlots = table.slots[weekday] ?? [];
  let start: number | null = null;

  daySlots.forEach((slot, i) => {
    const allFree = table.totalKnown > 0 && slot.busyIds.length === 0;
    if (allFree && start === null) start = i;
    if (!allFree && start !== null) {
      runs.push({ from: start, to: i });
      start = null;
    }
  });
  if (start !== null) runs.push({ from: start, to: daySlots.length });

  return runs;
}

export function FreeGrid({ table, names }: Props) {
  const [picked, setPicked] = useState<{ weekday: number; index: number } | null>(null);

  const selected =
    picked !== null ? table.slots[picked.weekday]?.[picked.index] ?? null : null;

  return (
    <div className="space-y-3">
      <GridFrame
        dayCount={table.dayCount}
        startHour={table.startHour}
        endHour={table.endHour}
        renderColumn={(weekday) => (
          <>
            {table.slots[weekday]?.map((slot, i) => {
              const isSelected = picked?.weekday === weekday && picked?.index === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPicked(isSelected ? null : { weekday, index: i })}
                  style={{ height: SLOT_PX }}
                  aria-label={`${DAY_LABELS[weekday]} ${formatMin(slot.startMin)} ${slot.freeIds.length}명 가능`}
                  className={`block w-full ${
                    // 칸이 색으로 채워져 프레임의 정시 선을 가리므로 여기서 다시 그린다
                    i % 2 === 1 ? "border-b border-line" : ""
                  } ${partialTone(slot.freeIds.length, table.totalKnown)} ${
                    isSelected ? "relative z-20 ring-2 ring-inset ring-accent" : ""
                  }`}
                />
              );
            })}

            {/* 전원 공강 구간 — 연속된 칸을 하나의 둥근 블록으로 */}
            {allFreeRuns(table, weekday).map((run) => (
              <div
                key={run.from}
                style={{ top: run.from * SLOT_PX, height: (run.to - run.from) * SLOT_PX }}
                className="pointer-events-none absolute inset-x-0 z-10 rounded-sm bg-accent"
              />
            ))}
          </>
        )}
      />

      {selected ? (
        <div className="rounded-2xl bg-surface p-5">
          <p className="font-semibold">
            {DAY_LABELS[selected.weekday]} {formatMin(selected.startMin)}–
            {formatMin(selected.endMin)}
          </p>
          <p className="mt-2 text-sm text-muted">
            {selected.busyIds.length === 0 ? (
              <span className="font-bold text-accent">전원 공강</span>
            ) : (
              <>
                수업 중:{" "}
                <span className="text-fg">
                  {selected.busyIds.map((id) => names[id] ?? "?").join(", ")}
                </span>
              </>
            )}
          </p>
        </div>
      ) : (
        <p className="px-1 text-[13px] text-muted">칸을 누르면 그 시간에 누가 수업 중인지 보여줘요.</p>
      )}
    </div>
  );
}
