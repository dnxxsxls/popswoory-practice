import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboarded } from "@/lib/guard";
import { getMember } from "@/lib/store";
import { GROUPS } from "@/lib/groups";
import { AppShell } from "@/components/app-shell";
import { EventCreateForm } from "@/components/event-create-form";

export default async function NewEventPage() {
  const me = await requireOnboarded();
  const member = await getMember(me.memberId);
  if (!member || member.groupNos.length === 0) notFound();

  const groupNos =
    member.role === "admin"
      ? GROUPS.map((group) => group.no)
      : [...member.groupNos].sort((a, b) => a - b);
  const onlyGroup = groupNos.length === 1 ? groupNos[0] : null;

  return (
    <AppShell
      title={onlyGroup ? `${onlyGroup}조 연습 일정 만들기` : "연습 일정 만들기"}
      subtitle={onlyGroup ? `이 일정은 ${onlyGroup}조에게만 보여요` : "연습할 조를 먼저 골라주세요"}
    >
      <EventCreateForm groupNos={groupNos} />
      <Link
        href="/"
        className="block py-3 text-center text-[15px] font-semibold text-muted hover:text-fg-2"
      >
        취소
      </Link>
    </AppShell>
  );
}
