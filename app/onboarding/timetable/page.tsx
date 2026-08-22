import Link from "next/link";
import { requireMember } from "@/lib/guard";
import { TimetableUploader } from "@/components/timetable-uploader";

export default async function OnboardingTimetablePage() {
  const me = await requireMember();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-[calc(env(safe-area-inset-top)+2rem)]">
      <div>
        <p className="text-[13px] font-bold text-accent">마지막 단계</p>
        <h1 className="mt-2 break-keep text-[26px] font-extrabold leading-tight">
          {me.displayName} 님의
          <br />
          시간표를 등록해 주세요
        </h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-muted">
          지금 한 번만 올려두면 돼요.
        </p>
      </div>

      {/* 가운데 정렬하되 아래 여백을 더 줘서 업로드 박스가 살짝 위로 오게 한다 */}
      <div className="flex flex-1 items-center pb-16 pt-2">
        <div className="w-full">
          <TimetableUploader mode="onboarding" allowManual={false} />
        </div>
      </div>

      <Link
        href="/"
        className="pt-1 text-center text-[15px] font-semibold text-muted hover:text-fg-2"
      >
        나중에 할게요
      </Link>
    </div>
  );
}
