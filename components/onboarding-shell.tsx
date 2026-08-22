import Image from "next/image";
import type { ReactNode } from "react";
import { Badge } from "./ui";

export const ONBOARDING_STEPS = 3;

/**
 * 온보딩 전용 셸.
 *
 * 하단 탭도 로그아웃도 없다 — 지금 해야 할 일 말고는 갈 곳이 없는 화면이라
 * 덮개로 가릴 필요 자체가 없다. 기능 화면(AppShell)과 일부러 분리해 둔다.
 */
export function OnboardingShell({
  step,
  label,
  title,
  subtitle,
  children,
  footer,
  mascot = false,
}: {
  step: number;
  label: string;
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** 첫 화면처럼 여백이 남는 단계에서 마스코트를 세운다 */
  mascot?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+2.5rem)]">
      <div className="flex items-center gap-2">
        <Badge tone="accent">
          {step} / {ONBOARDING_STEPS}
        </Badge>
        <span className="text-[13px] font-bold text-muted">{label}</span>
      </div>

      <h1 className="mt-4 whitespace-pre-line break-keep text-[26px] font-extrabold leading-tight">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{subtitle}</p>
      ) : null}

      <div className="mt-7">{children}</div>

      {/*
        마스코트는 내용 바로 아래에서 시작해 화면 밖까지 이어진다. 좌우·아래 여백을
        되돌려 화면 끝에 붙이고, 살짝 기울여 아래쪽이 잘린 채로 서 있게 한다.
        내용이 길어지면 알아서 밀려난다.
      */}
      {mascot ? (
        <div className="pointer-events-none relative -mx-5 -mb-[calc(env(safe-area-inset-bottom)+1.25rem)] mt-3 min-h-[240px] flex-1 overflow-hidden">
          {/* 음표는 따로 둔다 — 캐릭터에 붙어 있으면 음표를 살리려고 캐릭터
              크기·위치가 묶여서 원하는 만큼 키우거나 잘라낼 수 없다. */}
          <Image
            src="/mascot/note.png"
            alt=""
            width={171}
            height={220}
            priority
            className="note-float absolute right-9 top-6 w-[3.6rem]"
          />

          {/* 화면 아래에서 빼꼼 올라온 모양 — 아래를 화면 밖으로 내려 잘라낸다. */}
          <Image
            src="/mascot/wave.png"
            alt=""
            width={760}
            height={900}
            priority
            className="absolute bottom-0 left-1/2 w-[110%] max-w-none -translate-x-[38%] translate-y-[15%] -rotate-[12deg]"
          />
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {footer ? <div className="mt-6">{footer}</div> : null}
    </div>
  );
}
