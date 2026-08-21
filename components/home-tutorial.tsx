"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { chooseGroup, finishTutorial } from "@/actions/onboarding";
import { GROUPS, findGroup } from "@/lib/groups";
import { Badge, Button, Card, ErrorText } from "./ui";

export type TimetableState = "none" | "uploaded" | "parsed";

type Props = {
  /** 이미 고른 조가 있으면 1단계를 건너뛴다 */
  initialGroupNo: number | null;
  timetable: TimetableState;
  memberCount: number;
  readyCount: number;
};

const TOTAL_STEPS = 3;

export function HomeTutorial({
  initialGroupNo,
  timetable,
  memberCount,
  readyCount,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState(initialGroupNo === null ? 1 : 2);
  const [picked, setPicked] = useState<number | null>(initialGroupNo);
  const [error, setError] = useState("");

  const group = findGroup(picked);

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
          {step === 1 ? "행사 및 조 확인" : step === 2 ? "시간표 등록" : "모임 현황"}
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

      {/* ── 3단계: 모임 현황 ── */}
      {step === 3 ? (
        <Card>
          <div className="flex items-baseline justify-between">
            <p className="text-[17px] font-bold">모임 현황</p>
            <p className="text-[15px] font-semibold text-muted">
              <span className="text-accent">{readyCount}</span> / {memberCount}명
            </p>
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${memberCount ? (readyCount / memberCount) * 100 : 0}%` }}
            />
          </div>

          <p className="mt-3 text-[15px] text-muted">
            {readyCount === memberCount
              ? "전원 등록됐어요."
              : "아직 등록하지 않은 멤버가 있어요."}
          </p>

          <div className="mt-4">
            <Button full disabled={pending} onClick={done}>
              시작하기
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
