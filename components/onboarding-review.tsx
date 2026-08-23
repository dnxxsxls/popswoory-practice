"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { undoTimetable } from "@/actions/onboarding";
import type { OnboardingStep } from "@/lib/onboarding";
import { OnboardingShell } from "./onboarding-shell";
import { ScheduleReview } from "./schedule-review";
import type { ScheduleBlock } from "@/lib/store";

type Phase = "analyze" | "failed" | "confirm" | "personal" | "final";

/** 단계마다 묻는 것이 달라서 제목도 같이 바뀐다. 셸이 하나만 들고 있는다. */
const COPY: Record<Phase, { step: OnboardingStep; title: string; subtitle?: string }> = {
  analyze: {
    step: "analyze",
    title: "시간표를 읽는 중이에요",
    subtitle: "잠깐만 기다려 주세요.",
  },
  failed: {
    step: "classes",
    title: "자동 인식에 실패했어요",
    subtitle: undefined, // 실패 사유를 그대로 보여준다
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
  const router = useRouter();
  const [, start] = useTransition();
  const [reason, setReason] = useState("");
  const [phase, setPhase] = useState<Phase>(
    initial.length === 0 && hasImage ? "analyze" : "confirm",
  );
  const copy = COPY[phase];
  // 실패 화면은 사유를 부제목 자리에 그대로 보여준다.
  const subtitle = phase === "failed" ? reason : copy.subtitle;

  // 검토의 뒷단계(그 밖의 시간·최종)는 화면 안에서 이전 버튼이 있다.
  // 첫 단계에서 더 뒤로 가면 올린 시간표를 버리고 업로드부터 다시 한다.
  function goBack() {
    start(async () => {
      await undoTimetable();
      router.replace("/onboarding/timetable");
      router.refresh();
    });
  }

  return (
    <OnboardingShell
      step={copy.step}
      title={copy.title}
      subtitle={subtitle}
    >
      <ScheduleReview
        initial={initial}
        hasImage={hasImage}
        doneHref="/onboarding/group"
        showStepLabel={false}
        onPhaseChange={(next, detail) => {
          setPhase(next);
          if (detail) setReason(detail);
        }}
        onBackFromFirst={goBack}
      />
    </OnboardingShell>
  );
}
