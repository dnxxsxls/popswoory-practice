import { notFound } from "next/navigation";
import { requireOnboarded } from "@/lib/guard";
import { getMember, listActiveSchedules, listMembers } from "@/lib/store";
import { buildFreeTable, type MemberSchedule } from "@/lib/free-time";
import { AppShell } from "@/components/app-shell";
import { FreeGroupTabs, type FreeGroupView } from "@/components/free-group-tabs";

export default async function FreePage() {
  const me = await requireOnboarded();
  const [member, members, schedules] = await Promise.all([
    getMember(me.memberId),
    listMembers(),
    listActiveSchedules(),
  ]);
  if (!member || member.groupNos.length === 0) notFound();

  const byMember = new Map(schedules.map((schedule) => [schedule.memberId, schedule]));
  const groupNos = [...member.groupNos].sort((a, b) => a - b);
  const groups: FreeGroupView[] = groupNos.map((no) => {
    const groupMembers = members.filter((candidate) => candidate.groupNos.includes(no));
    const memberSchedules: MemberSchedule[] = groupMembers.map((candidate) => {
      const schedule = byMember.get(candidate.id);
      return {
        memberId: candidate.id,
        displayName: candidate.displayName,
        blocks: schedule?.blocks ?? [],
        hasSchedule: schedule?.status === "parsed",
      };
    });

    return {
      no,
      memberCount: groupMembers.length,
      names: Object.fromEntries(
        groupMembers.map((candidate) => [candidate.id, candidate.displayName]),
      ),
      table: buildFreeTable(memberSchedules),
    };
  });

  const onlyGroup = groups.length === 1 ? groups[0] : null;

  return (
    <AppShell
      title={onlyGroup ? `${onlyGroup.no}조 공강표` : "우리 공강표"}
      subtitle={
        onlyGroup
          ? `${onlyGroup.memberCount}명 중 ${onlyGroup.table.totalKnown}명 시간표 등록`
          : `${groupNos.map((no) => `${no}조`).join(" · ")} 담당`
      }
    >
      <FreeGroupTabs groups={groups} />
    </AppShell>
  );
}
