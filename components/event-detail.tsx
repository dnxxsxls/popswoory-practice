"use client";

import { useState, useTransition } from "react";
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
  title: string;
  status: "polling" | "confirmed" | "cancelled";
  isOwner: boolean;
  myId: string;
  memberCount: number;
  respondedCount: number;
  relaxed: boolean;
  missingSchedule: string[];
  names: Record<string, string>;
  candidates: CandidateView[];
  confirmed: { date: string; startMin: number; endMin: number; place: string | null } | null;
};

type Answer = "yes" | "no";

export function EventDetail(props: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [place, setPlace] = useState("");

  // 내가 이미 답한 내용으로 시작
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => {
    const init: Record<string, Answer> = {};
    props.candidates.forEach((c) => {
      if (c.yesIds.includes(props.myId)) init[c.slotKey] = "yes";
      else if (c.noIds.includes(props.myId)) init[c.slotKey] = "no";
    });
    return init;
  });

  const answeredCount = Object.keys(answers).length;

  function setAnswer(slotKey: string, answer: Answer) {
    setAnswers((prev) => {
      if (prev[slotKey] === answer) {
        const next = { ...prev };
        delete next[slotKey];
        return next;
      }
      return { ...prev, [slotKey]: answer };
    });
  }

  function submitAnswers() {
    setError("");
    start(async () => {
      const res = await saveMyAnswers(
        props.eventId,
        Object.entries(answers).map(([slotKey, answer]) => ({ slotKey, answer })),
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function confirm(c: CandidateView) {
    setError("");
    start(async () => {
      const res = await confirmMeetEvent(props.eventId, c.date, c.startMin, place);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function cancel() {
    setError("");
    start(async () => {
      const res = await cancelMeetEvent(props.eventId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  // ── 확정된 연습 일정 ─────────────────────────────────
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

  // ── 조율 중 ──────────────────────────────────────────
  return (
    <div className="space-y-3">
      <Card className="!p-4">
        <p className="text-[15px] leading-relaxed">
          <span className="font-bold">{props.memberCount}명</span> 중{" "}
          <span className="font-bold text-accent">{props.respondedCount}명</span>이 답했어요.
          {props.relaxed ? (
            <>
              <br />
              전원이 비는 시간이 없어서 <span className="font-bold">1명까지 빠지는 시간</span>도
              함께 보여드려요.
            </>
          ) : null}
        </p>
        {props.missingSchedule.length > 0 ? (
          <p className="mt-2 text-[13px] text-muted">
            시간표 미등록: {props.missingSchedule.join(", ")}
          </p>
        ) : null}
      </Card>

      {props.candidates.length === 0 ? (
        <Card>
          <p className="text-[17px] font-bold">가능한 시간이 없어요</p>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            고른 날짜에는 다 같이 비는 시간이 없어요. 날짜를 더 넓혀서 다시 만들어 보세요.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {props.candidates.map((c) => {
            const mine = answers[c.slotKey];
            const yes = c.yesIds.filter((id) => id !== props.myId).length + (mine === "yes" ? 1 : 0);
            return (
              <Card key={c.slotKey} className="!p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[17px] font-bold">{formatDate(c.date)}</p>
                    <p className="mt-0.5 text-[15px] font-semibold text-accent">
                      {formatMin(c.startMin)} – {formatMin(c.endMin)}
                    </p>
                    {c.busyIds.length > 0 ? (
                      <p className="mt-1.5 text-[13px] text-danger">
                        수업 중: {c.busyIds.map((id) => props.names[id] ?? "?").join(", ")}
                      </p>
                    ) : null}
                    {yes > 0 ? (
                      <p className="mt-1.5 text-[13px] text-muted">가능하다고 답함 {yes}명</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAnswer(c.slotKey, "yes")}
                      aria-pressed={mine === "yes"}
                      aria-label="가능"
                      className={`h-11 w-11 rounded-xl text-[17px] font-bold ${
                        mine === "yes" ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted"
                      }`}
                    >
                      O
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswer(c.slotKey, "no")}
                      aria-pressed={mine === "no"}
                      aria-label="불가"
                      className={`h-11 w-11 rounded-xl text-[17px] font-bold ${
                        mine === "no" ? "bg-danger text-white" : "bg-surface-2 text-muted"
                      }`}
                    >
                      X
                    </button>
                  </div>
                </div>

                {props.isOwner ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => confirm(c)}
                    className="mt-3 h-11 w-full rounded-xl bg-accent-soft text-[15px] font-bold text-accent"
                  >
                    이 시간으로 확정
                  </button>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <ErrorText>{error}</ErrorText>

      {props.candidates.length > 0 ? (
        <>
          {props.isOwner ? (
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value.slice(0, 40))}
              placeholder="장소 (선택) — 확정할 때 같이 저장돼요"
              className="h-14 w-full rounded-2xl bg-surface px-4 text-[15px] outline-none placeholder:text-muted"
              aria-label="장소"
            />
          ) : null}

          <Button full disabled={pending || answeredCount === 0} onClick={submitAnswers}>
            {pending ? "저장 중…" : `내 답 ${answeredCount}개 저장`}
          </Button>
        </>
      ) : null}

      {props.isOwner ? (
        <Button variant="ghost" full disabled={pending} onClick={cancel}>
          연습 일정 삭제
        </Button>
      ) : null}
    </div>
  );
}
