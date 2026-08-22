"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { finishTutorial } from "@/actions/onboarding";
import { GroupTabs, type GroupRoster } from "./group-tabs";
import { OnboardingShell } from "./onboarding-shell";
import { Button, Card } from "./ui";

export function OnboardingGroup({ groups, meId }: { groups: GroupRoster[]; meId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function done() {
    start(async () => {
      await finishTutorial();
      // 온보딩이 끝나면 가드가 더 이상 붙잡지 않는다
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <OnboardingShell
      step={3}
      label="우리 조"
      title={"같은 조 사람들이에요"}
      subtitle="이 조원들과 함께 연습 일정을 잡게 돼요."
      footer={
        <Button full disabled={pending} onClick={done}>
          연습 일정 잡기
        </Button>
      }
    >
      <Card>
        <GroupTabs groups={groups} meId={meId} bare />
      </Card>
    </OnboardingShell>
  );
}
