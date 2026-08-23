"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkNameAvailable, updateProfile } from "@/actions/profile";
import type { GroupRole } from "@/lib/store";
import {
  RoleGroupPicker,
  isRoleGroupReady,
  sortGroupNos,
  type RoleGroupValue,
} from "./role-group-picker";
import { PinChangeForm } from "./pin-change-form";
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
  const [mode, setMode] = useState<"profile" | "pin">("profile");
  const [name, setName] = useState(displayName);
  const [value, setValue] = useState<RoleGroupValue>({
    role: groupRole,
    groupNos,
  });
  const [error, setError] = useState("");
  const [nameCheck, setNameCheck] = useState<null | { ok: boolean; text: string }>(null);

  /** 열 때마다 저장된 값으로 되돌린다 — 고치다 만 상태가 남지 않게. */
  function openSheet() {
    setName(displayName);
    setValue({ role: groupRole, groupNos });
    setError("");
    setNameCheck(null);
    setMode("profile");
    setOpen(true);
  }

  function checkName() {
    setError("");
    start(async () => {
      const res = await checkNameAvailable(name);
      if (!res.ok) {
        setNameCheck({ ok: false, text: res.error });
        return;
      }
      setNameCheck(
        res.available
          ? { ok: true, text: "쓸 수 있는 닉네임이에요." }
          : { ok: false, text: "이미 등록된 이름이에요." },
      );
    });
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
      <Button type="button" variant="outline" size="sm" onClick={openSheet}>
        수정
      </Button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={mode === "pin" ? "PIN 변경" : "내 정보 수정"}
      >
        {mode === "pin" ? (
          <PinChangeForm onBack={() => setMode("profile")} />
        ) : (
          <>
            <div className="mt-5">
              <Field
                label="닉네임"
                hint="로그인할 때 쓰는 이름이에요. 바꾸면 다음 로그인부터 새 이름을 입력해야 해요."
              >
                <div className="flex gap-2">
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      // 이름이 바뀌면 앞서 본 결과는 더 이상 이 이름의 결과가 아니다
                      setNameCheck(null);
                    }}
                    maxLength={9}
                    placeholder="닉네임"
                  />
                  <Button
                    variant="secondary"
                    className="shrink-0 px-4 text-[15px]"
                    disabled={pending || name.trim().length === 0}
                    onClick={checkName}
                  >
                    중복 확인
                  </Button>
                </div>
              </Field>

              {nameCheck ? (
                <p
                  className={`mt-2 text-[13px] font-bold ${
                    nameCheck.ok ? "text-accent" : "text-danger"
                  }`}
                >
                  {nameCheck.text}
                </p>
              ) : null}

              {/* PIN 도 로그인에 쓰는 값이라 닉네임 바로 아래에 둔다 */}
              <button
                type="button"
                onClick={() => setMode("pin")}
                className="mt-4 text-[15px] font-bold text-accent"
              >
                PIN 변경하기 →
              </button>
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
          </>
        )}
      </Sheet>
    </>
  );
}
