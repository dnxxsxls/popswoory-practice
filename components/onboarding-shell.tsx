import Image from "next/image";
import type { ReactNode } from "react";
import { TOTAL_ONBOARDING_STEPS, stepNumber, type OnboardingStep } from "@/lib/onboarding";

/** 이전 단계로. 저장된 것이 있으면 지우고 가야 가드가 다시 앞으로 밀지 않는다. */
export function OnboardingBack({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="이전 단계로"
      className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-fg-2 disabled:opacity-40"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 5 8 12l7 7" />
      </svg>
    </button>
  );
}

/** 화면 맨 위에서 전체 과정을 보여주는 끊어진 진행바. 왼쪽부터 차오른다. */
function ProgressBar({ done }: { done: number }) {
  return (
    <div className="flex gap-1" aria-label={`${TOTAL_ONBOARDING_STEPS}단계 중 ${done}단계`}>
      {Array.from({ length: TOTAL_ONBOARDING_STEPS }, (_, i) => (
        <span
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors duration-300 ease-in-out ${
            i < done ? "bg-accent" : "bg-line"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * 온보딩 전용 셸.
 *
 * 하단 탭도 로그아웃도 없다 — 지금 해야 할 일 말고는 갈 곳이 없는 화면이라
 * 덮개로 가릴 필요 자체가 없다. 기능 화면(AppShell)과 일부러 분리해 둔다.
 *
 * 높이를 화면에 딱 맞추고 내용 영역만 넘칠 때 스크롤한다. 진행바와 버튼은
 * 제자리에 붙어 있고, 짧은 화면에서도 페이지 전체가 밀려 올라가지 않는다.
 */
export function OnboardingShell({
  step,
  title,
  subtitle,
  children,
  footer,
  back,
  mascot = false,
}: {
  step: OnboardingStep;
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** 이전 단계로 가는 버튼. 되돌아갈 곳이 있는 화면에만 넣는다 */
  back?: ReactNode;
  /** 첫 화면처럼 여백이 남는 단계에서 마스코트를 세운다 */
  mascot?: boolean;
}) {
  return (
    <div className="relative mx-auto flex h-dvh max-w-md flex-col overflow-hidden px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <ProgressBar done={stepNumber(step)} />

      <div className="mt-2 h-10">{back}</div>

      {/*
        마스코트는 스크롤 영역 밖에 두어 화면 아래에 고정된다. 내용이 길어져
        스크롤이 생겨도 따라 움직이지 않는다.
      */}
      {mascot ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] overflow-hidden">
          <Image
            src="/mascot/note.png"
            alt=""
            width={171}
            height={220}
            priority
            className="note-rise absolute right-9 top-10 w-[3.6rem]"
          />
          <Image
            src="/mascot/wave.png"
            alt=""
            width={760}
            height={900}
            priority
            className="mascot-rise absolute bottom-0 left-1/2 w-[110%] max-w-none"
          />
        </div>
      ) : null}

      {/* 넘칠 때만 스크롤된다. min-h-0 이 없으면 flex 자식이 줄지 않아 넘침이 밖으로 샌다. */}
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto pt-3">
        <h1 className="whitespace-pre-line break-keep text-[26px] font-extrabold leading-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{subtitle}</p>
        ) : null}

        <div className="mt-6 pb-2">{children}</div>
      </div>

      {footer ? <div className="relative z-10 mt-4">{footer}</div> : null}
    </div>
  );
}
