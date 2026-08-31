"use client";

import { useState } from "react";
import Link from "next/link";
import type { FreeTable } from "@/lib/free-time";
import { FreeGrid } from "./free-grid";
import { Badge, Card } from "./ui";

export type FreeGroupView = {
  no: number;
  memberCount: number;
  table: FreeTable;
  names: Record<string, string>;
};

function FreeGroupPanel({ group }: { group: FreeGroupView }) {
  if (group.table.totalKnown === 0) {
    return (
      <Card>
        <p className="text-[17px] font-bold">아직 계산할 시간표가 없어요</p>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          {group.no}조 멤버가 시간표를 등록하면 겹치는 공강 시간대가 여기에 표시됩니다.
        </p>
        <Link href="/timetable" className="mt-4 inline-block text-[15px] font-bold text-accent">
          내 시간표 등록하기 →
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {group.table.missing.length > 0 ? (
        <Card className="!p-4 ring-2 ring-accent">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[15px] leading-relaxed">
              <span className="font-semibold">{group.table.missing.join(", ")}</span> 님의
              시간표가 없어요. 이 계산에서는{" "}
              <span className="text-[17px] font-bold">제약 없음</span>으로 잡혀 있어요.
            </p>
            <Badge tone="warn">{group.table.missing.length}명</Badge>
          </div>
        </Card>
      ) : null}

      <FreeGrid table={group.table} names={group.names} />

      <p className="px-1 pt-1 text-[13px] leading-relaxed text-muted">
        여기 나온 시간은 <span className="font-medium text-fg">후보</span>일 뿐이에요. 수업이
        없다고 해서 반드시 되는 건 아니니, 실제 일정은 각자 확인을 받아야 해요.
      </p>
    </div>
  );
}

export function FreeGroupTabs({ groups }: { groups: FreeGroupView[] }) {
  const [active, setActive] = useState(groups[0]?.no ?? null);
  const current = groups.find((group) => group.no === active) ?? groups[0] ?? null;
  if (!current) return null;

  if (groups.length === 1) {
    return <FreeGroupPanel group={current} />;
  }

  const firstActive = groups[0].no === current.no;

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 gap-1 overflow-x-auto">
          {groups.map((group) => {
            const selected = group.no === current.no;
            return (
              <button
                key={group.no}
                type="button"
                onClick={() => setActive(group.no)}
                aria-pressed={selected}
                className={`h-10 shrink-0 rounded-t-xl px-5 text-[15px] font-bold transition-colors duration-200 ease-in-out ${
                  selected ? "bg-surface text-accent" : "bg-surface-2 text-muted"
                }`}
              >
                {group.no}조
              </button>
            );
          })}
        </div>

        <span className="mb-1 inline-flex h-8 shrink-0 items-center rounded-full bg-surface px-3.5 text-[13px] font-bold text-fg-2 ring-1 ring-inset ring-line">
          {current.table.totalKnown}/{current.memberCount}명
        </span>
      </div>

      <div
        className={`rounded-2xl bg-surface p-5 transition-[border-radius] duration-200 ease-in-out ${
          firstActive ? "rounded-tl-none" : ""
        }`}
      >
        <p className="text-[17px] font-bold">{current.no}조 공강표</p>
        <p className="mt-1.5 text-[14px] text-muted">
          조원 {current.memberCount}명 중 {current.table.totalKnown}명의 시간표를 합쳤어요.
        </p>
      </div>

      <div key={current.no} className="tab-in mt-3">
        <FreeGroupPanel group={current} />
      </div>
    </div>
  );
}
