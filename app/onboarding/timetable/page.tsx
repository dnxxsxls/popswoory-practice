import { redirect } from "next/navigation";
import { requireOnboarding } from "@/lib/guard";
import { onboardingPath } from "@/lib/onboarding";
import { getActiveSchedule } from "@/lib/store";
import { OnboardingUpload } from "@/components/onboarding-upload";

export default async function OnboardingTimetablePage() {
  const { member } = await requireOnboarding();
  const schedule = await getActiveSchedule(member.id);

  const here = onboardingPath(member, schedule);
  if (here !== "/onboarding/timetable") redirect(here);

  return <OnboardingUpload />;
}
