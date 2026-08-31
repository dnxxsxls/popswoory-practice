import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboarded } from "@/lib/guard";
import { canAccessEvent, getEvent, getMember } from "@/lib/store";
import { buildEventView } from "@/lib/event-view";
import { formatDate } from "@/lib/candidates";
import { AppShell } from "@/components/app-shell";
import { EventDetail } from "@/components/event-detail";

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const me = await requireOnboarded();
  const { id } = await params;

  const [event, member] = await Promise.all([getEvent(id), getMember(me.memberId)]);
  if (!event || !member || event.status === "cancelled" || !canAccessEvent(member, event)) {
    notFound();
  }

  const view = await buildEventView(event);

  const confirmed =
    event.status === "confirmed" && event.confirmedDate && event.confirmedStartMin !== null
      ? {
          date: event.confirmedDate,
          startMin: event.confirmedStartMin,
          endMin: event.confirmedStartMin + event.durationMin,
          place: event.place,
        }
      : null;

  const subtitle =
    event.status === "confirmed"
      ? `${event.groupNo}조 · 확정된 연습 일정`
      : `${event.groupNo}조 · ${event.dates.map(formatDate).join(", ")} 중에서`;

  return (
    <AppShell title={event.title} subtitle={subtitle}>
      <EventDetail
        eventId={event.id}
        status={event.status}
        isOwner={event.createdBy === me.memberId || me.role === "admin"}
        creatorName={view.names[event.createdBy] ?? "일정 생성자"}
        myId={me.memberId}
        memberCount={view.members.length}
        respondedIds={view.respondedIds}
        relaxed={view.relaxed}
        names={view.names}
        candidates={view.candidates}
        confirmed={confirmed}
      />

      <Link
        href="/"
        className="block py-3 text-center text-[15px] font-semibold text-muted hover:text-fg-2"
      >
        홈으로
      </Link>
    </AppShell>
  );
}
