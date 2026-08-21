"use client";

import { useEffect, useState } from "react";
import { Card } from "./ui";

/** 문구와 노출 시간(ms). 마지막 항목은 OVERTIME 까지 유지된다. */
const MESSAGES: { text: string; ms: number }[] = [
  { text: "시간표 뜯어보는 중…", ms: 2000 },
  { text: "칸마다 시간 재보는 중…", ms: 2500 },
  { text: "오, 이 시간표 좀 빡세네요…", ms: 1500 },
  { text: "공강 찾아내는 중…", ms: 3000 },
  { text: "거의 다 됐어요!", ms: Infinity },
];

/** 이 시간을 넘기면 오래 걸린다고 알려준다 */
const OVERTIME_MS = 15000;
const OVERTIME_TEXT = "조금 오래걸리네요..! 조금만 더 기다려주세요!";

const TICK_MS = 200;

/** 누적 시간으로 지금 보여줄 문구를 고른다 */
function messageAt(elapsed: number): { text: string; key: number } {
  if (elapsed >= OVERTIME_MS) return { text: OVERTIME_TEXT, key: MESSAGES.length };

  let acc = 0;
  for (let i = 0; i < MESSAGES.length; i++) {
    acc += MESSAGES[i].ms;
    if (elapsed < acc) return { text: MESSAGES[i].text, key: i };
  }
  return { text: MESSAGES[MESSAGES.length - 1].text, key: MESSAGES.length - 1 };
}

export function AnalyzingCard() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((v) => v + TICK_MS), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const { text, key } = messageAt(elapsed);
  const overtime = elapsed >= OVERTIME_MS;

  // 100% 로 채우면 '다 됐는데 왜 안 넘어가지' 가 되므로 95% 에서 멈춘다
  const progress = Math.min(95, (elapsed / OVERTIME_MS) * 95);

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-[3px] border-line border-t-accent" />
        <div className="min-w-0">
          <p key={key} className="msg-in break-keep text-[17px] font-bold">
            {text}
          </p>
          {!overtime ? <p className="mt-1 text-[15px] text-muted">10초쯤 걸려요.</p> : null}
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-all duration-200 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </Card>
  );
}
