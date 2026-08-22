import { redirect } from "next/navigation";
import { onboardingPath, requireOnboarding } from "@/lib/guard";
import { getActiveSchedule } from "@/lib/store";
import { OnboardingShell } from "@/components/onboarding-shell";
import { TimetableUploader } from "@/components/timetable-uploader";

export default async function OnboardingTimetablePage() {
  const { member } = await requireOnboarding();
  const schedule = await getActiveSchedule(member.id);

  const here = onboardingPath(member, schedule);
  if (here !== "/onboarding/timetable") redirect(here);

  return (
    <OnboardingShell
      step={2}
      label="시간표 등록"
      title={"시간표를\n올려주세요"}
      subtitle="한 번만 올려두면 이후 모든 연습 일정에 자동으로 반영돼요."
    >
      <TimetableUploader mode="onboarding" reviewHref="/onboarding/review" />
    </OnboardingShell>
  );
}
