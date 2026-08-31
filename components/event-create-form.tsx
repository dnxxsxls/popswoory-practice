"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMeetEvent } from "@/actions/events";
import { Button, ErrorText, Field, Input } from "./ui";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
/** 소요시간 조절 폭과 범위. 기본은 2시간에서 시작한다. */
const DURATION_STEP = 30;
const DURATION_MIN = 30;
const DURATION_MAX = 360;
const DURATION_DEFAULT = 120;

/**
 * 아이폰 타이머처럼 분을 늘 붙여 "2시간 00분" 으로 읽는다. 다만 한 시간이 안 될
 * 때까지 "0시간 30분" 이라고 쓰지는 않는다 — 우리말로 읽으면 어색하다.
 */
function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분`;
  return `${h}시간 ${String(m).padStart(2, "0")}분`;
}

/** 가을발표회 — 달력에서 강조 표시한다 */
const SHOWCASE = { date: "2026-10-03", label: "가을발표회" };

type DayCell = {
  value: string;
  date: number;
  day: number;
  isPast: boolean;
  isToday: boolean;
  isShowcase: boolean;
};

const toValue = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** 해당 월의 달력 배치. 1일이 오는 요일만큼 앞을 빈 칸으로 채운다. */
function monthCalendar(offset: number): {
  label: string;
  cells: (DayCell | null)[];
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const view = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const year = view.getFullYear();
  const month = view.getMonth();

  const lead = new Date(year, month, 1).getDay(); // 0=일
  const total = new Date(year, month + 1, 0).getDate();

  const cells: (DayCell | null)[] = Array.from({ length: lead }, () => null);

  for (let d = 1; d <= total; d++) {
    const date = new Date(year, month, d);
    cells.push({
      value: toValue(date),
      date: d,
      day: date.getDay(),
      isPast: date < today,
      isToday: date.getTime() === today.getTime(),
      isShowcase: toValue(date) === SHOWCASE.date,
    });
  }

  while (cells.length % 7 !== 0) cells.push(null);

  return { label: `${year}년 ${month + 1}월`, cells };
}

export function EventCreateForm({ groupNos }: { groupNos: number[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  // 연습 하나는 하루짜리다. 고르지 않았으면 빈 문자열.
  const [date, setDate] = useState("");
  const [groupNo, setGroupNo] = useState<number | null>(groupNos.length === 1 ? groupNos[0] : null);
  const [durationMin, setDuration] = useState(DURATION_DEFAULT);
  /**
   * 방금 밀려난 값과 방향. 늘리면 아래에서 위로, 줄이면 위에서 아래로 굴러간다.
   * 애니메이션이 끝나면 지워서 다음 번에 다시 걸리게 한다.
   */
  const [rolled, setRolled] = useState<{ value: number; up: boolean } | null>(null);

  // 모션을 끈 환경에서는 animationend 가 오지 않는다. 시간으로 지워야 밀려난 값이
  // 새 값 위에 겹친 채 남지 않는다.
  useEffect(() => {
    if (!rolled) return;
    const t = setTimeout(() => setRolled(null), 260);
    return () => clearTimeout(t);
  }, [rolled]);

  function stepDuration(delta: number) {
    const next = Math.min(DURATION_MAX, Math.max(DURATION_MIN, durationMin + delta));
    if (next === durationMin) return;
    setRolled({ value: durationMin, up: delta > 0 });
    setDuration(next);
  }
  const [error, setError] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);
  /** 달력이 어느 쪽에서 밀려 들어올지. 누른 화살표를 따라간다. */
  const [slide, setSlide] = useState<"next" | "prev">("next");

  const { label, cells } = monthCalendar(monthOffset);

  function goMonth(delta: 1 | -1) {
    const next = Math.min(6, Math.max(0, monthOffset + delta));
    if (next === monthOffset) return;
    setSlide(delta > 0 ? "next" : "prev");
    setMonthOffset(next);
  }

  /** 같은 날을 다시 누르면 선택이 풀리고, 다른 날을 누르면 그 날로 옮겨간다. */
  function pick(value: string) {
    setDate((prev) => (prev === value ? "" : value));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await createMeetEvent({ title, dates: [date], durationMin, groupNo });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace(`/events/${res.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {groupNos.length > 1 ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-fg-2">어느 조의 연습인가요?</p>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface p-3">
            {groupNos.map((no) => (
              <button
                key={no}
                type="button"
                onClick={() => setGroupNo(no)}
                aria-pressed={groupNo === no}
                className={`h-12 rounded-xl text-[15px] font-bold ${
                  groupNo === no ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg-2"
                }`}
              >
                {no}조
              </button>
            ))}
          </div>
          <p className="mt-2 px-1 text-[13px] text-muted">고른 조의 멤버에게만 일정이 보여요.</p>
        </div>
      ) : null}

      <Field label="연습 이름">
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 30))}
          placeholder="예) 합주 연습"
        />
      </Field>

      <div>
        <p className="mb-2 text-sm font-semibold text-fg-2">
          연습할 날짜
        </p>
        <div className="rounded-2xl bg-surface p-3">
          <div className="mb-1 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              disabled={monthOffset === 0}
              aria-label="이전 달"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-2 disabled:opacity-25"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>

            <span className="text-[17px] font-bold">{label}</span>

            <button
              type="button"
              onClick={() => goMonth(1)}
              aria-label="다음 달"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>

          {/* 월 이름·화살표는 제자리에 두고, 이 안쪽만 옆에서 밀려 들어온다 */}
          <div className="overflow-hidden">
            <div key={monthOffset} className={slide === "next" ? "cal-next" : "cal-prev"}>
              <div className="grid grid-cols-7">
                {DAY_LABELS.map((d, i) => (
                  <span
                    key={d}
                    className={`py-1.5 text-center text-[12px] font-bold ${
                      i === 0 ? "text-danger" : i === 6 ? "text-accent" : "text-muted"
                    }`}
                  >
                    {d}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-1">
                {cells.map((cell, i) => {
                  if (!cell) return <span key={`empty-${i}`} />;
                  const on = date === cell.value;
                  return (
                    <button
                      key={cell.value}
                      type="button"
                      disabled={cell.isPast}
                      onClick={() => pick(cell.value)}
                      aria-pressed={on}
                      aria-label={`${label} ${cell.date}일${cell.isShowcase ? ` · ${SHOWCASE.label}` : ""}`}
                      className="flex flex-col items-center py-1 disabled:cursor-default"
                    >
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-bold ${
                          on
                            ? "bg-accent text-accent-fg"
                            : cell.isShowcase
                              ? "bg-accent-soft text-accent ring-2 ring-accent"
                              : cell.isPast
                                ? "text-muted/40"
                                : cell.day === 0
                                  ? "text-danger"
                                  : cell.day === 6
                                    ? "text-accent"
                                    : "text-fg"
                        }`}
                      >
                        {cell.date}
                      </span>
                      {/* 높이를 맞추기 위해 자리는 늘 잡되, 글자는 필요한 날만 넣는다 */}
                      <span className="mt-0.5 h-3 whitespace-nowrap text-[10px] font-bold text-accent">
                        {cell.isShowcase ? "발표회" : cell.isToday ? "오늘" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-2 px-1 text-[13px] text-muted">
          하루를 골라주세요. 그날 다 같이 비는 시간을 찾아드려요.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-fg-2">얼마나 만날까요</p>
        <div className="flex items-center justify-between rounded-2xl bg-surface p-3">
          <button
            type="button"
            onClick={() => stepDuration(-DURATION_STEP)}
            disabled={durationMin <= DURATION_MIN}
            aria-label="30분 줄이기"
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-2xl font-bold text-fg-2 disabled:opacity-30"
          >
            −
          </button>
          {/*
            숫자가 위아래로 굴러간다. 밀려나는 값과 들어오는 값이 같은 자리를
            지나가야 해서 둘 다 절대 배치하고, 넘치는 부분은 상자가 잘라낸다.
          */}
          <span
            aria-live="polite"
            className="relative block h-8 flex-1 overflow-hidden text-center text-[20px] font-extrabold tabular-nums"
          >
            {rolled ? (
              <span
                key={`out-${rolled.value}`}
                aria-hidden="true"
                className={`absolute inset-0 flex items-center justify-center ${
                  rolled.up ? "roll-out-up" : "roll-out-down"
                }`}
              >
                {formatDuration(rolled.value)}
              </span>
            ) : null}
            <span
              key={durationMin}
              className={`absolute inset-0 flex items-center justify-center ${
                rolled ? (rolled.up ? "roll-in-up" : "roll-in-down") : ""
              }`}
            >
              {formatDuration(durationMin)}
            </span>
          </span>
          <button
            type="button"
            onClick={() => stepDuration(DURATION_STEP)}
            disabled={durationMin >= DURATION_MAX}
            aria-label="30분 늘리기"
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-2xl font-bold text-fg-2 disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      <ErrorText>{error}</ErrorText>

      <Button type="submit" full disabled={pending || !title.trim() || !date || groupNo === null}>
        {pending ? "만드는 중…" : "후보 시간 보기"}
      </Button>
    </form>
  );
}
