import { redirect } from "next/navigation";
import { onboardingPath, requireOnboarding } from "@/lib/guard";
import { getActiveSchedule } from "@/lib/store";
import { OnboardingShell } from "@/components/onboarding-shell";
import { ScheduleReview } from "@/components/schedule-review";

export default async function OnboardingReviewPage() {
  const { member } = await requireOnboarding();
  const schedule = await getActiveSchedule(member.id);

  const here = onboardingPath(member, schedule);
  if (here !== "/onboarding/review" || !schedule) redirect(here);

  return (
    <OnboardingShell
      step={2}
      label="시간표 등록"
      title={schedule.imageFile ? "수업 시간이\n맞는지 봐주세요" : "수업을\n넣어주세요"}
      subtitle={
        schedule.imageFile
          ? "읽어온 결과를 확인하고 확정하면 끝나요."
          : "빈 칸을 눌러 수업 시간을 채워주세요."
      }
    >
      <ScheduleReview
        initial={schedule.blocks}
        hasImage={Boolean(schedule.imageFile)}
        doneHref="/onboarding/group"
      />
    </OnboardingShell>
  );
}
