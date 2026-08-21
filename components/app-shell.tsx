import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { SignOutButton } from "./sign-out-button";

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="px-5 pb-6 pt-[calc(env(safe-area-inset-top)+2rem)]">
        <div className="flex items-start justify-between gap-4">
          <h1 className="break-keep text-[26px] font-extrabold leading-tight">{title}</h1>
          <SignOutButton />
        </div>
        {subtitle ? <p className="mt-2 text-[15px] text-muted">{subtitle}</p> : null}
      </header>

      <main className="flex-1 space-y-3 px-5 pb-32">{children}</main>

      <BottomNav />
    </div>
  );
}
