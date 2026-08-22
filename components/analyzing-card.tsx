"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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
const OVERTIME_TEXT = "조금 오래 걸리네요..\n조금만 더 기다려주세요!";

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

/**
 * 떠 있는 달력 위를 돋보기가 도는 3D 로딩.
 * 궤도 중심은 달력의 오른쪽 아래(62%, 68%)에 두고, 작은 반지름만큼 밀어낸 뒤
 * 같은 주기로 역회전시켜 돋보기 기울기를 그대로 유지한다.
 */
function AnalyzingLoader() {
  return (
    <div className="relative h-[236px] w-[236px]" aria-hidden="true">
      {/*
       * 은은한 배경광.
       * 예전엔 이미지에 filter: drop-shadow 를 걸었는데, iOS 사파리가 첫 방문처럼
       * PNG 알파가 아직 디코딩되기 전에 필터를 적용하면 그림자를 그림 모양이 아니라
       * 이미지 '사각형' 에 그려서 네모 자국이 남았다. 그래서 이미지에는 필터를 걸지
       * 않고, 뒤에 그라디언트를 따로 깔아 같은 느낌을 낸다.
       */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,rgba(37,99,235,0.16),rgba(37,99,235,0)_62%)]" />

      {/* 바닥 그림자 — 떠오를 때 같이 좁아진다 */}
      <div className="absolute inset-x-12 bottom-3 h-4">
        <div className="loader-shadow h-full w-full rounded-[50%] bg-accent/25 blur-lg" />
      </div>

      <div className="loader-float absolute inset-0 flex items-center justify-center">
        <Image
          src="/loading/calendar.png"
          alt=""
          width={560}
          height={563}
          priority
          className="w-[184px]"
        />
      </div>

      {/* 궤도 중심점 */}
      <div className="absolute left-[62%] top-[68%] h-0 w-0">
        <div className="loader-orbit h-0 w-0">
          {/* 반지름 */}
          <div className="h-0 w-0 translate-x-[18px]">
            <div className="loader-orbit-reverse h-0 w-0">
              <Image
                src="/loading/magnifier.png"
                alt=""
                width={320}
                height={320}
                priority
                className="w-[96px] max-w-none -translate-x-1/2 -translate-y-1/2"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnalyzingCard() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((v) => v + TICK_MS), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const { text, key } = messageAt(elapsed);
  const overtime = elapsed >= OVERTIME_MS;

  return (
    <div className="flex min-h-[calc(100dvh-19rem)] flex-col items-center justify-center gap-1 py-4">
      <AnalyzingLoader />

      {/*
       * 문구가 한 줄에서 두 줄로 늘어나도 위쪽 아이콘이 밀리지 않도록
       * 두 줄 높이를 미리 잡아두고 그 안에서 가운데 정렬한다.
       */}
      <div className="mt-6 flex h-[58px] items-center justify-center">
        <p
          key={key}
          className="msg-in whitespace-pre-line break-keep text-center text-[20px] font-extrabold leading-[1.35]"
        >
          {text}
        </p>
      </div>
      <p className="h-6 text-[15px] text-muted">{!overtime ? "약 10초정도 걸려요." : null}</p>
    </div>
  );
}
