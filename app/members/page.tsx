import Link from "next/link";
import { requireMember } from "@/lib/guard";
import { getMember, listActiveSchedules, listMembers } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { RosterRow, type RosterMember } from "@/components/group-roster";
import { GroupTabs, type GroupRoster } from "@/components/group-tabs";
import { ProfileEdit } from "@/components/profile-edit";
import { Card } from "@/components/ui";

export default async function MembersPage() {
  const me = await requireMember();
  const [members, schedules, meRecord] = await Promise.all([
    listMembers(),
    listActiveSchedules(),
    getMember(me.memberId),
  ]);

  const blocksOf = new Map(schedules.map((s) => [s.memberId, s.blocks]));
  const myGroupNos = meRecord?.groupNos ?? [];

  const mine: RosterMember | null = meRecord
    ? {
        id: meRecord.id,
        displayName: meRecord.displayName,
        mentor: meRecord.groupRole === "mentor",
        blocks: blocksOf.get(meRecord.id) ?? [],
      }
    : null;

  if (myGroupNos.length === 0 || !mine) {
    return (
      <AppShell title="우리 조" subtitle="조가 아직 정해지지 않았어요">
        <Card>
          <p className="text-[17px] font-bold">먼저 조를 골라주세요</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
            홈 화면에서 역할과 조를 고르면 이곳에 조원이 표시돼요.
          </p>
          <Link href="/" className="mt-4 inline-block text-[15px] font-bold text-accent">
            홈으로 가기 →
          </Link>
        </Card>
      </AppShell>
    );
  }

  const groups: GroupRoster[] = myGroupNos.map((no) => ({
    no,
    members: members
      .filter((m) => m.groupNos.includes(no))
      .map((m) => ({
        id: m.id,
        displayName: m.displayName,
        mentor: m.groupRole === "mentor",
        blocks: blocksOf.get(m.id) ?? [],
      })),
  }));

  return (
    <AppShell
      title="우리 조"
      subtitle={myGroupNos.length > 1 ? `${myGroupNos.join("조 · ")}조 담당` : undefined}
    >
      {/* 제목과 동작은 카드 바깥에 둔다 — 카드 안은 내용만. */}
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-[17px] font-bold">내 정보</h2>
        <ProfileEdit
          displayName={mine.displayName}
          groupRole={mine.mentor ? "mentor" : "member"}
          groupNos={myGroupNos}
        />
      </div>

      <Card>
        <RosterRow member={mine} />
      </Card>

      <GroupTabs
        groups={groups}
        meId={me.memberId}
        excludeMe
        emptyText="같은 조 사람이 가입하면 여기에 표시돼요."
      />

      <p className="px-1 pt-1 text-[13px] leading-relaxed text-muted">
        업로드한 원본 이미지는 본인만 볼 수 있어요. 조원에게는 정리된 수업 시간만 보입니다.
      </p>
    </AppShell>
  );
}
