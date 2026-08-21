"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkName, signIn, signUp } from "@/actions/auth";
import { Button, ErrorText, Field, Input } from "./ui";

type Step =
  | { kind: "name" }
  | { kind: "login"; name: string }
  | { kind: "create"; name: string };

function PinInput({
  value,
  onChange,
  autoFocus,
  label,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        placeholder="••••"
        className="text-center text-[28px] font-bold tracking-[0.5em]"
      />
    </Field>
  );
}

export function JoinForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<Step>({ kind: "name" });
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState("");

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

  if (step.kind === "name") {
    return (
      <form onSubmit={submitName} className="space-y-5">
        <Field label="이름 또는 닉네임" hint="모임에서 서로 알아볼 수 있는 이름이면 돼요.">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예) 원빈"
            maxLength={12}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" full disabled={pending || name.trim().length === 0}>
          {pending ? "확인 중…" : "다음"}
        </Button>
      </form>
    );
  }

  const isLogin = step.kind === "login";

  return (
    <form onSubmit={submitPin} className="space-y-5">
      <div className="rounded-2xl bg-surface px-5 py-4 text-[15px]">
        <span className="font-bold">{step.name}</span>
        <span className="text-muted">
          {isLogin ? " 님, 다시 오셨네요." : " (으)로 시작해요."}
        </span>
      </div>

      <PinInput
        autoFocus
        label={isLogin ? "PIN 4자리" : "PIN 4자리 설정"}
        hint={isLogin ? undefined : "다음에 로그인할 때 쓰는 숫자예요. 잊지 마세요."}
        value={pin}
        onChange={setPin}
      />

      {!isLogin ? (
        <PinInput label="PIN 다시 입력" value={pin2} onChange={setPin2} />
      ) : null}

      <ErrorText>{error}</ErrorText>

      <Button
        type="submit"
        full
        disabled={pending || pin.length !== 4 || (!isLogin && pin2.length !== 4)}
      >
        {pending ? "잠시만요…" : isLogin ? "로그인" : "시작하기"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        full
        onClick={() => {
          setStep({ kind: "name" });
          setError("");
        }}
      >
        이름 다시 입력
      </Button>
    </form>
  );
}
