"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { chooseGroups } from "@/actions/onboarding";
import type { GroupRole } from "@/lib/store";
import { OnboardingShell } from "./onboarding-shell";
import {
  GroupButtons,
  RoleButtons,
  isRoleGroupReady,
  sortGroupNos,
  type RoleGroupValue,
} from "./role-group-picker";
import { Button, Card, ErrorText } from "./ui";

export function OnboardingRoleGroup({ displayName }: { displayName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState<RoleGroupValue>({ role: null, groupNos: [] });
  const [error, setError] = useState("");

  const sorted = sortGroupNos(value.groupNos);
  // 역할을 고르기 전에는 조 선택을 보여주지 않는다 — 한 번에 하나씩만 묻는다.
  const askingRole = value.role === null;

  function submit() {
    if (!isRoleGroupReady(value)) return;
    setError("");
    start(async () => {
      const res = await chooseGroups({
        groupRole: value.role as GroupRole,
        groupNos: sorted,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace("/onboarding/timetable");
      router.refresh();
    });
  }

  if (askingRole) {
    return (
      <OnboardingShell
        step="role"
        title={
          <>
            반가워요, {displayName} 님!
            <br />
            어떤 역할인가요?
          </>
        }
        subtitle="가을발표회에서 맡은 자리를 골라주세요."
        mascot
      >
        <Card>
          <RoleButtons value={value} onChange={setValue} />
        </Card>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      step="group"
      onBack={() => setValue({ role: null, groupNos: [] })}
      backDisabled={pending}
      title={value.role === "mentor" ? "맡고 있는 조를\n모두 골라주세요" : "어느 조인가요?"}
      subtitle={
        value.role === "mentor"
          ? "두 조를 맡고 있다면 둘 다 골라주세요."
          : "조는 하나만 고를 수 있어요."
      }
      footer={
        <div className="space-y-2">
          <ErrorText>{error}</ErrorText>
          <Button full disabled={pending || !isRoleGroupReady(value)} onClick={submit}>
            확인했어요
          </Button>
        </div>
      }
    >
      <Card>
        <GroupButtons value={value} onChange={setValue} />
      </Card>
    </OnboardingShell>
  );
}
