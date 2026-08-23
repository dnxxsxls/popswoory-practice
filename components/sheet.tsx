"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";

/**
 * 아래에서 올라오는 창.
 *
 * 생긴 모양대로 움직인다 — 열면 아래에서 미끄러져 올라오고, 닫으면 내려간다.
 * 위쪽 핸들을 아래로 끌면 손가락을 따라 내려가고, 충분히 내렸거나 아래로 튕기면
 * 그대로 닫힌다. 어중간하면 제자리로 돌아온다.
 *
 * 배경을 누르거나 esc 로도 닫힌다.
 */

/** 창이 내려가는 데 걸리는 시간. globals.css 의 .sheet-panel 과 맞춰야 한다. */
const EXIT_MS = 260;

/** 이만큼 끌어내리면 손을 떼는 순간 닫는다 */
const CLOSE_DISTANCE_PX = 96;

/** 짧게 끌었어도 이 속도(px/ms)로 튕기면 닫는다 */
const CLOSE_VELOCITY = 0.5;

/** 창 안쪽 여백. 쓰는 곳마다 달라서 이름으로 고른다. */
const PADDING = {
  default: "p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]",
  compact: "p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]",
  /** 이미지를 좌우로 꽉 채우는 창 — 위아래만 좁게 준다 */
  flush: "px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]",
} as const;

export function Sheet({
  open,
  onClose,
  title,
  padding = "default",
  dismissible = true,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  padding?: keyof typeof PADDING;
  /**
   * false 면 끌어내리기·배경 누르기·esc 를 모두 막는다.
   * 시간표 등록 완료처럼 안에 있는 버튼으로만 빠져나가는 창에 쓴다.
   */
  dismissible?: boolean;
  children: ReactNode;
}) {
  // open 이 false 로 바뀌어도 내려가는 동안은 계속 그려야 한다
  const [render, setRender] = useState(open);
  // 올라온 상태인지. false 면 화면 아래(translateY 100%)에 있다.
  const [entered, setEntered] = useState(false);
  // 끌고 있는 동안의 이동량(px). null 이면 끌고 있지 않다.
  const [dragY, setDragY] = useState<number | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  const drag = useRef<{ startY: number; lastY: number; lastAt: number } | null>(
    null,
  );

  // open 이 뒤집히는 순간을 렌더 중에 잡는다. effect 안에서 동기적으로 setState
  // 하면 렌더가 한 번 더 연쇄된다 — 그 사이 프레임에 창이 잘못된 위치로 비친다.
  if (open !== prevOpen) {
    setPrevOpen(open);
    // 열 때는 일단 화면 아래(entered=false)에 그려두고, 아래 effect 가 다음
    // 프레임에 올린다. 닫을 때는 같은 값이 그대로 내려가는 신호가 된다.
    setEntered(false);
    setDragY(null);
    if (open) setRender(true);
  }

  useEffect(() => {
    if (!render || !open) return;
    // 화면 아래에 그려둔 다음 프레임에 올린다. 같은 프레임에 두 값을 주면
    // 브라우저가 마지막 것만 보고 애니메이션 없이 튀어나온다.
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [render, open]);

  useEffect(() => {
    if (open || !render) return;
    // 다 내려간 뒤에 걷어낸다
    const t = setTimeout(() => setRender(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open, render]);

  useEffect(() => {
    if (!render) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && dismissible) onClose();
    }
    // 창이 떠 있는 동안 뒤 배경이 같이 스크롤되는 것을 막는다
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [render, dismissible, onClose]);

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!dismissible) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = {
        startY: e.clientY,
        lastY: e.clientY,
        lastAt: e.timeStamp,
      };
      setDragY(0);
    },
    [dismissible],
  );

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    d.lastY = e.clientY;
    d.lastAt = e.timeStamp;
    // 위로는 끌리지 않는다 — 창은 이미 끝까지 올라와 있다
    setDragY(Math.max(0, e.clientY - d.startY));
  }, []);

  const onPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;

      const moved = Math.max(0, e.clientY - d.startY);
      const elapsed = Math.max(1, e.timeStamp - d.lastAt);
      const velocity = (e.clientY - d.lastY) / elapsed;

      if (moved > CLOSE_DISTANCE_PX || velocity > CLOSE_VELOCITY) {
        // dragY 를 그대로 둔 채 내린다. 0 으로 되돌리면 한 번 튀었다가 내려간다.
        setEntered(false);
        setDragY(null);
        onClose();
        return;
      }
      setDragY(null);
    },
    [onClose],
  );

  if (!render) return null;

  const dragging = dragY !== null;
  const translateY = dragging ? `${dragY}px` : entered ? "0px" : "100%";
  // 끌어내리는 만큼 뒷배경도 같이 옅어진다
  const backdropOpacity = entered ? Math.max(0, 1 - (dragY ?? 0) / 320) : 0;

  return (
    <>
      <button
        type="button"
        aria-label="닫기"
        onClick={dismissible ? onClose : undefined}
        disabled={!dismissible}
        style={{ opacity: backdropOpacity }}
        className="sheet-backdrop fixed inset-0 z-30 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        data-dragging={dragging}
        style={{ transform: `translateY(${translateY})` }}
        className={`sheet-panel fixed inset-x-0 bottom-0 z-40 mx-auto max-h-[88dvh] max-w-md overflow-y-auto rounded-t-[28px] bg-surface shadow-[0_-8px_32px_rgba(0,0,0,0.12)] ${PADDING[padding]}`}
      >
        {/* 핸들 — 얇은 막대만으로는 잡기 어려워 위아래로 여백을 넉넉히 준다 */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`-mt-2 mb-3 flex justify-center py-2 ${
            dismissible ? "cursor-grab touch-none active:cursor-grabbing" : ""
          }`}
        >
          <div className="h-1 w-10 rounded-full bg-line" />
        </div>
        {title ? <h2 className="text-[22px] font-extrabold">{title}</h2> : null}
        {children}
      </div>
    </>
  );
}
