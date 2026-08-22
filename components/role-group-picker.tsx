"use client";

import { GROUPS, findGroup } from "@/lib/groups";
import type { GroupRole } from "@/lib/store";

export type RoleGroupValue = {
  role: GroupRole | null;
  groupNos: number[];
};

export const sortGroupNos = (nos: number[]) => [...nos].sort((a, b) => a - b);

/** 저장해도 되는 상태인지. 역할을 고르고 조가 최소 하나는 있어야 한다. */
export function isRoleGroupReady(v: RoleGroupValue): boolean {
  if (v.role === null || v.groupNos.length === 0) return false;
  return v.role === "mentor" || v.groupNos.length === 1;
}

type PickerProps = {
  value: RoleGroupValue;
  onChange: (next: RoleGroupValue) => void;
};

/**
 * 버튼만. 제목을 화면이 직접 들고 있는 온보딩에서는 이 쪽을 쓴다 —
 * 같은 문구를 셸과 카드가 두 번 말하지 않게.
 */
export function RoleButtons({ value, onChange }: PickerProps) {
  function pickRole(next: GroupRole) {
    onChange({
      role: next,
      // 멘토로 여러 조를 고르다 조원으로 바꾸면 한 조만 남긴다
      groupNos: next === "member" ? value.groupNos.slice(0, 1) : value.groupNos,
    });
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {(["mentor", "member"] as const).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => pickRole(r)}
          aria-pressed={value.role === r}
          className={`h-14 rounded-xl text-[17px] font-bold ${
            value.role === r ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg-2"
          }`}
        >
          {r === "mentor" ? "멘토" : "조원"}
        </button>
      ))}
    </div>
  );
}

/** 제목까지 포함한 역할 선택. 내 정보 수정처럼 카드 안에 단독으로 들어갈 때. */
export function RolePicker({ value, onChange }: PickerProps) {
  return (
    <div>
      <p className="text-[17px] font-bold">어떤 역할인가요?</p>
      <p className="mt-1.5 text-[15px] text-muted">가을발표회에서 맡은 자리를 골라주세요.</p>
      <div className="mt-4">
        <RoleButtons value={value} onChange={onChange} />
      </div>
    </div>
  );
}

/** 조 선택 버튼만. */
export function GroupButtons({ value, onChange }: PickerProps) {
  function toggleGroup(no: number) {
    const next =
      value.role === "member"
        ? [no]
        : value.groupNos.includes(no)
          ? value.groupNos.filter((n) => n !== no)
          : [...value.groupNos, no];
    onChange({ ...value, groupNos: next });
  }

  const sorted = sortGroupNos(value.groupNos);

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {GROUPS.map((g) => (
          <button
            key={g.no}
            type="button"
            onClick={() => toggleGroup(g.no)}
            aria-pressed={value.groupNos.includes(g.no)}
            className={`h-12 rounded-xl text-[15px] font-bold ${
              value.groupNos.includes(g.no) ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg-2"
            }`}
          >
            {g.no}조
          </button>
        ))}
      </div>

      {sorted.length > 0 ? (
        <div className="mt-4 space-y-2">
          {sorted.map((no) => {
            const g = findGroup(no);
            if (!g) return null;
            return (
              <div key={no} className="rounded-xl bg-accent-soft px-4 py-3">
                <p className="text-[13px] font-bold text-accent">{g.no}조 멘토</p>
                <p className="mt-0.5 text-[15px] font-bold">{g.mentors.join(" · ")}</p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** 제목까지 포함한 조 선택. */
export function GroupPicker({ value, onChange }: PickerProps) {
  return (
    <div>
      <p className="text-[17px] font-bold">
        {value.role === "mentor" ? "맡고 있는 조를 모두 골라주세요" : "어느 조인가요?"}
      </p>
      <p className="mt-1.5 text-[15px] text-muted">
        {value.role === "mentor"
          ? "두 조를 맡고 있다면 둘 다 골라주세요."
          : "조는 하나만 고를 수 있어요."}
      </p>
      <div className="mt-4">
        <GroupButtons value={value} onChange={onChange} />
      </div>
    </div>
  );
}

/**
 * 역할을 고르면 그 아래에 조 선택이 열린다. 내 정보 수정처럼 한 화면에서
 * 둘 다 보여줘야 하는 곳에서 쓴다. 튜토리얼은 두 부분을 단계로 나눠 쓴다.
 */
export function RoleGroupPicker({ value, onChange }: PickerProps) {
  return (
    <div>
      <RolePicker value={value} onChange={onChange} />
      {value.role !== null ? (
        <div className="mt-6 border-t border-line/70 pt-5">
          <GroupPicker value={value} onChange={onChange} />
        </div>
      ) : null}
    </div>
  );
}
