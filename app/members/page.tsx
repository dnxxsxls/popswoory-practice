import Link from "next/link";
import { requireOnboarded } from "@/lib/guard";
import { getMember, listActiveSchedules, listMembers } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { RosterRow, type RosterMember } from "@/components/group-roster";
import { GroupTabs, type GroupRoster } from "@/components/group-tabs";
import { PasswordResetButton } from "@/components/password-reset-button";
import { MemberDeleteButton } from "@/components/member-delete-button";
import { ProfileEdit } from "@/components/profile-edit";
import { Badge, Card } from "@/components/ui";

export default async function MembersPage() {
  const me = await requireOnboarded();
  const [members, schedules, meRecord] = await Promise.all([
    listMembers(),
    listActiveSchedules(),
    getMember(me.memberId),
  ]);

  const schedulesByMember = new Map(schedules.map((s) => [s.memberId, s]));
  const myGroupNos = meRecord?.groupNos ?? [];

  const mine: RosterMember | null = meRecord
    ? {
        id: meRecord.id,
        displayName: meRecord.displayName,
        mentor: meRecord.groupRole === "mentor",
        blocks: schedulesByMember.get(meRecord.id)?.blocks ?? [],
        scheduleConfirmed: schedulesByMember.get(meRecord.id)?.status === "parsed",
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
        blocks: schedulesByMember.get(m.id)?.blocks ?? [],
        scheduleConfirmed: schedulesByMember.get(m.id)?.status === "parsed",
      })),
  }));

  return (
    <AppShell
      title="우리 조"
      subtitle={myGroupNos.length > 1 ? `${myGroupNos.join("조 · ")}조 담당` : undefined}
    >
      {/* 제목과 동작은 카드 바깥에 둔다 — 카드 안은 내용만. */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-[17px] font-bold">내 정보</h2>
          {me.role === "admin" ? <Badge tone="accent">관리자</Badge> : null}
        </div>
        <ProfileEdit
          displayName={mine.displayName}
          groupRole={mine.mentor ? "mentor" : "member"}
          groupNos={myGroupNos}
        />
      </div>

      <Card>
        <RosterRow member={mine} />
      </Card>

      <h2 className="px-1 pt-3 text-[17px] font-bold">우리 조</h2>

      <GroupTabs
        groups={groups}
        meId={me.memberId}
        excludeMe
        emptyText="같은 조 사람이 가입하면 여기에 표시돼요."
      />

      <p className="px-1 pt-1 text-[13px] leading-relaxed text-muted">
        업로드한 원본 이미지는 본인만 볼 수 있어요. 조원에게는 정리된 수업 시간만 보입니다.
      </p>

      {me.role === "admin" ? (
        <>
          <h2 className="px-1 pt-5 text-[17px] font-bold">회원 관리</h2>
          <Card>
            {members.some((member) => member.id !== me.memberId) ? (
              <ul className="divide-y divide-line">
                {members
                  .filter((member) => member.id !== me.memberId)
                  .map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold">{member.displayName}</p>
                        <p className="truncate text-[13px] text-muted">@{member.loginId}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <PasswordResetButton
                          memberId={member.id}
                          displayName={member.displayName}
                        />
                        <MemberDeleteButton
                          memberId={member.id}
                          displayName={member.displayName}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-[15px] text-muted">관리할 다른 회원이 없어요.</p>
            )}
          </Card>
          <p className="px-1 text-[13px] leading-relaxed text-muted">
            비밀번호 초기화 후에는 임시 비밀번호 0000을 안내해 주세요. 계정 삭제 시 로그인과 명단
            노출이 즉시 중단되고 기존 기록은 보존됩니다.
          </p>
        </>
      ) : null}
    </AppShell>
  );
}
