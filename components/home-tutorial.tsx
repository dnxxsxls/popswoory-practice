"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { chooseGroups, finishTutorial } from "@/actions/onboarding";
import type { GroupRole } from "@/lib/store";
import { GroupTabs, type GroupRoster } from "./group-tabs";
import type { RosterMember } from "./group-roster";
import {
  RoleGroupPicker,
  isRoleGroupReady,
  sortGroupNos,
  type RoleGroupValue,
} from "./role-group-picker";
import { Badge, Button, Card, ErrorText } from "./ui";

export type TimetableState = "none" | "uploaded" | "parsed";

/** 튜토리얼에서 명단을 그리려면 조 정보까지 필요하다. */
export type TutorialMember = RosterMember & { groupNos: number[] };

type Props = {
  /** 이미 고른 게 있으면 1단계를 건너뛴다 */
  initialRole: GroupRole | null;
  initialGroupNos: number[];
  timetable: TimetableState;
  members: TutorialMember[];
  meId: string;
};

const TOTAL_STEPS = 3;

export function HomeTutorial({
  initialRole,
  initialGroupNos,
  timetable,
  members,
  meId,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState(initialRole === null ? 1 : 2);
  const [value, setValue] = useState<RoleGroupValue>({
    role: initialRole,
    groupNos: initialGroupNos,
  });
  const [error, setError] = useState("");

  const sorted = sortGroupNos(value.groupNos);

  function confirmGroups() {
    if (!isRoleGroupReady(value)) return;
    setError("");
    start(async () => {
      const res = await chooseGroups({ groupRole: value.role, groupNos: sorted });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStep(2);
      router.refresh();
    });
  }

  function done() {
    start(async () => {
      await finishTutorial();
      router.refresh();
    });
  }

  // 방금 고른 조는 서버 목록에 아직 반영되기 전일 수 있어, 내 조는 화면에서 고른 값으로 본다.
  const myGroups: GroupRoster[] = sorted.map((no) => ({
    no,
    members: members.filter((m) =>
      m.id === meId ? true : m.groupNos.includes(no),
    ),
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Badge tone="accent">
          {step} / {TOTAL_STEPS}
        </Badge>
        <span className="text-[15px] font-bold">
          {step === 1 ? "행사 및 조 확인" : step === 2 ? "시간표 등록" : "우리 조"}
        </span>
      </div>

      {/* ── 1단계: 역할을 고르면 아래에 조 선택이 열린다 ── */}
      {step === 1 ? (
        <Card>
          <RoleGroupPicker value={value} onChange={setValue} />

          <ErrorText>{error}</ErrorText>

          <div className="mt-4">
            <Button full disabled={pending || !isRoleGroupReady(value)} onClick={confirmGroups}>
              확인했어요
            </Button>
          </div>
        </Card>
      ) : null}

      {/* ── 2단계: 시간표 ── */}
      {step === 2 ? (
        <Card>
          {timetable === "none" ? (
            <>
              <p className="text-[17px] font-bold">시간표를 등록해주세요</p>
              <Link
                href="/timetable"
                className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-accent text-[17px] font-bold text-accent-fg"
              >
                등록하러 가기
              </Link>
            </>
          ) : timetable === "uploaded" ? (
            <>
              <p className="text-[17px] font-bold">시간표를 분석해주세요</p>
              <Link
                href="/timetable/review"
                className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-accent text-[17px] font-bold text-accent-fg"
              >
                분석하러 가기
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[17px] font-bold">시간표 등록이 완료되었어요</p>
                <Badge tone="accent">완료</Badge>
              </div>
              <div className="mt-4">
                <Button full onClick={() => setStep(3)}>
                  다음
                </Button>
              </div>
            </>
          )}
        </Card>
      ) : null}

      {/* ── 3단계: 우리 조에 누가 들어와 있는지 ── */}
      {step === 3 ? (
        <div>
          <GroupTabs groups={myGroups} meId={meId} />

          {/* 한 번 보고 지나가는 화면이라 '앞으로 이렇게 됩니다' 식의 안내는 두지 않는다. */}
          <div className="mt-3">
            <Button full disabled={pending} onClick={done}>
              연습 일정 잡기
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 && timetable !== "parsed" ? (
        <button
          type="button"
          onClick={() => setStep(3)}
          className="block w-full py-2 text-center text-[15px] font-semibold text-muted"
        >
          나중에 할게요
        </button>
      ) : null}
    </div>
  );
}
