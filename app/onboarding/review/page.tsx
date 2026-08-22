import { redirect } from "next/navigation";
import { onboardingPath, requireOnboarding } from "@/lib/guard";
import { getActiveSchedule } from "@/lib/store";
import { OnboardingReview } from "@/components/onboarding-review";

export default async function OnboardingReviewPage() {
  const { member } = await requireOnboarding();
  const schedule = await getActiveSchedule(member.id);

  const here = onboardingPath(member, schedule);
  if (here !== "/onboarding/review" || !schedule) redirect(here);

  return (
    <OnboardingReview initial={schedule.blocks} hasImage={Boolean(schedule.imageFile)} />
  );
}
