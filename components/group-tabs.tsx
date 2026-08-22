"use client";

import { useState } from "react";
import { RosterRow, sortByRole, type RosterMember } from "./group-roster";

export type GroupRoster = {
  no: number;
  members: RosterMember[];
};

/**
 * 내가 속한 조의 명단. 겸직 멘토처럼 조가 둘 이상이면 탭으로 넘긴다.
 *
 * 조가 하나면 탭 줄을 아예 그리지 않는다. 누를 것도 없는 탭 한 칸이
 * 자리만 먹고 "다른 조가 있나?" 하고 헷갈리게 만든다.
 */
export function GroupTabs({
  groups,
  meId,
  excludeMe = false,
  emptyText = "아직 이 조에서 가입한 사람은 나뿐이에요.",
}: {
  groups: GroupRoster[];
  meId: string;
  /** 내 정보를 따로 떼어 보여주는 화면에서는 명단에서 나를 뺀다 */
  excludeMe?: boolean;
  emptyText?: string;
}) {
  const [active, setActive] = useState(groups[0]?.no ?? null);
  const current = groups.find((g) => g.no === active) ?? groups[0] ?? null;
  if (!current) return null;

  const roster = sortByRole(current.members);
  const shown = excludeMe ? roster.filter((m) => m.id !== meId) : roster;

  return (
    <div>
      {groups.length > 1 ? (
        <div className="flex gap-1.5 rounded-2xl bg-surface-2 p-1.5">
          {groups.map((g) => (
            <button
              key={g.no}
              type="button"
              onClick={() => setActive(g.no)}
              aria-pressed={g.no === current.no}
              className={`h-11 flex-1 rounded-xl text-[15px] font-bold transition-colors ${
                g.no === current.no ? "bg-surface text-fg shadow-sm" : "text-muted"
              }`}
            >
              {g.no}조
            </button>
          ))}
        </div>
      ) : null}

      <div className={groups.length > 1 ? "mt-4" : ""}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[17px] font-bold">{current.no}조</p>
          <p className="text-[15px] font-semibold text-muted">{roster.length}명</p>
        </div>

        {shown.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {shown.map((m) => (
              <li key={m.id}>
                <RosterRow member={m} isMe={m.id === meId} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[15px] leading-relaxed text-muted">{emptyText}</p>
        )}
      </div>
    </div>
  );
}
