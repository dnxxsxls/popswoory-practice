"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelMeetEvent, confirmMeetEvent, saveMyAnswers } from "@/actions/events";
import { formatDate } from "@/lib/candidates";
import { formatMin } from "@/lib/time";
import { Badge, Button, Card, ErrorText } from "./ui";

type CandidateView = {
  date: string;
  startMin: number;
  endMin: number;
  slotKey: string;
  busyIds: string[];
  yesIds: string[];
  noIds: string[];
};

type Props = {
  eventId: string;
  status: "polling" | "confirmed" | "cancelled";
  isOwner: boolean;
  creatorName: string;
  myId: string;
  memberCount: number;
  respondedIds: string[];
  relaxed: boolean;
  names: Record<string, string>;
  candidates: CandidateView[];
  confirmed: { date: string; startMin: number; endMin: number; place: string | null } | null;
};

type Answer = "yes" | "no";

function answersOf(candidates: CandidateView[], myId: string): Record<string, Answer> {
  const answers: Record<string, Answer> = {};
  for (const candidate of candidates) {
    if (candidate.yesIds.includes(myId)) answers[candidate.slotKey] = "yes";
    else if (candidate.noIds.includes(myId)) answers[candidate.slotKey] = "no";
  }
  return answers;
}

function PeopleLine({
  label,
  people,
  tone,
}: {
  label: string;
  people: string[];
  tone: "yes" | "no" | "pending";
}) {
  const toneClass = {
    yes: "text-accent",
    no: "text-danger",
    pending: "text-muted",
  }[tone];

  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-2 text-[13px] leading-relaxed">
      <span className={`font-bold ${toneClass}`}>
        {label} {people.length}
      </span>
      <span className={people.length > 0 ? "text-fg-2" : "text-muted"}>
        {people.length > 0 ? people.join(", ") : "없음"}
      </span>
    </div>
  );
}

export function EventDetail(props: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [place, setPlace] = useState("");
  const [expandedSlotKey, setExpandedSlotKey] = useState<string | null>(null);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    answersOf(props.candidates, props.myId),
  );
  const [savedAnswers, setSavedAnswers] = useState<Record<string, Answer>>(() =>
    answersOf(props.candidates, props.myId),
  );

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = props.candidates.length - answeredCount;
  const answersComplete = props.candidates.length > 0 && unansweredCount === 0;
  const savedAnsweredCount = Object.keys(savedAnswers).length;
  const savedAnswersComplete =
    props.candidates.length > 0 && savedAnsweredCount === props.candidates.length;
  const answerKeys = new Set([...Object.keys(answers), ...Object.keys(savedAnswers)]);
  const answersChanged = [...answerKeys].some((key) => answers[key] !== savedAnswers[key]);
  const allMemberIds = Object.keys(props.names);

  const effectiveRespondedIds = new Set(props.respondedIds.filter((id) => props.names[id]));
  if (savedAnswersComplete) effectiveRespondedIds.add(props.myId);
  else effectiveRespondedIds.delete(props.myId);
  const effectiveRespondedCount = effectiveRespondedIds.size;
  const allResponded = props.memberCount > 0 && effectiveRespondedCount === props.memberCount;
  const readyToFinalize = allResponded && !answersChanged;
  const responsePercent =
    props.memberCount > 0 ? Math.round((effectiveRespondedCount / props.memberCount) * 100) : 0;
  const selectedCandidate = props.candidates.find((c) => c.slotKey === selectedSlotKey) ?? null;
  const unanimousCandidateCount = props.candidates.filter(
    (candidate) => candidatePeople(candidate).yesNames.length === props.memberCount,
  ).length;

  useEffect(() => {
    if (props.status !== "polling") return;

    const refresh = () => router.refresh();
    const interval = window.setInterval(refresh, 5_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [props.status, router]);

  function candidatePeople(candidate: CandidateView) {
    const yes = new Set(candidate.yesIds);
    const no = new Set(candidate.noIds);
    yes.delete(props.myId);
    no.delete(props.myId);

    const mine = answers[candidate.slotKey];
    if (mine === "yes") yes.add(props.myId);
    if (mine === "no") no.add(props.myId);

    const yesIds = allMemberIds.filter((id) => yes.has(id));
    const noIds = allMemberIds.filter((id) => no.has(id));
    const pendingIds = allMemberIds.filter((id) => !yes.has(id) && !no.has(id));
    return {
      yesNames: yesIds.map((id) => props.names[id]),
      noNames: noIds.map((id) => props.names[id]),
      pendingNames: pendingIds.map((id) => props.names[id]),
    };
  }

  function setAnswer(slotKey: string, answer: Answer) {
    setNotice("");
    setAnswers((previous) => {
      if (previous[slotKey] === answer) {
        const next = { ...previous };
        delete next[slotKey];
        return next;
      }
      return { ...previous, [slotKey]: answer };
    });
  }

  function submitAnswers() {
    setError("");
    setNotice("");
    if (!answersComplete) {
      setError(`모든 시간에 답해 주세요. 아직 ${unansweredCount}개가 남았어요.`);
      return;
    }
    start(async () => {
      const result = await saveMyAnswers(
        props.eventId,
        Object.entries(answers).map(([slotKey, answer]) => ({ slotKey, answer })),
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedAnswers({ ...answers });
      setNotice(answeredCount > 0 ? "내 응답을 저장했어요." : "저장한 응답을 모두 지웠어요.");
      router.refresh();
    });
  }

  function confirm(candidate: CandidateView) {
    setError("");
    start(async () => {
      const result = await confirmMeetEvent(
        props.eventId,
        candidate.date,
        candidate.startMin,
        place,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function cancel() {
    setError("");
    start(async () => {
      const result = await cancelMeetEvent(props.eventId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  if (props.status === "confirmed" && props.confirmed) {
    const { date, startMin, endMin, place: spot } = props.confirmed;
    return (
      <div className="space-y-3">
        <Card className="ring-2 ring-accent">
          <Badge tone="accent">확정</Badge>
          <p className="mt-3 text-[26px] font-extrabold leading-tight">{formatDate(date)}</p>
          <p className="mt-1 text-[20px] font-bold text-accent">
            {formatMin(startMin)} – {formatMin(endMin)}
          </p>
          {spot ? <p className="mt-3 text-[15px] text-fg-2">{spot}</p> : null}
        </Card>

        <ErrorText>{error}</ErrorText>

        {props.isOwner ? (
          <Button variant="secondary" full disabled={pending} onClick={cancel}>
            연습 일정 취소
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="!p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[17px] font-bold">응답 현황</p>
          <p className="text-[15px] font-bold tabular-nums text-accent">
            {effectiveRespondedCount} / {props.memberCount}명
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${responsePercent}%` }}
          />
        </div>
        {props.relaxed ? (
          <p className="mt-3 text-[13px] leading-relaxed text-danger">
            전원 공강이 없어 한 명의 시간표와 겹치는 후보까지 포함했어요.
          </p>
        ) : null}
      </Card>

      {props.candidates.length === 0 ? (
        <Card>
          <p className="text-[17px] font-bold">가능한 시간이 없어요</p>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            고른 날짜에는 모일 수 있는 시간이 없어요. 날짜를 바꿔 새 일정을 만들어 주세요.
          </p>
        </Card>
      ) : (
        <>
          <div className="px-1">
            <h2 className="text-[19px] font-extrabold">가능한 시간을 모두 확인해 주세요</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-muted">
              각 시간에 가능 또는 불가능을 눌러주세요. 전부 답하면 한 번에 저장됩니다.
            </p>
          </div>

          <div className="space-y-3">
            {props.candidates.map((candidate) => {
              const mine = answers[candidate.slotKey];
              const people = candidatePeople(candidate);
              const busyNames = candidate.busyIds
                .map((id) => props.names[id])
                .filter((name): name is string => Boolean(name));
              const expanded = expandedSlotKey === candidate.slotKey;

              return (
                <Card key={candidate.slotKey} className="!p-0 overflow-hidden">
                  <div className="p-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_3.75rem_3.75rem] items-center gap-2">
                      <div className="min-w-0">
                        <p className="whitespace-nowrap text-[clamp(19px,5.8vw,22px)] font-extrabold tabular-nums tracking-tight text-accent">
                          {formatMin(candidate.startMin)}–{formatMin(candidate.endMin)}
                        </p>
                        <p className="mt-1 text-[12px] font-bold text-muted">
                          미응답 {people.pendingNames.length}명
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setAnswer(candidate.slotKey, "yes")}
                        aria-pressed={mine === "yes"}
                        className={`h-12 whitespace-nowrap rounded-xl text-[13px] font-bold ${
                          mine === "yes"
                            ? "bg-accent text-accent-fg"
                            : "bg-accent-soft text-accent"
                        }`}
                      >
                        가능 {people.yesNames.length}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setAnswer(candidate.slotKey, "no")}
                        aria-pressed={mine === "no"}
                        className={`h-12 whitespace-nowrap rounded-xl text-[13px] font-bold ${
                          mine === "no"
                            ? "bg-danger text-white"
                            : "bg-surface-2 text-danger"
                        }`}
                      >
                        불가능 {people.noNames.length}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSlotKey((previous) =>
                        previous === candidate.slotKey ? null : candidate.slotKey,
                      )
                    }
                    aria-expanded={expanded}
                    aria-label={expanded ? "사람별 응답 현황 접기" : "사람별 응답 현황 보기"}
                    className="flex h-8 w-full items-center justify-center border-t border-line/70 bg-surface-2/50 text-fg-2"
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className={`text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
                    >
                      <path d="M6 9.5 12 15.5 18 9.5" />
                    </svg>
                  </button>

                  {expanded ? (
                    <div className="border-t border-line/70 bg-surface-2/60 p-4">
                      {busyNames.length > 0 ? (
                        <p className="mb-3 rounded-xl bg-surface px-3 py-2 text-[13px] leading-relaxed text-danger">
                          시간표 겹침: {busyNames.join(", ")}
                        </p>
                      ) : (
                        <p className="mb-3 text-[13px] font-bold text-accent">시간표상 전원 공강이에요.</p>
                      )}
                      <div className="space-y-1.5">
                        <PeopleLine label="가능" people={people.yesNames} tone="yes" />
                        <PeopleLine label="불가" people={people.noNames} tone="no" />
                        <PeopleLine label="미응답" people={people.pendingNames} tone="pending" />
                      </div>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>

          <Card className={answersChanged ? "ring-2 ring-accent" : ""}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[17px] font-bold">내 응답</p>
              <p className="text-[14px] font-bold text-accent">
                {answeredCount} / {props.candidates.length}개 선택
              </p>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              {answersComplete
                ? "모든 시간에 답했어요. 선택을 확인하고 저장해 주세요."
                : `모든 시간에 답해야 저장할 수 있어요. 아직 ${unansweredCount}개 남았어요.`}
            </p>
            {notice ? <p className="mt-3 text-[14px] font-bold text-accent">{notice}</p> : null}
            <div className="mt-4">
              <Button
                full
                disabled={pending || !answersChanged || !answersComplete}
                onClick={submitAnswers}
              >
                {pending
                  ? "저장 중…"
                  : !answersComplete
                    ? `${unansweredCount}개 더 답해 주세요`
                    : answersChanged
                      ? "응답 저장하기"
                      : "저장된 상태예요"}
              </Button>
            </div>
          </Card>
        </>
      )}

      <ErrorText>{error}</ErrorText>

      {readyToFinalize ? (
        props.isOwner ? (
          <Card className="ring-2 ring-accent">
            <Badge tone="accent">전원 응답 완료</Badge>
            <h2 className="mt-3 text-[20px] font-extrabold">최종 시간을 정해 주세요</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
              {unanimousCandidateCount > 0
                ? `전원이 가능한 시간이 ${unanimousCandidateCount}개 있어요.`
                : "전원이 가능한 시간은 없어요. 응답 인원을 비교해 한 시간을 골라주세요."}
            </p>

            <div className="mt-4 space-y-2" role="radiogroup" aria-label="최종 연습 시간">
              {props.candidates.map((candidate) => {
                const selected = selectedSlotKey === candidate.slotKey;
                const people = candidatePeople(candidate);
                const unanimous = people.yesNames.length === props.memberCount;
                return (
                  <button
                    key={candidate.slotKey}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={pending}
                    onClick={() => setSelectedSlotKey(candidate.slotKey)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left ${
                      selected
                        ? "bg-accent-soft ring-2 ring-inset ring-accent"
                        : "bg-surface-2 ring-1 ring-inset ring-line"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold text-muted">
                        {formatDate(candidate.date)}
                      </span>
                      <span className="mt-0.5 block text-[17px] font-extrabold tabular-nums text-fg">
                        {formatMin(candidate.startMin)}–{formatMin(candidate.endMin)}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 text-[13px] font-bold ${
                        unanimous ? "text-accent" : "text-muted"
                      }`}
                    >
                      {unanimous
                        ? "전원 가능"
                        : `${people.yesNames.length}명 가능 · ${people.noNames.length}명 불가`}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-[14px] font-bold text-fg-2">장소 (선택)</span>
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value.slice(0, 40))}
                placeholder="예: 합주실 A"
                className="h-14 w-full rounded-2xl bg-surface-2 px-4 text-[15px] outline-none ring-1 ring-inset ring-line placeholder:text-muted focus:ring-2 focus:ring-accent"
              />
            </label>
            <div className="mt-3">
              <Button
                full
                disabled={pending || !selectedCandidate}
                onClick={() => selectedCandidate && confirm(selectedCandidate)}
              >
                {pending
                  ? "확정 중…"
                  : selectedCandidate
                    ? "이 시간으로 최종 확정"
                    : "시간을 먼저 골라 주세요"}
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="ring-2 ring-accent">
            <Badge tone="accent">전원 응답 완료</Badge>
            <h2 className="mt-3 text-[19px] font-extrabold">모두 답했어요</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
              {props.creatorName}님이 최종 시간을 정하면 확정된 일정을 알려드릴게요.
            </p>
          </Card>
        )
      ) : null}

      {props.isOwner ? (
        <Button variant="ghost" full disabled={pending} onClick={cancel}>
          연습 일정 삭제
        </Button>
      ) : null}
    </div>
  );
}
