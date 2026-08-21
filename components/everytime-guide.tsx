"use client";

import { useState } from "react";

const STEPS = [
  "에브리타임 앱을 열어주세요",
  "하단 탭에서 [시간표]를 눌러주세요",
  "본인 시간표를 선택해주세요",
  "오른쪽 위 톱니바퀴를 눌러주세요",
  "[이미지로 저장]을 눌러주세요",
  "저장된 이미지를 여기에 올려주세요",
];

/** 에브리타임에서 시간표 이미지를 받는 방법 안내. 링크를 누르면 하단 시트로 열린다. */
export function EverytimeGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1 py-2 text-[15px] font-semibold text-accent"
      >
        에타에서 시간표 가져오는 법
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 bg-black/40"
          />
          <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md rounded-t-[28px] bg-surface p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-[0_-8px_32px_rgba(0,0,0,0.12)]">
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-line" />

            <h2 className="text-[22px] font-extrabold leading-snug">
              에타에서 시간표
              <br />
              가져오는 법
            </h2>

            <ol className="mt-6 space-y-4">
              {STEPS.map((text, i) => (
                <li key={text} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold text-accent">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-[15px] leading-relaxed">{text}</span>
                </li>
              ))}
            </ol>

            <p className="mt-6 rounded-xl bg-surface-2 px-4 py-3.5 text-[13px] leading-relaxed text-muted">
              화면을 직접 캡처하는 것보다 훨씬 깔끔하게 저장돼요. 인식도 더 잘 됩니다.
            </p>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 h-14 w-full rounded-2xl bg-accent text-[17px] font-bold text-accent-fg"
            >
              확인했어요
            </button>
          </div>
        </>
      ) : null}
    </>
  );
}
