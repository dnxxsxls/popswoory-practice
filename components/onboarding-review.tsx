"use client";

import { useState } from "react";
import type { OnboardingStep } from "@/lib/onboarding";
import { OnboardingShell } from "./onboarding-shell";
import { ScheduleReview } from "./schedule-review";
import type { ScheduleBlock } from "@/lib/store";

type Phase = "analyze" | "confirm" | "personal" | "final";

/** 단계마다 묻는 것이 달라서 제목도 같이 바뀐다. 셸이 하나만 들고 있는다. */
const COPY: Record<Phase, { step: OnboardingStep; title: string; subtitle?: string }> = {
  analyze: {
    step: "analyze",
    title: "시간표를 읽는 중이에요",
    subtitle: "잠깐만 기다려 주세요.",
  },
  confirm: {
    step: "classes",
    title: "수업 시간이 일치하나요?",
    subtitle: "다르면 눌러서 고칠 수 있어요.",
  },
  personal: {
    step: "personal",
    title: "그 밖에 안되는 시간이 있나요?",
    subtitle: "알바·통학처럼 매주 반복되는 일정을 넣어주세요.",
  },
  final: {
    step: "final",
    title: "마지막으로 확인해주세요!",
    subtitle: "확정하면 연습 일정을 잡을 때 자동으로 반영돼요.",
  },
};

export function OnboardingReview({
  initial,
  hasImage,
}: {
  initial: ScheduleBlock[];
  hasImage: boolean;
}) {
  const [phase, setPhase] = useState<Phase>(
    initial.length === 0 && hasImage ? "analyze" : "confirm",
  );
  const copy = COPY[phase];

  return (
    <OnboardingShell step={copy.step} title={copy.title} subtitle={copy.subtitle}>
      <ScheduleReview
        initial={initial}
        hasImage={hasImage}
        doneHref="/onboarding/group"
        showStepLabel={false}
        onPhaseChange={setPhase}
      />
    </OnboardingShell>
  );
}
