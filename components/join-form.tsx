"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { checkName, signIn, signUp } from "@/actions/auth";
import { randomNickname } from "@/lib/nickname";
import { ErrorText } from "./ui";

type Step =
  | { kind: "name" }
  | { kind: "login"; name: string }
  | { kind: "create"; name: string };

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3.2" />
      {open ? null : <path d="M4 20 20 4" />}
    </svg>
  );
}

/** 큰 제목 + 회색 부제목 */
function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="whitespace-pre-line text-[24px] font-bold leading-[1.4]">{title}</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-muted">{subtitle}</p>
    </div>
  );
}

/** 라벨 + 밑줄 입력칸 */
function UnderlineField({
  label,
  suffix,
  action,
  children,
}: {
  label: string;
  suffix?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[13px] text-muted">
        {label}
        {action}
      </span>
      <span className="flex items-baseline gap-2 border-b-2 border-line pb-2 focus-within:border-accent">
        {children}
        {suffix ? <span className="shrink-0 text-fg-2">{suffix}</span> : null}
      </span>
    </label>
  );
}

const inputClass =
  "min-w-0 flex-1 bg-transparent text-[24px] font-bold text-fg outline-none placeholder:font-normal placeholder:text-muted";

export function JoinForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<Step>({ kind: "name" });
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState("");
  const [showPin, setShowPin] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);
  const pin2Ref = useRef<HTMLInputElement>(null);

  /**
   * WebKit 은 -webkit-text-security 가 바뀌어도 이미 그려둔 글자를 갱신하지 않는다.
   * 그래서 마지막에 친 글자만 반대로 보이는(***4 → 123*) 현상이 생긴다.
   * 값을 다시 넣어 강제로 다시 그리게 한다. 포커스와 커서는 유지한다.
   */
  useEffect(() => {
    for (const el of [pinRef.current, pin2Ref.current]) {
      if (!el || !el.value) continue;
      const value = el.value;
      const focused = document.activeElement === el;
      el.value = "";
      el.value = value;
      if (focused) el.setSelectionRange(value.length, value.length);
    }
  }, [showPin]);

  function submitName(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await checkName(name);
      if (!res.ok) return setError(res.error);
      setPin("");
      setPin2("");
      setStep(res.exists ? { kind: "login", name: res.name } : { kind: "create", name: res.name });
    });
  }

  function submitPin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (step.kind === "name") return;

    if (step.kind === "create" && pin !== pin2) {
      setError("PIN이 서로 달라요.");
      return;
    }

    start(async () => {
      const res =
        step.kind === "login" ? await signIn(step.name, pin) : await signUp(step.name, pin);
      if (!res.ok) {
        setError(res.error);
        setPin("");
        setPin2("");
        return;
      }
      router.replace(res.next);
      router.refresh();
    });
  }

  const isName = step.kind === "name";
  const isLogin = step.kind === "login";

  const canSubmit = isName
    ? name.trim().length > 0
    : pin.length === 4 && (isLogin || pin2.length === 4);

  const cta = isName ? "다음" : isLogin ? "로그인" : "시작하기";

  return (
    <form
      autoComplete="off"
      onSubmit={isName ? submitName : submitPin}
      className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-[calc(env(safe-area-inset-top)+4.5rem)]"
    >
      {isName ? (
        <>
          <Heading
            title={"사용하실 닉네임을\n입력해주세요"}
            subtitle="모임에서 서로 알아볼 수 있는 이름이면 돼요."
          />
          <div className="mt-10">
            <UnderlineField
              label="닉네임"
              action={
                <button
                  type="button"
                  onClick={() => setName((prev) => randomNickname(prev))}
                  className="text-[13px] font-semibold text-accent"
                >
                  랜덤 추천
                </button>
              }
            >
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="통통튀는 베이스"
                maxLength={12}
                className={inputClass}
              />
            </UnderlineField>
          </div>
        </>
      ) : (
        <>
          <Heading
            title={isLogin ? "PIN 4자리를\n입력해주세요" : "PIN 4자리를\n만들어주세요"}
            subtitle={
              isLogin
                ? `${step.name} 님, 다시 오셨네요.`
                : "다음에 로그인할 때 쓰는 숫자예요. 잊지 마세요."
            }
          />

          <div className="mt-10 space-y-8">
            <UnderlineField
              label="PIN"
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  aria-label={showPin ? "PIN 숨기기" : "PIN 보기"}
                  aria-pressed={showPin}
                  className={showPin ? "text-accent" : "text-muted"}
                >
                  <EyeIcon open={showPin} />
                </button>
              }
            >
              <input
                ref={pinRef}
                autoFocus
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                name="pin-code"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                className={`${inputClass} tracking-[0.4em] ${showPin ? "" : "pin-mask"}`}
              />
            </UnderlineField>

            {!isLogin ? (
              <UnderlineField label="PIN 다시 입력">
                <input
                  ref={pin2Ref}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  name="pin-code-confirm"
                  maxLength={4}
                  value={pin2}
                  onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  className={`${inputClass} tracking-[0.4em] ${showPin ? "" : "pin-mask"}`}
                />
              </UnderlineField>
            ) : null}
          </div>
        </>
      )}

      <div className="mt-5">
        <ErrorText>{error}</ErrorText>
      </div>

      {!isName ? (
        <button
          type="button"
          onClick={() => {
            setStep({ kind: "name" });
            setError("");
          }}
          className="mt-6 self-start text-[14px] font-medium text-muted"
        >
          닉네임 다시 입력
        </button>
      ) : null}

      {/* 하단 고정 CTA */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-bg px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3">
        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="h-14 w-full rounded-2xl bg-accent text-[17px] font-bold text-accent-fg disabled:bg-line disabled:text-muted"
        >
          {pending ? "잠시만요…" : cta}
        </button>
      </div>
    </form>
  );
}
