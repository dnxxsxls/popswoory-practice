"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMemberAccount } from "@/actions/admin";
import { Sheet } from "./sheet";
import { Button, ErrorText } from "./ui";

export function MemberDeleteButton({
  memberId,
  displayName,
}: {
  memberId: string;
  displayName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function remove() {
    setError("");
    start(async () => {
      const result = await deleteMemberAccount(memberId);
      if (!result.ok) {
        setError(result.error);
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
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="shrink-0 rounded-lg bg-surface-2 px-3 py-1.5 text-[13px] font-bold text-danger"
      >
        계정 삭제
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="회원 계정 삭제"
        dismissible={!pending}
      >
        <p className="mt-5 text-[15px] leading-relaxed text-fg-2">
          <strong className="text-fg">{displayName}</strong> 님의 계정을 삭제할까요?
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          즉시 로그아웃되고 회원 명단에서 사라집니다. 기존 일정과 댓글 기록은 보존돼요.
        </p>

        <div className="mt-4">
          <ErrorText>{error}</ErrorText>
        </div>

        <div className="mt-6 space-y-2">
          <Button full disabled={pending} onClick={remove} className="!bg-danger !text-white">
            {pending ? "삭제하는 중…" : "계정 삭제"}
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
      </Sheet>
    </>
  );
}
