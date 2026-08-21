"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/** 앱 진입 스플래시 — 아이콘 · 앱 이름 · 한 줄 슬로건을 잠깐 띄우고 사라진다. */
export function Splash() {
  const [phase, setPhase] = useState<"show" | "fading" | "hidden">("show");

  useEffect(() => {
    const fade = setTimeout(() => setPhase("fading"), 1400);
    const done = setTimeout(() => setPhase("hidden"), 1750);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg transition-opacity duration-300 ${
        phase === "fading" ? "opacity-0" : "opacity-100"
      }`}
    >
      <Image
        src="/icon-192.png"
        alt=""
        width={104}
        height={104}
        priority
        className="rounded-[30px]"
      />

      <p className="mt-5 text-[24px] font-extrabold tracking-tight">연습잡스</p>
      <p className="mt-2 text-[14px] text-muted">팝스우리를 위한, 시간표 기반 연습 일정 도우미</p>
    </div>
  );
}
