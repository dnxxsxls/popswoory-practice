"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateProfile } from "@/actions/profile";
import type { GroupRole } from "@/lib/store";
import {
  RoleGroupPicker,
  isRoleGroupReady,
  sortGroupNos,
  type RoleGroupValue,
} from "./role-group-picker";
import { Sheet } from "./sheet";
import { Button, ErrorText, Field, Input } from "./ui";

type Props = {
  displayName: string;
  groupRole: GroupRole;
  groupNos: number[];
};

export function ProfileEdit({ displayName, groupRole, groupNos }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(displayName);
  const [value, setValue] = useState<RoleGroupValue>({ role: groupRole, groupNos });
  const [error, setError] = useState("");

  /** 열 때마다 저장된 값으로 되돌린다 — 고치다 만 상태가 남지 않게. */
  function openSheet() {
    setName(displayName);
    setValue({ role: groupRole, groupNos });
    setError("");
    setOpen(true);
  }

  function save() {
    if (value.role === null) return;
    setError("");
    start(async () => {
      const res = await updateProfile({
        displayName: name,
        groupRole: value.role,
        groupNos: sortGroupNos(value.groupNos),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className="text-[13px] font-bold text-accent"
      >
        수정
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="내 정보 수정">
        <div className="mt-5">
          <Field label="닉네임" hint="로그인할 때 쓰는 이름이에요. 바꾸면 다음 로그인부터 새 이름을 입력해야 해요.">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={12}
              placeholder="닉네임"
            />
          </Field>
        </div>

        <div className="mt-6 border-t border-line/70 pt-5">
          <RoleGroupPicker value={value} onChange={setValue} />
        </div>

        <ErrorText>{error}</ErrorText>

        <div className="mt-6 space-y-2">
          <Button
            full
            disabled={pending || name.trim().length === 0 || !isRoleGroupReady(value)}
            onClick={save}
          >
            저장하기
          </Button>
          <Button full variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
            취소
          </Button>
        </div>
      </Sheet>
    </>
  );
}
