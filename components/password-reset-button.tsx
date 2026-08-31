"use client";

import { useState, useTransition } from "react";
import { resetPasswordToDefault } from "@/actions/admin";
import { Sheet } from "./sheet";
import { Button, ErrorText } from "./ui";

export function PasswordResetButton({
  memberId,
  displayName,
}: {
  memberId: string;
  displayName: string;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function openSheet() {
    setDone(false);
    setError("");
    setOpen(true);
  }

  function reset() {
    setError("");
    start(async () => {
      const result = await resetPasswordToDefault(memberId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className="shrink-0 rounded-lg bg-surface-2 px-3 py-1.5 text-[13px] font-bold text-danger"
      >
        비밀번호 초기화
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="비밀번호 초기화"
        dismissible={!pending}
      >
        {done ? (
          <>
            <p className="mt-5 text-[15px] leading-relaxed text-fg-2">
              {displayName} 님의 임시 비밀번호를 <strong className="font-mono text-fg">0000</strong>
              으로 바꿨어요.
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              로그인 후 내 정보에서 새 비밀번호로 바꾸도록 안내해 주세요.
            </p>
            <div className="mt-6">
              <Button full onClick={() => setOpen(false)}>
                확인
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-5 text-[15px] leading-relaxed text-fg-2">
              {displayName} 님의 비밀번호를 <strong className="font-mono text-fg">0000</strong>
              으로 초기화할까요?
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              현재 로그인된 기기는 모두 로그아웃됩니다.
            </p>

            <ErrorText>{error}</ErrorText>

            <div className="mt-6 space-y-2">
              <Button full disabled={pending} onClick={reset}>
                {pending ? "초기화하는 중…" : "0000으로 초기화"}
              </Button>
              <Button
                type="button"
                full
                variant="ghost"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                취소
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}
