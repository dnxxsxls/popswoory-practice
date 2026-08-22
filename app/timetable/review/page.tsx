import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/guard";
import { getActiveSchedule } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { ScheduleReview } from "@/components/schedule-review";

export default async function TimetableReviewPage() {
  const me = await requireOnboarded();
  const schedule = await getActiveSchedule(me.memberId);

  if (!schedule) redirect("/timetable");

  const hasImage = Boolean(schedule.imageFile);
  const alreadyConfirmed = schedule.blocks.length > 0;

  return (
    <AppShell
      title={alreadyConfirmed ? "시간표 고치기" : hasImage ? "시간표 확인" : "시간표 직접 입력"}
      subtitle={
        alreadyConfirmed
          ? "확정된 내용을 수정합니다"
          : hasImage
            ? "읽어온 결과를 확인해 주세요"
            : "빈 칸을 눌러 수업을 넣어주세요"
      }
    >
      <ScheduleReview initial={schedule.blocks} hasImage={hasImage} />

      <Link
        href="/timetable"
        className="block py-3 text-center text-[15px] font-semibold text-muted hover:text-fg-2"
      >
        나중에 하기
      </Link>
    </AppShell>
  );
}
