"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmMeetEvent } from "@/actions/events";
import { formatDate } from "@/lib/candidates";
import { formatMin } from "@/lib/time";
import { Badge, Button, Card, ErrorText } from "./ui";

type CandidateView = {
  date: string;
  startMin: number;
  endMin: number;
  slotKey: string;
  yesIds: string[];
  noIds: string[];
};

type Props = {
  eventId: string;
  memberCount: number;
  candidates: CandidateView[];
};

export function EventConfirm({ eventId, memberCount, candidates }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [place, setPlace] = useState("");
  const [error, setError] = useState("");

  const selectedCandidate =
    candidates.find((candidate) => candidate.slotKey === selectedSlotKey) ?? null;
  const unanimousCandidateCount = candidates.filter(
    (candidate) => candidate.yesIds.length === memberCount,
  ).length;

  function confirm() {
    if (!selectedCandidate) return;
    setError("");
    start(async () => {
      const result = await confirmMeetEvent(
        eventId,
        selectedCandidate.date,
        selectedCandidate.startMin,
        place,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(`/events/${eventId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card className="ring-2 ring-accent">
        <Badge tone="accent">전원 응답 완료</Badge>
        <h2 className="mt-3 text-[20px] font-extrabold">응답 결과에서 한 시간을 골라주세요</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
          {unanimousCandidateCount > 0
            ? `전원이 가능한 시간이 ${unanimousCandidateCount}개 있어요.`
            : "전원이 가능한 시간은 없어요. 참여 가능 인원을 비교해 정해주세요."}
        </p>
      </Card>

      <div className="space-y-2" role="radiogroup" aria-label="최종 연습 시간">
        {candidates.map((candidate) => {
          const selected = selectedSlotKey === candidate.slotKey;
          const unanimous = candidate.yesIds.length === memberCount;
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
                  : "bg-surface ring-1 ring-inset ring-line"
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
                  : `${candidate.yesIds.length}명 가능 · ${candidate.noIds.length}명 불가`}
              </span>
            </button>
          );
        })}
      </div>

      <Card>
        <label className="block">
          <span className="mb-2 block text-[14px] font-bold text-fg-2">장소 (선택)</span>
          <input
            value={place}
            onChange={(event) => setPlace(event.target.value.slice(0, 40))}
            placeholder="예: 합주실 A"
            className="h-14 w-full rounded-2xl bg-surface-2 px-4 text-[15px] outline-none ring-1 ring-inset ring-line placeholder:text-muted focus:ring-2 focus:ring-accent"
          />
        </label>
        <div className="mt-4">
          <Button full disabled={pending || !selectedCandidate} onClick={confirm}>
            {pending
              ? "확정 중…"
              : selectedCandidate
                ? "이 시간으로 최종 확정"
                : "시간을 먼저 골라 주세요"}
          </Button>
        </div>
        {error ? (
          <div className="mt-3">
            <ErrorText>{error}</ErrorText>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
