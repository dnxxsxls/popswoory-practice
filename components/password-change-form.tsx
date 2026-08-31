"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changePassword } from "@/actions/profile";
import { Button, ErrorText, EyeIcon, Field } from "./ui";

const FIELDS = [
  {
    key: "current",
    label: "지금 비밀번호",
    autoComplete: "current-password",
    minLength: 4,
    placeholder: "지금 비밀번호",
  },
  {
    key: "next",
    label: "새 비밀번호",
    autoComplete: "new-password",
    minLength: 8,
    placeholder: "8자 이상",
  },
  {
    key: "confirm",
    label: "새 비밀번호 다시 입력",
    autoComplete: "new-password",
    minLength: 8,
    placeholder: "8자 이상",
  },
] as const;

type Key = (typeof FIELDS)[number]["key"];

const EMPTY: Record<Key, string> = { current: "", next: "", confirm: "" };
const ALL_HIDDEN: Record<Key, boolean> = { current: false, next: false, confirm: false };

const passwordInputClass =
  "h-14 w-full rounded-2xl bg-surface-2 pl-4 pr-14 text-[17px] font-medium text-fg outline-none placeholder:font-normal placeholder:text-muted focus:bg-accent-soft";

export function PasswordChangeForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [passwords, setPasswords] = useState<Record<Key, string>>(EMPTY);
  const [show, setShow] = useState<Record<Key, boolean>>(ALL_HIDDEN);
  const [error, setError] = useState("");

  const ready = FIELDS.every(({ key, minLength }) => passwords[key].length >= minLength);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const result = await changePassword(passwords);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace("/join");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit}>
      <p className="mt-5 text-[15px] leading-relaxed text-muted">
        바꾸고 나면 로그아웃돼요. 새 비밀번호로 다시 로그인해 주세요.
      </p>

      <div className="mt-5 space-y-4">
        {FIELDS.map(({ key, label, autoComplete, minLength, placeholder }) => (
          <Field key={key} label={label}>
            <div className="relative">
              <input
                type={show[key] ? "text" : "password"}
                autoComplete={autoComplete}
                name={`password-${key}`}
                minLength={minLength}
                maxLength={64}
                value={passwords[key]}
                onChange={(e) =>
                  setPasswords((previous) => ({ ...previous, [key]: e.target.value }))
                }
                placeholder={placeholder}
                className={passwordInputClass}
              />
              <button
                type="button"
                onClick={() =>
                  setShow((previous) => ({ ...previous, [key]: !previous[key] }))
                }
                aria-label={show[key] ? `${label} 숨기기` : `${label} 보기`}
                aria-pressed={show[key]}
                className={`absolute inset-y-0 right-0 flex w-14 items-center justify-center ${
                  show[key] ? "text-accent" : "text-muted"
                }`}
              >
                <EyeIcon open={show[key]} />
              </button>
            </div>
          </Field>
        ))}
      </div>

      <ErrorText>{error}</ErrorText>

      <div className="mt-6 space-y-2">
        <Button type="submit" full disabled={pending || !ready}>
          비밀번호 변경하기
        </Button>
        <Button type="button" full variant="ghost" disabled={pending} onClick={onBack}>
          뒤로
        </Button>
      </div>
    </form>
  );
}
