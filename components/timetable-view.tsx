"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "./ui";
import { TimetableUploader } from "./timetable-uploader";
import { ScheduleGrid, type GridBlock } from "./schedule-grid";

export function TimetableView({
  registeredAt,
  blocks,
  confirmed,
  hasImage,
}: {
  registeredAt: string;
  blocks: GridBlock[];
  confirmed: boolean;
  hasImage: boolean;
}) {
  const [replacing, setReplacing] = useState(false);

  if (replacing) {
    return (
      <div className="space-y-4">
        <TimetableUploader mode="replace" />
        <Button variant="ghost" full onClick={() => setReplacing(false)}>
          취소
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {confirmed ? (
        <>
          {blocks.length > 0 ? (
            <>
              <ScheduleGrid blocks={blocks} />
              <div className="flex items-center gap-4 px-1 text-[13px] font-medium text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-accent" /> 수업{" "}
                  {blocks.filter((b) => b.kind !== "personal").length}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-[#8b95a1]" /> 그 밖{" "}
                  {blocks.filter((b) => b.kind === "personal").length}
                </span>
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-surface p-5">
              <p className="text-[17px] font-bold">등록된 수업이나 반복 일정이 없어요</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
                모든 시간대를 비어 있는 시간으로 계산합니다.
              </p>
            </div>
          )}
          <p className="px-1 text-[13px] text-muted">{registeredAt}에 등록됨</p>
          <div className="flex gap-3">
            <Link
              href="/timetable/review"
              className="inline-flex h-14 flex-1 items-center justify-center rounded-2xl bg-surface-2 text-[17px] font-bold text-fg-2"
            >
              수정
            </Link>
            <Button variant="secondary" className="flex-1" onClick={() => setReplacing(true)}>
              새로 올리기
            </Button>
          </div>
        </>
      ) : (
        <>
          {hasImage ? (
            <div className="overflow-hidden rounded-2xl bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/api/timetable/image" alt="등록된 내 시간표" className="block w-full" />
            </div>
          ) : null}
          <p className="px-1 text-[13px] text-muted">아직 시간표 확인을 마치지 않았어요.</p>
          <Link
            href="/timetable/review"
            className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-accent text-[17px] font-bold text-accent-fg"
          >
            {hasImage ? "수업 시간 자동으로 읽기" : "직접 입력 계속하기"}
          </Link>
          <Button variant="secondary" full onClick={() => setReplacing(true)}>
            다시 올리기
          </Button>
        </>
      )}
    </div>
  );
}
