"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { chooseGroup, finishTutorial } from "@/actions/onboarding";
import { GROUPS, findGroup } from "@/lib/groups";
import { Badge, Button, Card, ErrorText } from "./ui";

export type TimetableState = "none" | "uploaded" | "parsed";

export type TutorialMember = {
  id: string;
  displayName: string;
  groupNo: number | null;
  /** 시간표를 읽어서 블록까지 확정한 상태 */
  ready: boolean;
};

type Props = {
  /** 이미 고른 조가 있으면 1단계를 건너뛴다 */
  initialGroupNo: number | null;
  timetable: TimetableState;
  members: TutorialMember[];
  meId: string;
};

const TOTAL_STEPS = 3;

export function HomeTutorial({ initialGroupNo, timetable, members, meId }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState(initialGroupNo === null ? 1 : 2);
  const [picked, setPicked] = useState<number | null>(initialGroupNo);
  const [error, setError] = useState("");

  const group = findGroup(picked);

  // 방금 1단계에서 고른 조는 서버 목록에 아직 반영되기 전일 수 있어, 내 조는 picked 로 본다.
  const mates =
    picked === null
      ? []
      : members.filter((m) => (m.id === meId ? picked : m.groupNo) === picked);

  function isMentor(m: TutorialMember) {
    return group?.mentors.includes(m.displayName) ?? false;
  }

  // 멘토 먼저, 그다음 조원. mates 는 이미 가입순이고 sort 는 안정 정렬이라
  // 멘토끼리 · 조원끼리의 가입 순서는 그대로 남는다.
  const roster = [...mates].sort((a, b) => Number(isMentor(b)) - Number(isMentor(a)));

  function confirmGroup() {
    if (picked === null) return;
    setError("");
    start(async () => {
      const res = await chooseGroup(picked);
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

      {/* ── 1단계: 조 고르고 멘토 확인 ── */}
      {step === 1 ? (
        <Card>
          <p className="text-[17px] font-bold">어느 조인가요?</p>
          <p className="mt-1.5 text-[15px] text-muted">가을발표회 조를 골라주세요.</p>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {GROUPS.map((g) => (
              <button
                key={g.no}
                type="button"
                onClick={() => setPicked(g.no)}
                aria-pressed={picked === g.no}
                className={`h-12 rounded-xl text-[15px] font-bold ${
                  picked === g.no ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg-2"
                }`}
              >
                {g.no}조
              </button>
            ))}
          </div>

          {group ? (
            <div className="mt-4 rounded-xl bg-accent-soft px-4 py-3.5">
              <p className="text-[13px] font-bold text-accent">{group.no}조 멘토</p>
              <p className="mt-1 text-[17px] font-bold">{group.mentors.join(" · ")}</p>
            </div>
          ) : null}

          <ErrorText>{error}</ErrorText>

          <div className="mt-4">
            <Button full disabled={pending || picked === null} onClick={confirmGroup}>
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
        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[17px] font-bold">{group ? `${group.no}조` : "우리 조"}</p>
            <p className="text-[15px] font-semibold text-muted">{mates.length}명 참여</p>
          </div>

          <ul className="mt-4 space-y-3">
            {roster.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                {/* 멘토·조원 모두 두 글자라 폭이 같아 이름 시작점이 자동으로 맞는다 */}
                <Badge tone={isMentor(m) ? "outlineAccent" : "outline"}>
                  {isMentor(m) ? "멘토" : "조원"}
                </Badge>
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="truncate text-[15px] font-bold">{m.displayName}</span>
                  {m.id === meId ? (
                    <span className="shrink-0 text-[13px] font-medium text-muted">(나)</span>
                  ) : null}
                </div>
                {m.ready ? <Badge tone="accent">등록 완료</Badge> : <Badge>미등록</Badge>}
              </li>
            ))}
          </ul>

          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            {roster.length <= 1
              ? "아직 이 조에는 나뿐이에요. 다른 조원이 가입하면 여기에 표시됩니다."
              : "조원이 더 가입하면 여기에 함께 표시돼요."}
          </p>

          <div className="mt-4">
            <Button full disabled={pending} onClick={done}>
              연습 일정 잡기
            </Button>
          </div>
        </Card>
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
