"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMeetEvent } from "@/actions/events";
import { Button, ErrorText, Field, Input } from "./ui";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const DURATIONS = [
  { label: "1시간", value: 60 },
  { label: "2시간", value: 120 },
  { label: "3시간", value: 180 },
];

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

export function EventCreateForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [durationMin, setDuration] = useState(120);
  const [error, setError] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);

  const { label, cells } = monthCalendar(monthOffset);

  function toggle(value: string) {
    setDates((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await createMeetEvent({ title, dates, durationMin });
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
          가능한 날짜
          {dates.length > 0 ? <span className="ml-1 text-accent">{dates.length}일</span> : null}
        </p>
        <div className="rounded-2xl bg-surface p-3">
          <div className="mb-1 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setMonthOffset((v) => Math.max(0, v - 1))}
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
              onClick={() => setMonthOffset((v) => Math.min(6, v + 1))}
              aria-label="다음 달"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>

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
              const on = dates.includes(cell.value);
              return (
                <button
                  key={cell.value}
                  type="button"
                  disabled={cell.isPast}
                  onClick={() => toggle(cell.value)}
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

        <p className="mt-2 px-1 text-[13px] text-muted">여러 날을 고르면 후보가 늘어나요.</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-fg-2">얼마나 만날까요</p>
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDuration(d.value)}
              className={`h-12 flex-1 rounded-xl text-[15px] font-bold ${
                durationMin === d.value ? "bg-accent text-accent-fg" : "bg-surface text-fg-2"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <ErrorText>{error}</ErrorText>

      <Button type="submit" full disabled={pending || !title.trim() || dates.length === 0}>
        {pending ? "만드는 중…" : "후보 시간 보기"}
      </Button>
    </form>
  );
}
