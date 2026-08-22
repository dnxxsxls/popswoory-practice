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
  variant?: "primary" | "secondary" | "ghost";
  full?: boolean;
};

export function Button({
  variant = "primary",
  full = false,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex h-14 items-center justify-center gap-2 rounded-2xl px-5 text-[17px] font-bold disabled:opacity-40 disabled:pointer-events-none";
  const variants = {
    primary: "bg-accent text-accent-fg hover:bg-accent-press",
    secondary: "bg-surface-2 text-fg-2 hover:brightness-95",
    ghost: "text-muted hover:text-fg-2",
  } as const;

  return (
    <button
      {...props}
      className={`${base} ${variants[variant]} ${full ? "w-full" : ""} ${className}`}
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

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`h-14 w-full rounded-2xl bg-surface-2 px-4 text-[17px] font-medium text-fg outline-none placeholder:font-normal placeholder:text-muted focus:bg-accent-soft ${className}`}
    />
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="text-[15px] font-medium text-danger">{children}</p>;
}

/** 멤버 색상 토큰 → 실제 배경색. store 의 color 값과 짝을 이룬다. */
const AVATAR_BG: Record<string, string> = {
  indigo: "bg-indigo-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  orange: "bg-orange-500",
  teal: "bg-teal-500",
};

export function Avatar({
  name,
  color,
  size = 44,
}: {
  name: string;
  color: string;
  /** px. 명단은 44, 좁은 목록은 36 정도 */
  size?: number;
}) {
  return (
    <span
      style={{ width: size, height: size, fontSize: size <= 36 ? 13 : 15 }}
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${
        AVATAR_BG[color] ?? "bg-indigo-500"
      }`}
    >
      {name.slice(0, 1)}
    </span>
  );
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
