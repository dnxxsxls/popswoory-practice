import Image from "next/image";
import type { ReactNode } from "react";
import { TOTAL_ONBOARDING_STEPS, stepNumber, type OnboardingStep } from "@/lib/onboarding";

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
 */
export function OnboardingShell({
  step,
  title,
  subtitle,
  children,
  footer,
  mascot = false,
}: {
  step: OnboardingStep;
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** 첫 화면처럼 여백이 남는 단계에서 마스코트를 세운다 */
  mascot?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <ProgressBar done={stepNumber(step)} />

      <h1 className="mt-7 whitespace-pre-line break-keep text-[26px] font-extrabold leading-tight">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{subtitle}</p>
      ) : null}

      <div className="mt-6">{children}</div>

      {/*
        마스코트는 화면 아래에서 빼꼼 올라온 모양. 좌우·아래 여백을 되돌려 화면
        끝에 붙이고, 크기와 위치를 자기 폭 기준 %로 잡아 화면 폭이 달라져도
        상대 위치가 유지된다. 들어올 때 아래에서 올라온다.
      */}
      {mascot ? (
        <div className="pointer-events-none relative -mx-5 -mb-[calc(env(safe-area-inset-bottom)+1.25rem)] mt-3 min-h-[240px] flex-1 overflow-hidden">
          <Image
            src="/mascot/note.png"
            alt=""
            width={171}
            height={220}
            priority
            className="note-rise absolute right-9 top-6 w-[3.6rem]"
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
      ) : (
        <div className="flex-1" />
      )}

      {footer ? <div className="mt-6">{footer}</div> : null}
    </div>
  );
}
