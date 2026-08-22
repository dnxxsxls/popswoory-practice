"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 아이콘은 디자인에서 받은 PNG 를 mask 로 쓴다.
 * 원본은 회색/파랑 두 벌로 왔지만 모양이 완전히 같아서 한 벌만 두고,
 * 색은 currentColor 로 입힌다. 이러면 다크모드 토큰도 그대로 따라간다.
 * ratio 는 원본 PNG 의 가로/세로 픽셀.
 */
const items = [
  { href: "/", label: "홈", icon: "/nav/home.png", ratio: "198 / 177", box: "h-[21px] max-w-[26px]" },
  {
    href: "/free",
    label: "공강표",
    icon: "/nav/free.png",
    ratio: "236 / 177",
    box: "h-[21px] max-w-[26px]",
  },
  { href: "/timetable", label: "내 시간표", icon: "/nav/timetable.png", ratio: "187 / 174", box: "h-[21px] max-w-[26px]" },
  // 이 아이콘은 원본이 가로로 가장 길어서 같은 높이로 두면 혼자 커 보인다
  { href: "/members", label: "우리 조", icon: "/nav/members.png", ratio: "238 / 159", box: "h-[18px] max-w-[24px]" },
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
              className={`flex flex-1 flex-col items-center gap-1.5 pb-3 pt-[18px] text-[11px] font-bold ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              {/*
               * 원본이 여백 없이 잘려 나와서 가로폭이 제각각이다. 높이와 최대 폭을
               * 아이콘별로 잡아(box) 넷이 비슷한 크기로 보이게 맞춘다.
               */}
              <span
                className={`nav-icon ${item.box}`}
                style={{
                  aspectRatio: item.ratio,
                  maskImage: `url(${item.icon})`,
                  WebkitMaskImage: `url(${item.icon})`,
                }}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
