"use client";

import { useState } from "react";
import type { BlockKind } from "@/lib/store";
import {
  CLASS_COLOR,
  DAY_LABELS,
  GridFrame,
  PERSONAL_COLOR,
  SLOT_PX,
  formatMin,
  gridBounds,
  blockEdges,
} from "./schedule-grid";

export const SLOT = 30;

export type EditBlock = {
  key: string;
  weekday: number;
  startMin: number;
  endMin: number;
  title: string;
  confidence: "high" | "low";
  kind: BlockKind;
};

function colorFor(block: EditBlock) {
  return block.kind === "personal" ? PERSONAL_COLOR : CLASS_COLOR;
}

type Props = {
  blocks: EditBlock[];
  onChange: (blocks: EditBlock[]) => void;
  /** 빈 칸을 탭했을 때 만들어지는 블록의 종류 */
  addKind: BlockKind;
  /** 편집 대상 제한 — 지정하면 그 종류만 탭으로 열린다 */
  editableKind?: BlockKind;
};

let keySeq = 0;
const nextKey = () => `blk-new-${keySeq++}`;

export function EditableScheduleGrid({ blocks, onChange, addKind, editableKind }: Props) {
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const { dayCount, startHour, endHour } = gridBounds(blocks);
  const slotsPerDay = (endHour - startHour) * 2;
  const spanMin = (endHour - startHour) * 60;
  const dayBlocksOf = (weekday: number) => blocks.filter((b) => b.weekday === weekday);

  const editing = blocks.find((b) => b.key === editingKey) ?? null;

  function update(key: string, patch: Partial<EditBlock>) {
    onChange(blocks.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  }

  function remove(key: string) {
    onChange(blocks.filter((b) => b.key !== key));
    setEditingKey(null);
  }

  function addAt(weekday: number, startMin: number) {
    const key = nextKey();
    onChange([
      ...blocks,
      {
        key,
        weekday,
        startMin,
        endMin: startMin + SLOT,
        title: "",
        confidence: "high",
        kind: addKind,
      },
    ]);
    setEditingKey(key);
  }

  return (
    <div>
      <GridFrame
        dayCount={dayCount}
        startHour={startHour}
        endHour={endHour}
        renderColumn={(weekday) => (
          <>
            {/* 빈 칸 — 탭하면 그 자리에 블록 추가 */}
            {Array.from({ length: slotsPerDay }, (_, i) => {
              const startMin = startHour * 60 + i * SLOT;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => addAt(weekday, startMin)}
                  aria-label={`${DAY_LABELS[weekday]} ${formatMin(startMin)} 추가`}
                  style={{ height: SLOT_PX }}
                  className="block w-full"
                />
              );
            })}

            {/* 블록 — 탭하면 편집 */}
            {dayBlocksOf(weekday).map((b) => {
              const locked = editableKind !== undefined && b.kind !== editableKind;
              const { rounding, gapTop } = blockEdges(b, dayBlocksOf(weekday));
              return (
                  <button
                    key={b.key}
                    type="button"
                    disabled={locked}
                    onClick={() => setEditingKey(b.key)}
                    style={{
                      top: `calc(${((b.startMin - startHour * 60) / spanMin) * 100}% + ${gapTop}px)`,
                      height: `calc(${((b.endMin - b.startMin) / spanMin) * 100}% - ${gapTop}px)`,
                    }}
                    aria-label={`${b.kind === "personal" ? "개인일정" : "수업"} ${
                      DAY_LABELS[weekday]
                    } ${formatMin(b.startMin)}-${formatMin(b.endMin)} 수정`}
                    className={`absolute inset-x-0 ${rounding} ${colorFor(b)} ${
                      locked ? "opacity-40" : ""
                    } ${
                      b.confidence === "low" ? "ring-2 ring-inset ring-amber-400" : ""
                    } ${editingKey === b.key ? "ring-2 ring-inset ring-white/70" : ""}`}
                  />
                );
            })}
          </>
        )}
      />

      <p className="mt-2.5 px-1 text-[13px] text-muted">
        블록을 누르면 고칠 수 있고, 빈 칸을 누르면 새로 추가돼요.
      </p>

      {editing ? (
        <BlockEditor
          block={editing}
          onChange={(patch) => update(editing.key, patch)}
          onDelete={() => remove(editing.key)}
          onClose={() => setEditingKey(null)}
        />
      ) : null}
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[15px] font-semibold text-fg-2">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(value - SLOT)}
          aria-label={`${label} 30분 줄이기`}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-xl font-bold text-fg-2"
        >
          −
        </button>
        <span className="w-[72px] text-center text-xl font-bold tabular-nums">
          {formatMin(value)}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + SLOT)}
          aria-label={`${label} 30분 늘리기`}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-xl font-bold text-fg-2"
        >
          +
        </button>
      </div>
    </div>
  );
}

function BlockEditor({
  block,
  onChange,
  onDelete,
  onClose,
}: {
  block: EditBlock;
  onChange: (patch: Partial<EditBlock>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-black/40"
      />
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md rounded-t-[28px] bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-[0_-8px_32px_rgba(0,0,0,0.12)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />

        <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <span
            className={`h-3 w-3 rounded ${
              block.kind === "personal" ? PERSONAL_COLOR : CLASS_COLOR
            }`}
          />
          {block.kind === "personal" ? "안 되는 시간" : "수업"}
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-fg-2">요일</span>
            <div className="flex gap-1">
              {DAY_LABELS.slice(0, 7).map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChange({ weekday: i })}
                  className={`h-10 w-10 rounded-xl text-[15px] font-bold ${
                    block.weekday === i ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <Stepper
            label="시작"
            value={block.startMin}
            onChange={(v) => {
              const next = Math.max(0, Math.min(v, block.endMin - SLOT));
              onChange({ startMin: next });
            }}
          />
          <Stepper
            label="종료"
            value={block.endMin}
            onChange={(v) => {
              const next = Math.min(24 * 60, Math.max(v, block.startMin + SLOT));
              onChange({ endMin: next });
            }}
          />

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onDelete}
              className="h-14 flex-1 rounded-2xl bg-surface-2 text-[17px] font-bold text-danger"
            >
              삭제
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-14 flex-[2] rounded-2xl bg-accent text-[17px] font-bold text-accent-fg"
            >
              완료
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
