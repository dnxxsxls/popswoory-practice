import { redirect } from "next/navigation";
import { requireOnboarding } from "@/lib/guard";
import { onboardingPath } from "@/lib/onboarding";
import { getActiveSchedule, listActiveSchedules, listMembers } from "@/lib/store";
import { OnboardingGroup } from "@/components/onboarding-group";

export default async function OnboardingGroupPage() {
  const { member } = await requireOnboarding();
  const [schedule, members, schedules] = await Promise.all([
    getActiveSchedule(member.id),
    listMembers(),
    listActiveSchedules(),
  ]);

  const here = onboardingPath(member, schedule);
  if (here !== "/onboarding/group") redirect(here);

  const schedulesByMember = new Map(schedules.map((s) => [s.memberId, s]));

  return (
    <OnboardingGroup
      meId={member.id}
      groups={member.groupNos.map((no) => ({
        no,
        members: members
          .filter((m) => m.groupNos.includes(no))
          .map((m) => ({
            id: m.id,
            displayName: m.displayName,
            mentor: m.groupRole === "mentor",
            blocks: schedulesByMember.get(m.id)?.blocks ?? [],
            scheduleConfirmed: schedulesByMember.get(m.id)?.status === "parsed",
          })),
      }))}
    />
  );
}
