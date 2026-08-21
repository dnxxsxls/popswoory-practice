import Link from "next/link";
import { requireMember } from "@/lib/guard";
import { TimetableUploader } from "@/components/timetable-uploader";

export default async function OnboardingTimetablePage() {
  const me = await requireMember();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-12 pt-[calc(env(safe-area-inset-top)+2.5rem)]">
      <div className="mb-8">
        <p className="text-[13px] font-bold text-accent">마지막 단계</p>
        <h1 className="mt-2 text-[26px] font-extrabold leading-tight">
          {me.displayName} 님의 시간표를 등록해 주세요
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          지금 한 번만 올려두면 됩니다. 앞으로 일정을 잡을 때마다 다시 올릴 필요 없어요.
        </p>
      </div>

      <TimetableUploader mode="onboarding" />

      <Link
        href="/"
        className="mt-8 text-center text-[15px] font-semibold text-muted hover:text-fg-2"
      >
        나중에 할게요
      </Link>
    </div>
  );
}
