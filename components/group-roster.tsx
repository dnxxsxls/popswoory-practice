import { Badge } from "./ui";

/** 명단 한 줄에 필요한 것만. 튜토리얼과 우리 조 탭이 함께 쓴다. */
export type RosterMember = {
  id: string;
  displayName: string;
  /** 본인이 튜토리얼에서 고른 역할. 멘토와 조원은 겹치지 않는다. */
  mentor: boolean;
  /** 시간표를 읽어서 블록까지 확정한 상태 */
  ready: boolean;
};

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

export function ReadyBadge({ ready }: { ready: boolean }) {
  return ready ? <Badge tone="accent">등록 완료</Badge> : <Badge>미등록</Badge>;
}

/** 역할 태그 · 이름 · 시간표 상태 한 줄. 긴 닉네임은 말줄임으로 자른다. */
export function RosterRow({
  member,
  isMe = false,
}: {
  member: RosterMember;
  isMe?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <RoleTag mentor={member.mentor} />
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate text-[15px] font-bold">{member.displayName}</span>
        {isMe ? <span className="shrink-0 text-[13px] font-medium text-muted">(나)</span> : null}
      </div>
      <ReadyBadge ready={member.ready} />
    </div>
  );
}
