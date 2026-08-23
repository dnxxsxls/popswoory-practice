import type { ComponentProps, ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`rounded-2xl bg-surface p-5 ${className}`}>{children}</div>;
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  /** md = 화면 하단의 주 버튼 / sm = 목록·제목 옆에 붙는 작은 동작 */
  size?: "md" | "sm";
  full?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  full = false,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-bold disabled:opacity-40 disabled:pointer-events-none";
  const sizes = {
    md: "h-14 rounded-2xl px-5 text-[17px]",
    sm: "h-8 rounded-xl px-3 text-[13px]",
  } as const;
  const variants = {
    primary: "bg-accent text-accent-fg hover:bg-accent-press",
    secondary: "bg-surface-2 text-fg-2 hover:brightness-95",
    // surface-2 는 밝은 테마에서 페이지 배경과 같은 색이라 카드 바깥에서는 형태가
    // 보이지 않는다. 카드 밖에 놓는 버튼은 흰 바탕에 옅은 테두리를 쓴다.
    outline: "bg-surface text-fg-2 ring-1 ring-inset ring-line hover:brightness-95",
    ghost: "text-muted hover:text-fg-2",
  } as const;

  return (
    <button
      {...props}
      className={`${base} ${sizes[size]} ${variants[variant]} ${full ? "w-full" : ""} ${className}`}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-fg-2">{label}</span>
      {children}
      {hint ? <span className="mt-2 block text-[13px] text-muted">{hint}</span> : null}
    </label>
  );
}

/**
 * 밝은 테마에서 --surface-2 와 --bg 가 같은 색이라, 페이지 위에 그냥 놓으면 입력칸이
 * 있는지조차 보이지 않았다. 테두리를 둘러 상자를 만들고 눌렀을 때는 강조색으로 굵어진다.
 */
export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`h-14 w-full rounded-2xl bg-surface px-4 text-[17px] font-medium text-fg outline-none ring-1 ring-inset ring-line placeholder:font-normal placeholder:text-muted focus:ring-2 focus:ring-accent ${className}`}
    />
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="text-[15px] font-medium text-danger">{children}</p>;
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "accent" | "warn" | "outline" | "outlineAccent";
}) {
  // 채움(muted·accent·warn)은 상태, 테두리(outline*)는 역할. 한 줄에 같이 놓아도 섞이지 않는다.
  const tones = {
    muted: "bg-surface-2 text-muted",
    accent: "bg-accent-soft text-accent",
    warn: "bg-surface-2 text-danger",
    outline: "ring-1 ring-inset ring-line text-muted",
    outlineAccent: "ring-1 ring-inset ring-accent text-accent",
  } as const;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-lg px-2.5 py-1 text-[13px] font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** PIN 보기/숨기기 토글에 쓰는 눈 아이콘 */
export function EyeIcon({ open }: { open: boolean }) {
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

/**
 * 로딩 자리표시자. bg 와 surface-2 가 밝은 테마에서 같은 색이라
 * 카드 안팎 어디에 놓아도 보이도록 line 색을 쓴다.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-line ${className}`} />;
}
