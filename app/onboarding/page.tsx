import { redirect } from "next/navigation";
import { requireOnboarding } from "@/lib/guard";
import { onboardingPath } from "@/lib/onboarding";
import { getActiveSchedule } from "@/lib/store";
import { OnboardingRoleGroup } from "@/components/onboarding-role-group";

export default async function OnboardingPage() {
  const { member } = await requireOnboarding();
  const schedule = await getActiveSchedule(member.id);

  const here = onboardingPath(member, schedule);
  if (here !== "/onboarding") redirect(here);

  return <OnboardingRoleGroup displayName={member.displayName} />;
}
