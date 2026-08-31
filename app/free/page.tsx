import Link from "next/link";
import { requireOnboarded } from "@/lib/guard";
import { listActiveSchedules, listMembers } from "@/lib/store";
import { buildFreeTable, type MemberSchedule } from "@/lib/free-time";
import { AppShell } from "@/components/app-shell";
import { FreeGrid } from "@/components/free-grid";
import { Badge, Card } from "@/components/ui";

export default async function FreePage() {
  await requireOnboarded();

  const [members, schedules] = await Promise.all([listMembers(), listActiveSchedules()]);

  const byMember = new Map(schedules.map((s) => [s.memberId, s]));
  const memberSchedules: MemberSchedule[] = members.map((m) => {
    const schedule = byMember.get(m.id);
    return {
      memberId: m.id,
      displayName: m.displayName,
      blocks: schedule?.blocks ?? [],
      hasSchedule: schedule?.status === "parsed",
    };
  });

  const names = Object.fromEntries(members.map((m) => [m.id, m.displayName]));
  const table = buildFreeTable(memberSchedules);

  if (table.totalKnown === 0) {
    return (
      <AppShell title="우리 공강표" subtitle="다 같이 비는 시간">
        <Card>
          <p className="text-[17px] font-bold">아직 계산할 시간표가 없어요</p>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            멤버들이 시간표를 등록하면 겹치는 공강 시간대가 여기에 표시됩니다.
          </p>
          <Link href="/timetable" className="mt-4 inline-block text-[15px] font-bold text-accent">
            내 시간표 등록하기 →
          </Link>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="우리 공강표" subtitle={`${table.totalKnown}명 기준`}>
      {table.missing.length > 0 ? (
        <Card className="!p-4 ring-2 ring-accent">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[15px] leading-relaxed">
              <span className="font-semibold">{table.missing.join(", ")}</span> 님의 시간표가
              없어요. 이 계산에서는 <span className="text-[17px] font-bold">제약 없음</span>으로 잡혀 있어요.
            </p>
            <Badge tone="warn">{table.missing.length}명</Badge>
          </div>
        </Card>
      ) : null}

      <FreeGrid table={table} names={names} />

      <p className="px-1 pt-1 text-[13px] leading-relaxed text-muted">
        여기 나온 시간은 <span className="font-medium text-fg">후보</span>일 뿐이에요. 수업이 없다고
        해서 반드시 되는 건 아니니, 실제 일정은 각자 확인을 받아야 해요.
      </p>
    </AppShell>
  );
}
