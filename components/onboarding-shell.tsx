import Image from "next/image";
import type { ReactNode } from "react";
import { TOTAL_ONBOARDING_STEPS, stepNumber, type OnboardingStep } from "@/lib/onboarding";
import { Button } from "./ui";

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
  onBack,
  backDisabled = false,
  topBack,
  mascot = false,
}: {
  step: OnboardingStep;
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
  /** 화면 아래 주 버튼. 이전이 있으면 그 오른쪽에 붙는다 */
  footer?: ReactNode;
  /** 이전 단계로. 되돌아갈 곳이 있는 화면에만 넘긴다 */
  onBack?: () => void;
  backDisabled?: boolean;
  /** 첫 화면에서만 쓰는 상단 아이콘 — 가입 화면으로 되돌아간다 */
  topBack?: ReactNode;
  /** 첫 화면처럼 여백이 남는 단계에서 마스코트를 세운다 */
  mascot?: boolean;
}) {
  return (
    <div className="relative mx-auto flex h-dvh max-w-md flex-col overflow-hidden px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <ProgressBar done={stepNumber(step)} />

      {topBack ? <div className="mt-3 -ml-2">{topBack}</div> : null}

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

      {/*
        넘칠 때만 스크롤된다. min-h-0 이 없으면 flex 자식이 줄지 않아 넘침이 밖으로 샌다.
        z-index 는 두지 않는다 — 쌓임 맥락이 생기면 안에서 열리는 시트가 아무리 높은
        z-index 를 써도 이 영역 밖(아래 버튼)을 덮지 못한다. 마스코트보다는 DOM 순서로
        이미 위에 온다.
      */}
      <div className={`relative min-h-0 flex-1 overflow-y-auto ${topBack ? "pt-4" : "pt-9"}`}>
        <h1 className="whitespace-pre-line break-keep text-[26px] font-extrabold leading-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{subtitle}</p>
        ) : null}

        <div className="mt-6 pb-2">{children}</div>
      </div>

      {/* 이전은 주 버튼 왼쪽에 붙여 모든 화면에서 같은 자리에 둔다 */}
      {footer || onBack ? (
        <div className="relative mt-4 flex gap-3">
          {onBack ? (
            <Button
              variant="secondary"
              className="flex-1"
              disabled={backDisabled}
              onClick={onBack}
            >
              이전
            </Button>
          ) : null}
          {footer ? <div className={onBack ? "flex-[2]" : "flex-1"}>{footer}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
