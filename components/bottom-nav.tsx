"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "홈", icon: "M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" },
  {
    href: "/free",
    label: "공강표",
    icon: "M4 5h16v15H4zM4 9.5h16M9 5v15M14 5v15M9.5 13.5l1.8 1.8 3.2-3.4",
  },
  { href: "/timetable", label: "내 시간표", icon: "M7 3v3M17 3v3M4 8.5h16M4 5h16v15H4z" },
  {
    href: "/members",
    label: "멤버",
    icon: "M4 19c0-3 3-4.5 5-4.5S14 16 14 19M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M16 19c0-2 1-3.2 2.2-3.8M16.5 11.5a2.5 2.5 0 1 0 0-5",
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-md items-stretch pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={active ? 2 : 1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
