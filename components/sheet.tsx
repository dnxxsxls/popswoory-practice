"use client";

import { useEffect, type ReactNode } from "react";

/**
 * 아래에서 올라오는 창. 시간표 등록 완료 안내와 같은 모양을 쓴다.
 * 배경을 누르거나 esc 로 닫힌다.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    // 시트가 떠 있는 동안 뒤 배경이 같이 스크롤되는 것을 막는다
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-40 mx-auto max-h-[88dvh] max-w-md overflow-y-auto rounded-t-[28px] bg-surface p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-[0_-8px_32px_rgba(0,0,0,0.12)]"
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-line" />
        {title ? <h2 className="text-[22px] font-extrabold">{title}</h2> : null}
        {children}
      </div>
    </>
  );
}
