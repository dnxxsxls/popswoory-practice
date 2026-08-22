"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { chooseGroups, finishTutorial } from "@/actions/onboarding";
import { GROUPS, findGroup } from "@/lib/groups";
import type { GroupRole } from "@/lib/store";
import { GroupTabs, type GroupRoster } from "./group-tabs";
import type { RosterMember } from "./group-roster";
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
  const [role, setRole] = useState<GroupRole | null>(initialRole);
  const [picked, setPicked] = useState<number[]>(initialGroupNos);
  const [error, setError] = useState("");

  // 조원은 한 조만. 멘토는 겸직이 있어 여러 조를 고른다.
  function toggleGroup(no: number) {
    setPicked((prev) =>
      role === "member" ? [no] : prev.includes(no) ? prev.filter((n) => n !== no) : [...prev, no],
    );
  }

  function pickRole(next: GroupRole) {
    setRole(next);
    // 멘토로 여러 조를 고르다 조원으로 바꾸면 한 조만 남긴다.
    setPicked((prev) => (next === "member" ? prev.slice(0, 1) : prev));
  }

  const sorted = [...picked].sort((a, b) => a - b);

  function confirmGroups() {
    if (role === null || sorted.length === 0) return;
    setError("");
    start(async () => {
      const res = await chooseGroups({ groupRole: role, groupNos: sorted });
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
          <p className="text-[17px] font-bold">어떤 역할인가요?</p>
          <p className="mt-1.5 text-[15px] text-muted">가을발표회에서 맡은 자리를 골라주세요.</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["mentor", "member"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => pickRole(r)}
                aria-pressed={role === r}
                className={`h-14 rounded-xl text-[17px] font-bold ${
                  role === r ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg-2"
                }`}
              >
                {r === "mentor" ? "멘토" : "조원"}
              </button>
            ))}
          </div>

          {role !== null ? (
            <div className="mt-6 border-t border-line/70 pt-5">
              <p className="text-[17px] font-bold">
                {role === "mentor" ? "맡고 있는 조를 모두 골라주세요" : "어느 조인가요?"}
              </p>
              <p className="mt-1.5 text-[15px] text-muted">
                {role === "mentor"
                  ? "두 조를 맡고 있다면 둘 다 골라주세요."
                  : "조는 하나만 고를 수 있어요."}
              </p>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {GROUPS.map((g) => (
                  <button
                    key={g.no}
                    type="button"
                    onClick={() => toggleGroup(g.no)}
                    aria-pressed={picked.includes(g.no)}
                    className={`h-12 rounded-xl text-[15px] font-bold ${
                      picked.includes(g.no)
                        ? "bg-accent text-accent-fg"
                        : "bg-surface-2 text-fg-2"
                    }`}
                  >
                    {g.no}조
                  </button>
                ))}
              </div>

              {sorted.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {sorted.map((no) => {
                    const g = findGroup(no);
                    if (!g) return null;
                    return (
                      <div key={no} className="rounded-xl bg-accent-soft px-4 py-3">
                        <p className="text-[13px] font-bold text-accent">{g.no}조 멘토</p>
                        <p className="mt-0.5 text-[15px] font-bold">{g.mentors.join(" · ")}</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          <ErrorText>{error}</ErrorText>

          <div className="mt-4">
            <Button
              full
              disabled={pending || role === null || sorted.length === 0}
              onClick={confirmGroups}
            >
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
          <GroupTabs groups={myGroups} meId={meId} />

          {/* 한 번 보고 지나가는 화면이라 '앞으로 이렇게 됩니다' 식의 안내는 두지 않는다. */}
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
