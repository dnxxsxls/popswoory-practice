"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "@/actions/auth";

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await signOut();
          router.replace("/join");
          router.refresh();
        })
      }
      className="shrink-0 pt-1.5 text-[15px] font-semibold text-muted hover:text-fg-2 disabled:opacity-50"
    >
      로그아웃
    </button>
  );
}
