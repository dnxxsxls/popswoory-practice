"use client";

import { useState } from "react";
import { ScheduleGrid, type GridBlock } from "./schedule-grid";
import { Sheet } from "./sheet";
import { Badge, Button } from "./ui";

/** 명단 한 줄에 필요한 것만. 튜토리얼과 우리 조 탭이 함께 쓴다. */
export type RosterMember = {
  id: string;
  displayName: string;
  /** 본인이 튜토리얼에서 고른 역할. 멘토와 조원은 겹치지 않는다. */
  mentor: boolean;
  /** 분석·검토를 마친 수업 블록. 비어 있으면 아직 등록 전이다. */
  blocks: GridBlock[];
};

export const isReady = (m: RosterMember) => m.blocks.length > 0;

/**
 * 멘토 먼저, 그다음 조원. 넘겨받은 순서(가입순)를 그대로 두려고
 * 역할만 비교하고 sort 의 안정성에 기댄다.
 */
export function sortByRole(members: RosterMember[]): RosterMember[] {
  return [...members].sort((a, b) => Number(b.mentor) - Number(a.mentor));
}

export function RoleTag({ mentor }: { mentor: boolean }) {
  // 멘토·조원 모두 두 글자라 폭이 같아 이름 시작점이 저절로 맞는다.
  return <Badge tone={mentor ? "outlineAccent" : "outline"}>{mentor ? "멘토" : "조원"}</Badge>;
}

/** 역할 태그 · 이름 · 시간표 상태 한 줄. 긴 닉네임은 말줄임으로 자른다. */
export function RosterRow({
  member,
  isMe = false,
}: {
  member: RosterMember;
  isMe?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ready = isReady(member);

  return (
    <div className="flex items-center gap-3">
      <RoleTag mentor={member.mentor} />
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate text-[15px] font-bold">{member.displayName}</span>
        {isMe ? <span className="shrink-0 text-[13px] font-medium text-muted">(나)</span> : null}
      </div>

      {ready ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex shrink-0 items-center rounded-lg bg-accent-soft px-2.5 py-1 text-[13px] font-bold text-accent"
          >
            등록 완료
          </button>

          <Sheet
            open={open}
            onClose={() => setOpen(false)}
            title={`${member.displayName} 님의 시간표`}
          >
            <p className="mt-2 text-[15px] text-muted">
              수업 {member.blocks.filter((b) => b.kind !== "personal").length}개
              {member.blocks.some((b) => b.kind === "personal")
                ? ` · 개인일정 ${member.blocks.filter((b) => b.kind === "personal").length}개`
                : null}
            </p>

            <div className="mt-4">
              <ScheduleGrid blocks={member.blocks} />
            </div>

            <div className="mt-6">
              <Button full variant="secondary" onClick={() => setOpen(false)}>
                닫기
              </Button>
            </div>
          </Sheet>
        </>
      ) : (
        <Badge>미등록</Badge>
      )}
    </div>
  );
}
