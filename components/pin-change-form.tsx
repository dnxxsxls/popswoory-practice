"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { changePin } from "@/actions/profile";
import { Button, ErrorText, EyeIcon, Field } from "./ui";

const FIELDS = [
  { key: "current", label: "지금 PIN" },
  { key: "next", label: "새 PIN" },
  { key: "confirm", label: "새 PIN 다시 입력" },
] as const;

type Key = (typeof FIELDS)[number]["key"];

const EMPTY: Record<Key, string> = { current: "", next: "", confirm: "" };
const ALL_HIDDEN: Record<Key, boolean> = { current: false, next: false, confirm: false };

// ui.tsx 의 Input 과 같은 상자 모양에 PIN 용 자간과 눈 아이콘 자리를 더한다.
const pinInputClass =
  "h-14 w-full rounded-2xl bg-surface-2 pl-4 pr-14 text-[17px] font-medium tracking-[0.4em] text-fg outline-none placeholder:font-normal placeholder:tracking-[0.4em] placeholder:text-muted focus:bg-accent-soft";

export function PinChangeForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pins, setPins] = useState<Record<Key, string>>(EMPTY);
  const [show, setShow] = useState<Record<Key, boolean>>(ALL_HIDDEN);
  const [error, setError] = useState("");
  const refs = useRef<Partial<Record<Key, HTMLInputElement | null>>>({});

  /**
   * WebKit 은 -webkit-text-security 가 바뀌어도 이미 그려둔 글자를 갱신하지 않아
   * 마지막에 친 글자만 반대로 보인다. 값을 다시 넣어 강제로 다시 그린다.
   */
  useEffect(() => {
    for (const el of Object.values(refs.current)) {
      if (!el || !el.value) continue;
      const value = el.value;
      const focused = document.activeElement === el;
      el.value = "";
      el.value = value;
      if (focused) el.setSelectionRange(value.length, value.length);
    }
  }, [show]);

  const ready = FIELDS.every(({ key }) => pins[key].length === 4);

  function submit() {
    setError("");
    start(async () => {
      const res = await changePin(pins);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // 세션이 이미 끊겼다. 뒤로 눌러 돌아오지 못하게 replace 로 보내고
      // 서버 컴포넌트 캐시도 비운다.
      router.replace("/join");
      router.refresh();
    });
  }

  return (
    <div>
      <p className="mt-5 text-[15px] leading-relaxed text-muted">
        바꾸고 나면 로그아웃돼요. 새 PIN으로 다시 로그인해 주세요.
      </p>

      <div className="mt-5 space-y-4">
        {FIELDS.map(({ key, label }) => (
          <Field key={key} label={label}>
            {/* 눈 표시는 칸마다 따로 — 지금 PIN 을 켜 둔 채로 새 PIN 을 가릴 수 있게 */}
            <div className="relative">
              <input
                ref={(el) => {
                  refs.current[key] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                name={`pin-${key}`}
                maxLength={4}
                value={pins[key]}
                onChange={(e) =>
                  setPins((prev) => ({
                    ...prev,
                    [key]: e.target.value.replace(/\D/g, "").slice(0, 4),
                  }))
                }
                placeholder="••••"
                className={`${pinInputClass} ${show[key] ? "" : "pin-mask"}`}
              />
              <button
                type="button"
                onClick={() => setShow((prev) => ({ ...prev, [key]: !prev[key] }))}
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
        <Button full disabled={pending || !ready} onClick={submit}>
          PIN 변경하기
        </Button>
        <Button full variant="ghost" disabled={pending} onClick={onBack}>
          뒤로
        </Button>
      </div>
    </div>
  );
}
