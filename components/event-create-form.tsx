"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMeetEvent } from "@/actions/events";
import { Button, ErrorText, Field, Input } from "./ui";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const DURATIONS = [
  { label: "1시간", value: 60 },
  { label: "2시간", value: 120 },
  { label: "3시간", value: 180 },
];

type DayCell = { value: string; day: number; date: number; month: number; isToday: boolean };

/**
 * 오늘부터 21일치를 달력 배치로 만든다 (사용자 로컬 = KST 가정).
 * 일~토 열이 고정되도록 오늘 앞에는 빈 칸(null)을 채운다.
 */
function upcomingCalendar(): (DayCell | null)[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: (DayCell | null)[] = Array.from({ length: today.getDay() }, () => null);

  for (let i = 0; i < 21; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    cells.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`,
      day: d.getDay(),
      date: d.getDate(),
      month: d.getMonth() + 1,
      isToday: i === 0,
    });
  }

  // 마지막 줄을 7칸으로 맞춘다
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export function EventCreateForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [durationMin, setDuration] = useState(120);
  const [error, setError] = useState("");

  const cells = useMemo(() => upcomingCalendar(), []);

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
          <div className="grid grid-cols-7">
            {DAY_LABELS.map((label, i) => (
              <span
                key={label}
                className={`py-1.5 text-center text-[12px] font-bold ${
                  i === 0 ? "text-danger" : i === 6 ? "text-accent" : "text-muted"
                }`}
              >
                {label}
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
                  onClick={() => toggle(cell.value)}
                  aria-pressed={on}
                  aria-label={`${cell.month}월 ${cell.date}일`}
                  className="flex flex-col items-center py-1"
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-bold ${
                      on
                        ? "bg-accent text-accent-fg"
                        : cell.day === 0
                          ? "text-danger"
                          : cell.day === 6
                            ? "text-accent"
                            : "text-fg"
                    }`}
                  >
                    {cell.date}
                  </span>
                  <span
                    className={`mt-0.5 h-3 text-[10px] font-bold ${
                      cell.isToday ? "text-accent" : "text-transparent"
                    }`}
                  >
                    오늘
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
