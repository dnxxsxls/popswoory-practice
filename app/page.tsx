import { notFound } from "next/navigation";
import { requireOnboarded } from "@/lib/guard";
import {
  getActiveSchedule,
  getMember,
  listActiveSchedules,
  listEvents,
  listMembers,
  listResponsesForEvents,
} from "@/lib/store";
import {
  HomeDashboard,
  homeSubtitle,
  type TimetableState,
  type PollingItem,
  type UpcomingItem,
} from "@/components/home-dashboard";
import { slotKeyOf, todayKst } from "@/lib/candidates";
import { buildEventView } from "@/lib/event-view";
import { AppShell } from "@/components/app-shell";

export default async function HomePage() {
  const me = await requireOnboarded();
  const member = await getMember(me.memberId);
  if (!member) notFound();

  const [mine, members, schedules, events] = await Promise.all([
    getActiveSchedule(me.memberId),
    listMembers(),
    listActiveSchedules(),
    listEvents(member.groupNos),
  ]);
  const scopedMembers = members.filter((candidate) =>
    candidate.groupNos.some((groupNo) => member.groupNos.includes(groupNo)),
  );
  const scopedMemberIds = new Set(scopedMembers.map((candidate) => candidate.id));

  const registered = new Set(
    schedules
      .filter((schedule) => schedule.status === "parsed" && scopedMemberIds.has(schedule.memberId))
      .map((schedule) => schedule.memberId),
  );

  const timetable: TimetableState =
    !mine ? "none" : mine.status;

  const greeting = (
    <>
      안녕하세요!
      <br />
      {me.displayName} 님
    </>
  );

  const responses = await listResponsesForEvents(events.map((e) => e.id));
  const names = new Map(scopedMembers.map((candidate) => [candidate.id, candidate.displayName]));
  const today = todayKst();

  // 확정된 연습 중 아직 지나지 않은 것만, 가까운 날짜부터.
  const upcoming: UpcomingItem[] = events
    .filter(
      (e) =>
        e.status === "confirmed" &&
        e.confirmedDate !== null &&
        e.confirmedStartMin !== null &&
        e.confirmedDate >= today,
    )
    .sort((a, b) => (a.confirmedDate ?? "").localeCompare(b.confirmedDate ?? ""))
    .map((e) => {
      const eventMembers = scopedMembers.filter((candidate) =>
        e.groupNo !== null && candidate.groupNos.includes(e.groupNo),
      );
      const eventMemberIds = new Set(eventMembers.map((candidate) => candidate.id));
      // 확정된 시각에 '가능' 이라고 답한 사람을 참석자로 본다.
      const key = slotKeyOf({ date: e.confirmedDate!, startMin: e.confirmedStartMin! });
      const forSlot = responses.filter(
        (r) => r.eventId === e.id && r.slotKey === key && eventMemberIds.has(r.memberId),
      );
      const going = forSlot.filter((r) => r.answer === "yes");
      const declined = forSlot.filter((r) => r.answer === "no").length;
      return {
        id: e.id,
        groupNo: e.groupNo!,
        title: e.title,
        date: e.confirmedDate!,
        startMin: e.confirmedStartMin!,
        durationMin: e.durationMin,
        place: e.place,
        goingNames: going.map((r) => names.get(r.memberId) ?? "?"),
        declined,
        noReply: Math.max(0, eventMembers.length - going.length - declined),
        memberCount: eventMembers.length,
      };
    });

  const pollingViews = await Promise.all(
    events.filter((event) => event.status === "polling").map(buildEventView),
  );
  const polling: PollingItem[] = pollingViews.map((view) => {
    const event = view.event;
    return {
      id: event.id,
      groupNo: event.groupNo!,
      title: event.title,
      dateCount: event.dates.length,
      answered: view.respondedIds.includes(me.memberId),
      respondedCount: view.respondedIds.length,
      memberCount: view.members.length,
      allResponded: view.members.length > 0 && view.respondedIds.length === view.members.length,
      canConfirm: event.createdBy === me.memberId || me.role === "admin",
    };
  });

  const groupLabel =
    member.groupRole === "mentor"
      ? `${member.groupNos.map((groupNo) => `${groupNo}조`).join(" · ")} 멘토`
      : `${member.groupNos[0]}조`;

  return (
    <AppShell title={greeting} subtitle={`${groupLabel} · ${homeSubtitle(upcoming, polling)}`}>
      <HomeDashboard
        timetable={timetable}
        upcoming={upcoming}
        polling={polling}
        missingCount={scopedMembers.length - registered.size}
      />
    </AppShell>
  );
}
