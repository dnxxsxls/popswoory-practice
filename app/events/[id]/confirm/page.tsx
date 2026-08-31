import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/guard";
import { canAccessEvent, getEvent, getMember } from "@/lib/store";
import { buildEventView } from "@/lib/event-view";
import { AppShell } from "@/components/app-shell";
import { EventConfirm } from "@/components/event-confirm";

export default async function ConfirmEventPage({
  params,
}: PageProps<"/events/[id]/confirm">) {
  const me = await requireOnboarded();
  const { id } = await params;
  const [event, member] = await Promise.all([getEvent(id), getMember(me.memberId)]);

  if (!event || !member || event.status === "cancelled" || !canAccessEvent(member, event)) {
    notFound();
  }
  if (event.status === "confirmed") redirect(`/events/${event.id}`);
  if (event.createdBy !== me.memberId && me.role !== "admin") redirect(`/events/${event.id}`);

  const view = await buildEventView(event);
  const allResponded =
    view.members.length > 0 && view.respondedIds.length === view.members.length;
  if (!allResponded) redirect(`/events/${event.id}`);

  return (
    <AppShell title="최종 시간 확정" subtitle={`${event.groupNo}조 · ${event.title}`}>
      <EventConfirm
        eventId={event.id}
        memberCount={view.members.length}
        candidates={view.candidates}
      />

      <Link
        href={`/events/${event.id}`}
        className="block py-3 text-center text-[15px] font-semibold text-muted hover:text-fg-2"
      >
        응답 화면으로 돌아가기
      </Link>
    </AppShell>
  );
}
