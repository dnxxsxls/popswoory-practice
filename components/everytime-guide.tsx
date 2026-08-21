"use client";

import Image from "next/image";
import { useRef, useState } from "react";

/** zoom: 작게 보이는 컷은 확대한다. origin 은 강조 부분이 잘리지 않도록 잡는다. */
const STEPS: { text: string; src: string; zoom?: { scale: number; origin: string } }[] = [
  { text: "에브리타임 앱을 열어주세요", src: "/guide/step-1.png" },
  { text: "하단 탭에서 [시간표]를 눌러주세요", src: "/guide/step-2.png" },
  {
    text: "본인 시간표를 선택해주세요",
    src: "/guide/step-3.png",
    zoom: { scale: 1.45, origin: "38% 50%" },
  },
  {
    text: "오른쪽 위 톱니바퀴를 눌러주세요",
    src: "/guide/step-4.png",
    zoom: { scale: 1.45, origin: "64% 50%" },
  },
  {
    text: "[이미지로 저장]을 눌러주세요",
    src: "/guide/step-5.png",
    zoom: { scale: 1.35, origin: "50% 50%" },
  },
  { text: "저장된 이미지를 여기에 올려주세요", src: "/guide/step-6.png" },
];

const SWIPE_PX = 50;

function Arrow({
  dir,
  onClick,
  disabled,
}: {
  dir: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "이전 단계" : "다음 단계"}
      className={`absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center text-fg-2/55 disabled:opacity-0 ${
        dir === "prev" ? "left-0" : "right-0"
      }`}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}

/** 에브리타임에서 시간표 이미지를 받는 방법. 한 컷씩 넘겨서 본다. */
export function EverytimeGuide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const startX = useRef<number | null>(null);

  const current = STEPS[step];

  function close() {
    setOpen(false);
    setStep(0);
  }

  function go(delta: number) {
    setStep((v) => Math.min(STEPS.length - 1, Math.max(0, v + delta)));
  }

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
            onClick={close}
            className="fixed inset-0 z-30 bg-black/40"
          />
          <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md rounded-t-[28px] bg-surface px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />

            <div className="flex items-center justify-between px-1">
              <h2 className="text-[19px] font-extrabold">에타에서 시간표 가져오기</h2>
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-muted"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* 숫자 + 안내 문구가 이미지 위에 온다 */}
            {/* 이미지는 좌우 여백 없이 꽉 채운다 */}
            <div
              className="relative mt-5 touch-pan-y select-none overflow-hidden rounded-2xl bg-surface shadow-[0_2px_16px_rgba(0,0,0,0.07)]"
              onPointerDown={(e) => {
                startX.current = e.clientX;
              }}
              onPointerUp={(e) => {
                if (startX.current === null) return;
                const dx = e.clientX - startX.current;
                startX.current = null;
                if (dx <= -SWIPE_PX) go(1);
                else if (dx >= SWIPE_PX) go(-1);
              }}
            >
              <Image
                key={step}
                src={current.src}
                alt=""
                width={1200}
                height={642}
                priority
                style={
                  current.zoom
                    ? {
                        transform: `scale(${current.zoom.scale})`,
                        transformOrigin: current.zoom.origin,
                      }
                    : undefined
                }
                className="msg-in block aspect-[1200/642] w-full object-cover"
              />

              <Arrow dir="prev" onClick={() => go(-1)} disabled={step === 0} />
              <Arrow dir="next" onClick={() => go(1)} disabled={step === STEPS.length - 1} />
            </div>

            <div className="mt-5 flex min-h-[52px] items-start gap-3 px-1">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold text-accent">
                {step + 1}
              </span>
              <p
                key={step}
                className="msg-in break-keep pt-0.5 text-[17px] font-bold leading-relaxed"
              >
                {current.text}
              </p>
            </div>

            <div className="flex justify-center gap-1.5">
              {STEPS.map((s, i) => (
                <button
                  key={s.src}
                  type="button"
                  onClick={() => setStep(i)}
                  aria-label={`${i + 1}번째 단계`}
                  aria-current={i === step ? "step" : undefined}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? "w-5 bg-accent" : "w-1.5 bg-line"
                  }`}
                />
              ))}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={step === 0}
                className="h-14 flex-1 rounded-2xl bg-surface-2 text-[17px] font-bold text-fg-2 disabled:opacity-40"
              >
                이전
              </button>
              <button
                type="button"
                onClick={() => (step === STEPS.length - 1 ? close() : go(1))}
                className="h-14 flex-[2] rounded-2xl bg-accent text-[17px] font-bold text-accent-fg"
              >
                {step === STEPS.length - 1 ? "확인했어요" : "다음"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
