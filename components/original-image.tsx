"use client";

import { useState } from "react";
import { Skeleton } from "./ui";

/**
 * 올린 원본 이미지. 세로가 길어 결과를 아래로 밀어내므로 기본은 접어둔다.
 * 대조가 필요할 때만 펼친다.
 *
 * 접혀 있는 동안에도 이미지를 미리 받아둔다 — 펼친 뒤에 받기 시작하면 한참
 * 빈 화면이 보인다. 아직 도착하지 않았으면 자리만 잡아두고 뼈대를 보여준다.
 */
export function OriginalImage({
  memberId,
  defaultOpen = false,
}: {
  memberId: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

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

      {/* 펼치기 전에도 내려받아 둔다. 화면에서만 감춘다. */}
      <div className={open ? "block" : "hidden"}>
        {open && !loaded && !failed ? <Skeleton className="h-64 w-full rounded-none" /> : null}
        {failed ? (
          <p className="px-5 pb-5 text-[14px] leading-relaxed text-danger">
            로그인 계정이 바뀌었어요. 이 탭을 새로고침해 주세요.
          </p>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/timetable/image?memberId=${encodeURIComponent(memberId)}`}
          alt="올린 시간표 원본"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`block w-full ${loaded && !failed ? "" : "hidden"}`}
        />
      </div>
    </div>
  );
}
