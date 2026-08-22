"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { undoGroups } from "@/actions/onboarding";
import { OnboardingShell } from "./onboarding-shell";
import { TimetableUploader } from "./timetable-uploader";

/** 올리기와 크롭은 같은 단계지만 묻는 것이 다르다. 제목만 갈아 끼운다. */
const COPY = {
  upload: {
    title: "시간표를 올려주세요",
    subtitle: "한 번만 올려두면 이후 연습 일정에 자동 반영돼요.",
  },
  crop: { title: "남길 영역을 정해주세요", subtitle: undefined },
} as const;

export function OnboardingUpload() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [phase, setPhase] = useState<"upload" | "crop">("upload");
  const copy = COPY[phase];

  // 사진을 고르기 전 화면에서 뒤로 가면 조 선택으로 — 저장한 역할·조를 비운다.
  function goBack() {
    start(async () => {
      await undoGroups();
      router.replace("/onboarding");
      router.refresh();
    });
  }

  return (
    <OnboardingShell
      step="upload"
      title={copy.title}
      subtitle={copy.subtitle}
      onBack={phase === "upload" ? goBack : undefined}
      backDisabled={pending}
    >
      <TimetableUploader
        mode="onboarding"
        reviewHref="/onboarding/review"
        onPhaseChange={setPhase}
      />
    </OnboardingShell>
  );
}
