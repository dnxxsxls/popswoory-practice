"use client";

import { useState } from "react";
import { RosterRow, sortByRole, type RosterMember } from "./group-roster";

export type GroupRoster = {
  no: number;
  members: RosterMember[];
};

/**
 * 내가 속한 조의 명단. 겸직 멘토처럼 조가 둘 이상이면 책갈피처럼 넘긴다.
 *
 * 고른 조는 아래 카드와 같은 색이라 한 장으로 이어져 보이고, 나머지는 흐리게
 * 뒤에 깔린다. 높이는 같게 둬서 밑줄이 어긋나 보이지 않게 한다.
 * 조 번호는 책갈피에 이미 있으니 카드 안에서는 반복하지 않는다.
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

  const tabbed = groups.length > 1;
  const roster = sortByRole(current.members);
  const shown = excludeMe ? roster.filter((m) => m.id !== meId) : roster;
  // 첫 탭이 켜져 있으면 그 아래 모서리는 각져야 탭과 한 장으로 이어진다.
  const firstActive = tabbed && groups[0].no === current.no;

  const list =
    shown.length > 0 ? (
      <ul className="space-y-3">
        {shown.map((m) => (
          <li key={m.id}>
            <RosterRow member={m} isMe={m.id === meId} />
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-[15px] leading-relaxed text-muted">{emptyText}</p>
    );

  // 조가 하나면 넘길 것이 없으니 조 번호와 인원까지 전부 카드 안에 담는다.
  if (!tabbed) {
    return (
      <div className="rounded-2xl bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[17px] font-bold">{current.no}조</p>
          <p className="text-[15px] font-semibold text-muted">{roster.length}명</p>
        </div>
        <div className="mt-4">{list}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1">
          {groups.map((g) => {
            const on = g.no === current.no;
            return (
              <button
                key={g.no}
                type="button"
                onClick={() => setActive(g.no)}
                aria-pressed={on}
                className={`h-10 rounded-t-xl px-5 text-[15px] font-bold transition-colors duration-200 ease-in-out ${
                  on ? "bg-surface text-accent" : "bg-surface-2 text-muted"
                }`}
              >
                {g.no}조
              </button>
            );
          })}
        </div>

        {/* 조 번호와 헷갈리지 않게 캡슐 모양으로 확실히 구분한다 */}
        <span className="mr-1 inline-flex h-8 shrink-0 items-center rounded-full bg-surface px-3.5 text-[13px] font-bold text-fg-2 ring-1 ring-inset ring-line">
          {roster.length}명
        </span>
      </div>

      {/* 카드가 탭에 맞붙어야 한 장처럼 보인다. 모서리도 같이 따라 움직인다. */}
      <div
        className={`rounded-2xl bg-surface p-5 transition-[border-radius] duration-200 ease-in-out ${
          firstActive ? "rounded-tl-none" : ""
        }`}
      >
        {/* key 를 바꿔 다시 마운트시켜야 넘길 때마다 애니메이션이 다시 돈다 */}
        <div key={current.no} className="tab-in">
          {list}
        </div>
      </div>
    </div>
  );
}
