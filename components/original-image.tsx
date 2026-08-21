"use client";

import { useState } from "react";

/**
 * 올린 원본 이미지. 세로가 길어 결과를 아래로 밀어내므로 기본은 접어둔다.
 * 대조가 필요할 때만 펼친다.
 */
export function OriginalImage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-4 text-[15px] font-bold"
      >
        올린 원본
        <span className="flex items-center gap-1 text-[15px] font-medium text-muted">
          {open ? "접기" : "펼치기"}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={open ? "rotate-180" : ""}
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {open ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/api/timetable/image" alt="올린 시간표 원본" className="block w-full" />
      ) : null}
    </div>
  );
}
