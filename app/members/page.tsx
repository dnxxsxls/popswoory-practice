import { requireMember } from "@/lib/guard";
import { listActiveSchedules, listMembers } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { Avatar, Badge, Card } from "@/components/ui";

export default async function MembersPage() {
  const me = await requireMember();
  const [members, schedules] = await Promise.all([listMembers(), listActiveSchedules()]);
  const registered = new Set(schedules.filter((s) => s.blocks.length > 0).map((s) => s.memberId));

  return (
    <AppShell title="멤버" subtitle={`${members.length}명`}>
      <Card className="!p-0 overflow-hidden">
        <ul className="divide-y divide-line/70">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3.5 px-5 py-4">
              <Avatar name={m.displayName} color={m.color} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-bold">
                  {m.displayName}
                  {m.id === me.memberId ? (
                    <span className="ml-1.5 text-[13px] font-medium text-muted">(나)</span>
                  ) : null}
                </p>
                {m.role === "admin" ? (
                  <p className="text-[13px] text-muted">관리자</p>
                ) : null}
              </div>

              {registered.has(m.id) ? (
                <Badge tone="accent">등록 완료</Badge>
              ) : (
                <Badge>미등록</Badge>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <p className="px-1 pt-1 text-[13px] leading-relaxed text-muted">
        시간표 이미지는 본인만 볼 수 있어요. 다른 멤버에게는 등록 여부만 표시됩니다.
      </p>
    </AppShell>
  );
}
