"use client";

import { useEffect, useRef, useState } from "react";
import type { BlockKind } from "@/lib/store";
import {
  CLASS_COLOR,
  DAY_LABELS,
  GridFrame,
  PERSONAL_COLOR,
  SLOT_PX,
  gridBounds,
  collapsedEndHour,
  ExpandHours,
  blockEdges,
} from "./schedule-grid";
import { formatMin } from "@/lib/time";
import { Sheet } from "./sheet";

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

function colorFor(kind: BlockKind) {
  return kind === "personal" ? PERSONAL_COLOR : CLASS_COLOR;
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

/** 드래그로 그리는 중인 범위. from/to 는 칸 번호(양끝 포함). */
type Draft = { weekday: number; anchor: number; from: number; to: number };

/** 손가락을 이만큼 움직이기 전에 떼면 그냥 탭으로 본다 */
const DRAG_SLOP_PX = 8;
/** 터치에서 이만큼 누르고 있어야 드래그가 시작된다 (그 전엔 화면 스크롤) */
const HOLD_MS = 160;

export function EditableScheduleGrid({
  blocks,
  onChange,
  addKind,
  editableKind,
}: Props) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const { dayCount, startHour, endHour: fullEnd } = gridBounds(blocks);
  // 읽기 격자와 같은 규칙 — 기본은 18시까지, 늦은 일정이 있으면 그만큼 늘어난다.
  const [expanded, setExpanded] = useState(false);
  const collapsed = collapsedEndHour(blocks, fullEnd);
  const canExpand = collapsed < fullEnd;
  const endHour = expanded || !canExpand ? fullEnd : collapsed;
  const slotsPerDay = (endHour - startHour) * 2;
  const spanMin = (endHour - startHour) * 60;
  const dayBlocksOf = (weekday: number) =>
    blocks.filter((b) => b.weekday === weekday);

  const editing = blocks.find((b) => b.key === editingKey) ?? null;
  /**
   * 편집 창이 내려가는 동안에도 안에 든 내용은 그대로 있어야 한다. editingKey 를
   * 비우면 editing 이 곧바로 null 이 되므로, 닫기 직전의 블록을 여기에 남긴다.
   */
  const [closingBlock, setClosingBlock] = useState<EditBlock | null>(null);
  const shownBlock = editing ?? closingBlock;
  const closeEditor = () => {
    setClosingBlock(editing);
    setEditingKey(null);
  };

  const drag = useRef<{
    weekday: number;
    anchor: number;
    el: HTMLElement;
    pointerId: number;
    armed: boolean;
    timer: number | null;
    x: number;
    y: number;
  } | null>(null);
  const draftRef = useRef<Draft | null>(null);
  draftRef.current = draft;
  /** 드래그가 끝난 뒤 따라오는 click 을 한 번 무시하기 위한 표시 */
  const swallowClick = useRef(false);

  /*
   * 드래그하는 동안 화면이 같이 스크롤되지 않게 막는다.
   * touch-action: none 을 상시로 걸면 격자 위에서 아예 스크롤을 못 하게 되므로,
   * 길게 눌러 드래그가 시작된 뒤에만 touchmove 를 막는다. 이 시점엔 손가락이
   * 아직 움직이지 않아 스크롤이 시작되기 전이라 preventDefault 가 먹는다.
   */
  useEffect(() => {
    if (!draft) return;
    const block = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, [draft !== null]);

  const slotMin = (slot: number) => startHour * 60 + slot * SLOT;

  /** 그 칸이 이미 블록에 덮여 있는지 */
  function taken(weekday: number, slot: number) {
    const from = slotMin(slot);
    return dayBlocksOf(weekday).some(
      (b) => from < b.endMin && from + SLOT > b.startMin,
    );
  }

  /** 커서 위치 → 칸 번호 */
  function slotAt(el: HTMLElement, clientY: number) {
    const rect = el.getBoundingClientRect();
    const i = Math.floor(((clientY - rect.top) / rect.height) * slotsPerDay);
    return Math.max(0, Math.min(slotsPerDay - 1, i));
  }

  /** 시작 칸에서 목표 칸 쪽으로, 기존 블록에 막히기 전까지만 늘린다 */
  function extend(weekday: number, anchor: number, target: number) {
    if (target < anchor) {
      let from = anchor;
      while (from - 1 >= target && !taken(weekday, from - 1)) from--;
      return { from, to: anchor };
    }
    let to = anchor;
    while (to + 1 <= target && !taken(weekday, to + 1)) to++;
    return { from: anchor, to };
  }

  function endDrag() {
    const d = drag.current;
    if (d?.timer !== null && d?.timer !== undefined) clearTimeout(d.timer);
    drag.current = null;
    setDraft(null);
  }

  function onPointerDown(
    e: React.PointerEvent<HTMLDivElement>,
    weekday: number,
  ) {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const el = e.currentTarget;
    const anchor = slotAt(el, e.clientY);
    if (taken(weekday, anchor)) return;

    const pointerId = e.pointerId;
    // 새 제스처가 시작될 때마다 초기화한다. pointerup 직후에 따라오는 click 하나만
    // 삼켜야 하는데, 여기서 리셋하지 않으면 그 다음 진짜 탭까지 먹어버린다.
    swallowClick.current = false;
    const arm = () => {
      const d = drag.current;
      if (!d) return;
      d.armed = true;
      d.timer = null;
      swallowClick.current = true;
      // 손가락이 칸 밖으로 나가도 계속 추적되게 한다.
      // 누르고 있는 사이에 포인터가 사라졌으면 실패하는데, 그 경우 그냥 넘어간다.
      try {
        el.setPointerCapture(pointerId);
      } catch {
        // 캡처가 안 돼도 칸 위에서는 그대로 동작한다
      }
      setDraft({ weekday, anchor, from: anchor, to: anchor });
    };

    drag.current = {
      weekday,
      anchor,
      el,
      pointerId,
      armed: false,
      timer: null,
      x: e.clientX,
      y: e.clientY,
    };

    // 마우스는 스크롤과 부딪히지 않으니 바로 시작한다
    if (e.pointerType === "mouse") arm();
    else drag.current.timer = window.setTimeout(arm, HOLD_MS);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;

    if (!d.armed) {
      // 아직 드래그 전에 움직였다면 스크롤 의도로 보고 물러난다
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > DRAG_SLOP_PX)
        endDrag();
      return;
    }

    const { from, to } = extend(d.weekday, d.anchor, slotAt(d.el, e.clientY));
    setDraft({ weekday: d.weekday, anchor: d.anchor, from, to });
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;

    const cur = draftRef.current;
    if (d.armed && cur)
      addRange(cur.weekday, slotMin(cur.from), slotMin(cur.to) + SLOT);
    endDrag();
  }

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

  /** 드래그로 만든 블록. 시간을 이미 지정했으니 편집 시트는 열지 않는다. */
  function addRange(weekday: number, startMin: number, endMin: number) {
    onChange([
      ...blocks,
      {
        key: nextKey(),
        weekday,
        startMin,
        endMin,
        title: "",
        confidence: "high",
        kind: addKind,
      },
    ]);
  }

  return (
    <div>
      <GridFrame
        dayCount={dayCount}
        startHour={startHour}
        endHour={endHour}
        renderColumn={(weekday) => (
          <>
            {/*
             * 빈 칸 레이어 — 탭하면 30분 블록, 길게 눌러 위아래로 끌면 그 구간만큼.
             * 블록은 이 레이어보다 뒤에 그려져 위에 얹히므로, 이미 블록이 있는
             * 자리를 누르면 여기가 아니라 블록의 편집이 잡힌다.
             */}
            <div
              className="absolute inset-0 select-none"
              onPointerDown={(e) => onPointerDown(e, weekday)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={endDrag}
            >
              {Array.from({ length: slotsPerDay }, (_, i) => {
                const startMin = startHour * 60 + i * SLOT;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (swallowClick.current) return;
                      addAt(weekday, startMin);
                    }}
                    aria-label={`${DAY_LABELS[weekday]} ${formatMin(startMin)} 추가`}
                    style={{ height: SLOT_PX }}
                    className="block w-full"
                  />
                );
              })}
            </div>

            {/* 끌고 있는 구간 미리보기 */}
            {draft && draft.weekday === weekday ? (
              <div
                style={{
                  top: `calc(${((slotMin(draft.from) - startHour * 60) / spanMin) * 100}%)`,
                  height: `calc(${(((draft.to - draft.from + 1) * SLOT) / spanMin) * 100}%)`,
                }}
                className={`pointer-events-none absolute inset-x-0 rounded-sm ${colorFor(addKind)} opacity-60 ring-2 ring-inset ring-white/70`}
              />
            ) : null}

            {/* 블록 — 탭하면 편집 */}
            {dayBlocksOf(weekday).map((b) => {
              const locked =
                editableKind !== undefined && b.kind !== editableKind;
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
                  className={`absolute inset-x-0 ${rounding} ${colorFor(b.kind)} ${
                    locked ? "opacity-40" : ""
                  } ${
                    b.confidence === "low"
                      ? "ring-2 ring-inset ring-amber-400"
                      : ""
                  } ${editingKey === b.key ? "ring-2 ring-inset ring-white/70" : ""}`}
                />
              );
            })}
          </>
        )}
      />

      <ExpandHours
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
        shownEnd={endHour}
        canExpand={canExpand}
      />

      <p className="mt-2.5 px-1 text-[13px] leading-relaxed text-muted">
        빈 칸을 누르면 시간표를 추가할 수 있고, 꾹 눌러 위아래로 끌어서 시간표를
        추가할 수도 있어요.
      </p>

      {shownBlock ? (
        <BlockEditor
          open={editing !== null}
          block={shownBlock}
          onChange={(patch) => update(shownBlock.key, patch)}
          onDelete={() => {
            remove(shownBlock.key);
            setClosingBlock(shownBlock);
          }}
          onClose={closeEditor}
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
  open,
  block,
  onChange,
  onDelete,
  onClose,
}: {
  open: boolean;
  block: EditBlock;
  onChange: (patch: Partial<EditBlock>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} padding="compact">
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
                  block.weekday === i
                    ? "bg-accent text-accent-fg"
                    : "bg-surface-2 text-muted"
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
    </Sheet>
  );
}
