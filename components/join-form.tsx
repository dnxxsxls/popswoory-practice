"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { checkLoginId, checkNickname, signIn, signUp } from "@/actions/auth";
import { randomNickname } from "@/lib/nickname";
import { ErrorText, EyeIcon } from "./ui";

type Step =
  | { kind: "login-id" }
  | { kind: "login"; loginId: string }
  | { kind: "create-password"; loginId: string }
  | { kind: "nickname"; loginId: string };

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="whitespace-pre-line text-[24px] font-bold leading-[1.4]">{title}</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-muted">{subtitle}</p>
    </div>
  );
}

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

function StatusIcon({ ok }: { ok: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ok ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M6 6l12 12M18 6L6 18" />}
    </svg>
  );
}

const LOGIN_ID_MIN = 4;
const LOGIN_ID_MAX = 20;
const NAME_MAX = 9;
const NAME_RULE = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 ]*$/;

const inputClass =
  "min-w-0 flex-1 bg-transparent text-[24px] font-bold text-fg outline-none placeholder:font-normal placeholder:text-muted";

export function JoinForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<Step>({ kind: "login-id" });
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checkedNickname, setCheckedNickname] = useState<{
    name: string;
    available: boolean;
  } | null>(null);

  const normalizedLoginId = loginId.trim().toLowerCase();

  const trimmedNickname = nickname.trim();
  const nicknameRuleError =
    trimmedNickname.length === 0
      ? null
      : !NAME_RULE.test(trimmedNickname)
        ? "한글·영문·숫자와 띄어쓰기만 쓸 수 있어요."
        : trimmedNickname.length > NAME_MAX
          ? `${NAME_MAX}자까지 쓸 수 있어요.`
          : null;

  useEffect(() => {
    if (step.kind !== "nickname" || trimmedNickname.length === 0 || nicknameRuleError) return;

    const timer = setTimeout(async () => {
      const result = await checkNickname(trimmedNickname);
      setCheckedNickname({
        name: trimmedNickname,
        available: result.ok && result.available,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [step.kind, trimmedNickname, nicknameRuleError]);

  const nicknameAvailable =
    checkedNickname?.name === trimmedNickname ? checkedNickname.available : null;
  const nicknameState:
    | { kind: "empty" | "checking" | "taken" | "ok" }
    | { kind: "invalid"; message: string } =
    trimmedNickname.length === 0
      ? { kind: "empty" }
      : nicknameRuleError
        ? { kind: "invalid", message: nicknameRuleError }
        : nicknameAvailable === null
          ? { kind: "checking" }
          : nicknameAvailable
            ? { kind: "ok" }
            : { kind: "taken" };

  function submitLoginId() {
    setError("");
    start(async () => {
      const result = await checkLoginId(loginId);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setLoginId(result.loginId);
      setPassword("");
      setPasswordConfirm("");
      setShowPassword(false);
      setStep(
        result.exists
          ? { kind: "login", loginId: result.loginId }
          : { kind: "create-password", loginId: result.loginId },
      );
    });
  }

  function submitPassword() {
    if (step.kind !== "login" && step.kind !== "create-password") return;
    setError("");

    if (password.length < (step.kind === "login" ? 4 : 8)) {
      setError(
        step.kind === "login"
          ? "비밀번호를 입력해 주세요."
          : "비밀번호는 8자 이상 입력해 주세요.",
      );
      return;
    }

    if (step.kind === "create-password") {
      if (password !== passwordConfirm) {
        setError("비밀번호가 서로 달라요.");
        return;
      }
      if (!nickname) setNickname(randomNickname());
      setShowPassword(false);
      setStep({ kind: "nickname", loginId: step.loginId });
      return;
    }

    start(async () => {
      const result = await signIn(step.loginId, password);
      if (!result.ok) {
        setError(result.error);
        setPassword("");
        return;
      }
      router.replace(result.next);
      router.refresh();
    });
  }

  function submitNickname() {
    if (step.kind !== "nickname") return;
    setError("");
    start(async () => {
      const result = await signUp(
        step.loginId,
        password,
        passwordConfirm,
        trimmedNickname,
      );
      if (!result.ok) {
        if (result.field === "loginId") {
          setPassword("");
          setPasswordConfirm("");
          setStep({ kind: "login-id" });
        } else if (result.field === "nickname") {
          setCheckedNickname({ name: trimmedNickname, available: false });
        }
        setError(result.error);
        return;
      }
      router.replace(result.next);
      router.refresh();
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step.kind === "login-id") submitLoginId();
    else if (step.kind === "nickname") submitNickname();
    else submitPassword();
  }

  function goBack() {
    setError("");
    if (step.kind === "nickname") {
      setStep({ kind: "create-password", loginId: step.loginId });
      return;
    }
    setPassword("");
    setPasswordConfirm("");
    setStep({ kind: "login-id" });
  }

  const isLoginId = step.kind === "login-id";
  const isLogin = step.kind === "login";
  const isCreatePassword = step.kind === "create-password";
  const isNickname = step.kind === "nickname";
  const passwordsMatch = passwordConfirm.length > 0 && password === passwordConfirm;

  const canSubmit = isLoginId
    ? normalizedLoginId.length > 0
    : isLogin
      ? password.length >= 4
      : isCreatePassword
        ? password.length >= 8 && passwordConfirm.length >= 8 && passwordsMatch
        : nicknameState.kind === "ok";

  const cta = isLoginId ? "다음" : isLogin ? "로그인" : isCreatePassword ? "다음" : "시작하기";

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-[calc(env(safe-area-inset-top)+4.5rem)]"
    >
      {isLoginId ? (
        <>
          <Heading
            title={"아이디를\n입력해주세요"}
            subtitle="가입한 아이디가 있으면 바로 로그인할 수 있어요."
          />
          <div className="mt-10">
            <UnderlineField label="아이디">
              <input
                autoFocus
                name="login-id"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={loginId}
                onChange={(e) => setLoginId(e.target.value.toLowerCase())}
                placeholder="bandmate24"
                maxLength={LOGIN_ID_MAX}
                className={inputClass}
              />
            </UnderlineField>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              신규 아이디는 영문 소문자와 숫자, {LOGIN_ID_MIN}~{LOGIN_ID_MAX}자로 입력해 주세요.
            </p>
          </div>
        </>
      ) : isNickname ? (
        <>
          <Heading
            title={"사용하실 닉네임을\n정해주세요"}
            subtitle="모임에서 다른 사람에게 보여줄 이름이에요."
          />
          <div className="mt-10">
            <UnderlineField
              label="닉네임"
              action={
                <button
                  type="button"
                  onClick={() => setNickname((previous) => randomNickname(previous))}
                  className="text-[13px] font-semibold text-accent"
                >
                  랜덤 추천
                </button>
              }
              suffix={
                nicknameState.kind === "ok" ? (
                  <span className="text-accent">
                    <StatusIcon ok />
                  </span>
                ) : nicknameState.kind === "invalid" || nicknameState.kind === "taken" ? (
                  <span className={nicknameState.kind === "invalid" ? "text-danger" : "text-muted"}>
                    <StatusIcon ok={false} />
                  </span>
                ) : null
              }
            >
              <input
                autoFocus
                name="nickname"
                autoComplete="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="통통튀는 베이스"
                maxLength={NAME_MAX}
                className={inputClass}
              />
            </UnderlineField>

            <div className="mt-3 flex items-start justify-between gap-3">
              <p
                className={`text-[13px] leading-relaxed ${
                  nicknameState.kind === "invalid" || nicknameState.kind === "taken"
                    ? "font-bold text-danger"
                    : nicknameState.kind === "ok"
                      ? "font-bold text-accent"
                      : "text-muted"
                }`}
              >
                {nicknameState.kind === "invalid"
                  ? nicknameState.message
                  : nicknameState.kind === "taken"
                    ? "이미 등록된 닉네임이에요."
                    : nicknameState.kind === "ok"
                      ? "쓸 수 있는 닉네임이에요."
                      : nicknameState.kind === "checking"
                        ? "닉네임을 확인하고 있어요."
                        : `한글·영문·숫자와 띄어쓰기, ${NAME_MAX}자까지 쓸 수 있어요.`}
              </p>
              <span
                className={`shrink-0 text-[13px] font-bold tabular-nums ${
                  nickname.length >= NAME_MAX ? "text-accent" : "text-muted"
                }`}
              >
                {nickname.length} / {NAME_MAX}
              </span>
            </div>
          </div>
        </>
      ) : (
        <>
          <Heading
            title={isLogin ? "비밀번호를\n입력해주세요" : "비밀번호를\n만들어주세요"}
            subtitle={
              isLogin
                ? `${step.loginId} 계정으로 로그인합니다.`
                : "8자 이상으로 만들고 한 번 더 확인해 주세요."
            }
          />

          <div className="mt-10 space-y-8">
            <UnderlineField
              label="비밀번호"
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  aria-pressed={showPassword}
                  className={showPassword ? "text-accent" : "text-muted"}
                >
                  <EyeIcon open={showPassword} />
                </button>
              }
            >
              <input
                autoFocus
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                maxLength={64}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? "비밀번호" : "8자 이상"}
                className={inputClass}
              />
            </UnderlineField>

            {isCreatePassword ? (
              <div>
                <UnderlineField label="비밀번호 다시 입력">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password-confirm"
                    autoComplete="new-password"
                    maxLength={64}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="한 번 더 입력"
                    className={inputClass}
                  />
                </UnderlineField>
                {passwordConfirm ? (
                  <p
                    aria-live="polite"
                    className={`mt-3 text-[13px] font-bold ${
                      passwordsMatch ? "text-accent" : "text-danger"
                    }`}
                  >
                    {passwordsMatch ? "비밀번호가 일치해요." : "비밀번호가 서로 달라요."}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      )}

      <div className="mt-5">
        <ErrorText>{error}</ErrorText>
      </div>

      {!isLoginId ? (
        <button
          type="button"
          onClick={goBack}
          className="mt-6 self-start text-[14px] font-medium text-muted"
        >
          {isNickname ? "비밀번호 다시 입력" : "아이디 다시 입력"}
        </button>
      ) : null}

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
